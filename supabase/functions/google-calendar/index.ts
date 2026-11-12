// Ultimate Dashboard · google-calendar Edge Function
// Keeps Google Calendar connected across sessions.
//
//   POST { action: "exchange", code, redirect_uri }  first connect: swaps Google's one-time code for a
//                                      refresh token (stored server-side) and returns an access token
//   POST { action: "token" }           returns a fresh access token from the stored refresh token
//   POST { action: "disconnect" }      revokes the refresh token at Google and deletes it
//   POST { action: "health" }          (no sign-in needed) says whether the function is configured
//
// Every action except health needs the dashboard's signed-in, password-authenticated session.
// Refresh tokens live in public.google_calendar_tokens, which only this function (service role) can read.
// Secrets (Supabase → Edge Functions → Secrets): the OAuth client secret under one of SECRET_NAMES;
// GOOGLE_CLIENT_ID is optional (defaults to the dashboard's public client ID).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SECRET_NAMES = [
  'GOOGLE_CLIENT_SECRET', 'GOOGLE_OAUTH_CLIENT_SECRET', 'GOOGLE_CALENDAR_CLIENT_SECRET',
  'GOOGLE_SECRET', 'OAUTH_CLIENT_SECRET', 'CLIENT_SECRET', 'AUTH_CLIENT_SECRET'
];
const DEFAULT_CLIENT_ID = '389274919931-jgnkut71mqrc1jbj18ug0otm3gq082dv.apps.googleusercontent.com';
const ALLOWED_ORIGINS = ['https://sottyon.github.io', 'http://localhost:8000', 'http://127.0.0.1:8000'];
const SCOPE = 'https://www.googleapis.com/auth/calendar.events';
// pages Google may send the sign-in back to (must also be listed in Google Cloud → Clients → Authorized redirect URIs)
const ALLOWED_REDIRECTS = ['https://sottyon.github.io/ultimate-dashboard/', 'http://localhost:8000/', 'http://127.0.0.1:8000/'];

const secretName = SECRET_NAMES.find(name => (Deno.env.get(name) || '').trim());
const clientSecret = secretName ? Deno.env.get(secretName)!.trim() : '';
const clientId = (Deno.env.get('GOOGLE_CLIENT_ID') || DEFAULT_CLIENT_ID).trim();

function cors(req: Request) {
  const origin = req.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  };
}
function reply(req: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } });
}
function jwtClaims(jwt: string) {
  try {
    const part = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(part + '='.repeat((4 - part.length % 4) % 4)));
  } catch { return {}; }
}
async function google(params: Record<string, string>) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, ...params })
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== 'POST') return reply(req, 405, { error: 'method_not_allowed' });

  let body: Record<string, string> = {};
  try { body = await req.json(); } catch { /* empty body */ }
  const action = body.action;

  if (action === 'health') return reply(req, 200, { configured: Boolean(clientSecret), secret_name: secretName || null });
  if (!clientSecret) {
    return reply(req, 500, { error: 'not_configured', message: `Add the Google OAuth client secret as an Edge Function secret named ${SECRET_NAMES[0]}.` });
  }

  // signed-in dashboard user, with a password session (same rule as the dashboard's data)
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: userData, error: userError } = jwt ? await admin.auth.getUser(jwt) : { data: { user: null }, error: null };
  const user = userData?.user;
  const amr = jwtClaims(jwt).amr;
  const passwordSession = Array.isArray(amr) && amr.some((entry: { method?: string }) => entry?.method === 'password');
  if (userError || !user || !passwordSession) return reply(req, 401, { error: 'not_signed_in' });

  const table = admin.from('google_calendar_tokens');

  if (action === 'exchange') {
    if (!body.code) return reply(req, 400, { error: 'missing_code' });
    const redirectUri = body.redirect_uri || 'postmessage';
    if (redirectUri !== 'postmessage' && !ALLOWED_REDIRECTS.includes(redirectUri)) return reply(req, 400, { error: 'bad_redirect' });
    const { ok, data } = await google({ code: body.code, grant_type: 'authorization_code', redirect_uri: redirectUri });
    if (!ok) return reply(req, 400, { error: data.error || 'exchange_failed', message: data.error_description || 'Google did not accept the sign-in.' });
    const granted = String(data.scope || '');
    if (!granted.split(' ').includes(SCOPE)) {
      return reply(req, 400, { error: 'scope_missing', message: 'Calendar access was not granted. Connect again and allow access to your calendar.' });
    }
    let persistent = false;
    if (data.refresh_token) {
      const { error } = await table.upsert({ user_id: user.id, refresh_token: data.refresh_token, scope: granted, updated_at: new Date().toISOString() });
      if (error) return reply(req, 500, { error: 'store_failed', message: error.message });
      persistent = true;
    } else {
      const { data: existing } = await table.select('user_id').eq('user_id', user.id).maybeSingle();
      persistent = Boolean(existing);
    }
    return reply(req, 200, { access_token: data.access_token, expires_in: data.expires_in, persistent });
  }

  if (action === 'token') {
    const { data: row, error } = await table.select('refresh_token').eq('user_id', user.id).maybeSingle();
    if (error) return reply(req, 500, { error: 'read_failed', message: error.message });
    if (!row) return reply(req, 404, { error: 'not_connected' });
    const { ok, data } = await google({ refresh_token: row.refresh_token, grant_type: 'refresh_token' });
    if (!ok) {
      if (data.error === 'invalid_grant') {
        await table.delete().eq('user_id', user.id);
        return reply(req, 401, { error: 'reconnect', message: 'Google Calendar access expired or was removed. Connect again.' });
      }
      return reply(req, 502, { error: data.error || 'refresh_failed', message: data.error_description || 'Google did not return a new access token.' });
    }
    return reply(req, 200, { access_token: data.access_token, expires_in: data.expires_in });
  }

  if (action === 'disconnect') {
    const { data: row } = await table.select('refresh_token').eq('user_id', user.id).maybeSingle();
    if (row?.refresh_token) {
      await fetch('https://oauth2.googleapis.com/revoke', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: row.refresh_token })
      }).catch(() => {});
    }
    await table.delete().eq('user_id', user.id);
    return reply(req, 200, { disconnected: true });
  }

  return reply(req, 400, { error: 'unknown_action' });
});
