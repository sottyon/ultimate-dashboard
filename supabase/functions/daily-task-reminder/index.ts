// Ultimate Dashboard · daily-task-reminder Edge Function
// Runs every 15 minutes (pg_cron). At 8 a.m. in each opted-in user's time zone it texts one
// morning summary: today's Google Calendar events, to-do tasks due today (plus overdue ones),
// and habit check-ins with this week's progress.
//
// Secrets: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER, and the Google OAuth client
// secret the google-calendar function already uses (GOOGLE_CLIENT_SECRET or one of its aliases).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type Reminder = {
  user_id: string;
  phone_number: string;
  time_zone: string;
  last_sent_on: string | null;
};

type DashboardRecord = {
  type?: string;
  title?: string;
  category?: string;
  completed?: boolean;
  created_at?: string;
  due_date?: string;
  due_time?: string;
  habit_name?: string;
  habit_icon?: string;
  habit_goal?: number | string;
  weeks?: Record<string, Record<string, boolean>>;
};

type CalendarEvent = {
  summary?: string;
  status?: string;
  start?: { date?: string; dateTime?: string };
  attendees?: { self?: boolean; responseStatus?: string }[];
};

const GOOGLE_SECRET_NAMES = [
  'GOOGLE_CLIENT_SECRET', 'GOOGLE_OAUTH_CLIENT_SECRET', 'GOOGLE_CALENDAR_CLIENT_SECRET',
  'GOOGLE_SECRET', 'OAUTH_CLIENT_SECRET', 'CLIENT_SECRET', 'AUTH_CLIENT_SECRET'
];
const DEFAULT_GOOGLE_CLIENT_ID = '389274919931-jgnkut71mqrc1jbj18ug0otm3gq082dv.apps.googleusercontent.com';
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MAX_EVENTS = 10;
const MAX_TASKS = 15;

function localParts(timeZone: string, date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  const v = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return {
    date: `${v.year}-${v.month}-${v.day}`,
    hour: v.hour,
    // minutes this time zone is ahead of UTC at this instant
    offsetMinutes: Math.round(
      (Date.UTC(+v.year, +v.month - 1, +v.day, +v.hour, +v.minute, +v.second) - Math.floor(date.getTime() / 1000) * 1000) / 60000
    )
  };
}

// UTC instant of local midnight at the start of `date` (YYYY-MM-DD) in `timeZone`
function localMidnight(date: string, timeZone: string) {
  const [y, m, d] = date.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d);
  const offset = localParts(timeZone, new Date(guess)).offsetMinutes;
  return new Date(guess - offset * 60000);
}

function addDays(date: string, days: number) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function mondayOf(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return addDays(date, -((dow + 6) % 7));
}

function prettyDate(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' })
    .format(new Date(Date.UTC(y, m - 1, d)));
}

function clockTime(hhmm: string) {
  const [h, min] = hhmm.split(':').map(Number);
  if (Number.isNaN(h)) return hhmm;
  return `${h % 12 || 12}${min ? ':' + String(min).padStart(2, '0') : ''} ${h < 12 ? 'AM' : 'PM'}`;
}

async function loadCalendar(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  today: string,
  timeZone: string
): Promise<string[] | null> {
  const secretName = GOOGLE_SECRET_NAMES.find(name => (Deno.env.get(name) || '').trim());
  if (!secretName) return null;
  const { data: row } = await supabase.from('google_calendar_tokens').select('refresh_token').eq('user_id', userId).maybeSingle();
  if (!row?.refresh_token) return null;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: (Deno.env.get('GOOGLE_CLIENT_ID') || DEFAULT_GOOGLE_CLIENT_ID).trim(),
      client_secret: Deno.env.get(secretName)!.trim(),
      refresh_token: row.refresh_token,
      grant_type: 'refresh_token'
    })
  });
  const token = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !token.access_token) {
    console.error(`Could not refresh Google Calendar access for ${userId}:`, token.error || tokenRes.status);
    return null;
  }

  const params = new URLSearchParams({
    timeMin: localMidnight(today, timeZone).toISOString(),
    timeMax: localMidnight(addDays(today, 1), timeZone).toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    timeZone,
    maxResults: '50'
  });
  const eventsRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${token.access_token}` }
  });
  const events = await eventsRes.json().catch(() => ({}));
  if (!eventsRes.ok) {
    console.error(`Could not load Google Calendar events for ${userId}:`, eventsRes.status, events?.error?.message);
    return null;
  }

  const timeFormat = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' });
  const items = ((events.items || []) as CalendarEvent[])
    .filter(e => e.status !== 'cancelled')
    .filter(e => !e.attendees?.some(a => a.self && a.responseStatus === 'declined'));
  const lines = items.slice(0, MAX_EVENTS).map(e => {
    const title = (e.summary || 'Busy').trim();
    if (e.start?.date) return `🗓️ All day: ${title}`;
    return `🕘 ${timeFormat.format(new Date(e.start!.dateTime!)).replace(':00', '')} ${title}`;
  });
  if (items.length > lines.length) lines.push(`…and ${items.length - lines.length} more`);
  return lines;
}

function taskLines(records: DashboardRecord[], today: string) {
  const open = records.filter(r => r.type === 'task' && r.completed !== true && r.due_date && r.due_date <= today);
  open.sort((a, b) =>
    String(a.due_date).localeCompare(String(b.due_date)) ||
    (a.due_time || '99:99').localeCompare(b.due_time || '99:99') ||
    String(a.created_at || '').localeCompare(String(b.created_at || ''))
  );
  const lines = open.slice(0, MAX_TASKS).map(t => {
    const icon = t.category === 'Work' ? '💼' : '🏠';
    const title = t.title || 'Untitled task';
    if (t.due_date! < today) return `⚠️ ${title} (overdue)`;
    return `${icon} ${title}${t.due_time ? ` (${clockTime(t.due_time)})` : ''}`;
  });
  if (open.length > lines.length) lines.push(`…and ${open.length - lines.length} more`);
  return lines;
}

function habitLines(records: DashboardRecord[], today: string) {
  const week = mondayOf(today);
  return records
    .filter(r => typeof r.habit_name === 'string' && r.habit_name.trim())
    .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')))
    .map(h => {
      const done = Object.entries(h.weeks?.[week] || {})
        .filter(([day, on]) => on && DAY_KEYS.includes(day)).length;
      const goal = Number(h.habit_goal) || 7;
      return `${h.habit_icon || '🌱'} ${h.habit_name!.trim()} · ${done}/${goal} this week${done >= goal ? ' ✅' : ''}`;
    });
}

function buildMessage(today: string, events: string[] | null, tasks: string[], habits: string[]) {
  const sections = [`Ultimate Dashboard: Good morning! Here's your ${prettyDate(today)}:`];
  if (events === null) sections.push('📅 CALENDAR\nCouldn\'t load your calendar today. Reconnect it in your dashboard.');
  else sections.push(`📅 CALENDAR\n${events.length ? events.join('\n') : 'No events today 🎉'}`);
  sections.push(`✅ TO-DO\n${tasks.length ? tasks.join('\n') : 'Nothing due today 🙌'}`);
  if (habits.length) sections.push(`🌱 HABITS\n${habits.join('\n')}`);
  sections.push('Manage reminders in your dashboard. Reply STOP to opt out.');
  return sections.join('\n\n');
}

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER');

  if (!supabaseUrl || !serviceRoleKey || !accountSid || !authToken || !fromNumber) {
    console.error('Daily task reminder is missing required Supabase or Twilio secrets.');
    return Response.json({ error: 'Reminder service is not configured.' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: reminders, error: reminderError } = await supabase
    .from('dashboard_task_reminders')
    .select('user_id, phone_number, time_zone, last_sent_on')
    .eq('enabled', true)
    .not('consented_at', 'is', null);

  if (reminderError) {
    console.error('Could not load task reminder settings:', reminderError.message);
    return Response.json({ error: 'Could not load reminder settings.' }, { status: 500 });
  }

  const sent: string[] = [];
  const failed: string[] = [];
  for (const reminder of reminders as Reminder[]) {
    let local: ReturnType<typeof localParts>;
    try {
      local = localParts(reminder.time_zone);
    } catch (error) {
      console.error(`Invalid time zone for reminder ${reminder.user_id}:`, error);
      continue;
    }

    if (local.hour !== '08' || reminder.last_sent_on === local.date) continue;

    const { data: rows, error: recordsError } = await supabase
      .from('dashboard_records')
      .select('record')
      .eq('user_id', reminder.user_id);

    if (recordsError) {
      console.error(`Could not load dashboard data for reminder ${reminder.user_id}:`, recordsError.message);
      failed.push(reminder.user_id);
      continue;
    }

    const records = (rows as { record: DashboardRecord }[]).map(row => row.record || {});
    let events: string[] | null = null;
    try {
      events = await loadCalendar(supabase, reminder.user_id, local.date, reminder.time_zone);
    } catch (error) {
      console.error(`Calendar lookup failed for ${reminder.user_id}:`, error);
    }
    const body = buildMessage(local.date, events, taskLines(records, local.date), habitLines(records, local.date));

    const smsResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ To: reminder.phone_number, From: fromNumber, Body: body.slice(0, 1600) })
    });
    if (!smsResponse.ok) {
      const responseText = await smsResponse.text();
      let errorCode: number | undefined;
      try {
        errorCode = JSON.parse(responseText).code;
      } catch {
        // Keep the original Twilio response for the failure log below.
      }
      if (errorCode === 21610) {
        const { error: optOutError } = await supabase
          .from('dashboard_task_reminders')
          .update({ enabled: false })
          .eq('user_id', reminder.user_id);
        if (optOutError) console.error(`Could not save an SMS opt-out for ${reminder.user_id}:`, optOutError.message);
        continue;
      }
      console.error(`Twilio rejected task reminder for ${reminder.user_id}:`, smsResponse.status, responseText);
      failed.push(reminder.user_id);
      continue;
    }

    const { error: updateError } = await supabase
      .from('dashboard_task_reminders')
      .update({ last_sent_on: local.date })
      .eq('user_id', reminder.user_id);
    if (updateError) {
      console.error(`Text sent, but reminder date could not be recorded for ${reminder.user_id}:`, updateError.message);
    }
    sent.push(reminder.user_id);
  }

  return Response.json({ sent: sent.length, failed: failed.length }, { status: failed.length ? 207 : 200 });
});
