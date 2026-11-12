/* Ultimate Dashboard · Google Calendar
   Stays connected across sessions. The first time you click Connect, the page goes
   to Google, you approve, and Google sends you back here. The google-calendar Edge
   Function in your Supabase project keeps the long-lived refresh token (never this
   page or the browser), and gives the dashboard a fresh short-lived access token
   whenever it needs one, behind your dashboard sign-in.
   Pages use: isConfigured, isConnected, subscribe, connect, disconnect,
   listEvents, occursOnDate, createEvent, updateEvent, deleteEvent, notice. */
(() => {
  const config = window.SUPABASE_CONFIG || {};
  const apiBase = "https://www.googleapis.com/calendar/v3";
  const scope = "https://www.googleapis.com/auth/calendar.events";
  const FN = "google-calendar";
  const STATE_KEY = "ultimate-gcal-state";
  const RETURN_KEY = "ultimate-gcal-return";
  const listeners = new Set();
  let accessToken = "";
  let tokenExpiresAt = 0;
  let serverConnected = null;   // null = not checked yet, true = refresh token saved, false = not connected
  let tokenRequest = null;
  let notice = "";

  // always the folder address (…/ultimate-dashboard/), even if the page was opened as …/index.html
  const redirectUri = () => `${location.origin}${location.pathname.replace(/index\.html$/, "")}`;
  function notify(change) { for (const listener of listeners) listener(change); }
  function setNotice(text) { notice = text || ""; notify("notice"); }

  async function sdkReady() {
    let tries = 0;
    while (!window.dataSdk?.callFunction && tries < 80) { await new Promise(r => setTimeout(r, 250)); tries++; }
    if (!window.dataSdk?.callFunction) throw new Error("The dashboard's data connection did not load.");
    const session = await window.dataSdk.getSession();
    if (!session.isOk || !session.session) throw Object.assign(new Error("Sign in to the dashboard first."), { code: "not_signed_in" });
  }
  function useToken(data) {
    accessToken = data.access_token;
    tokenExpiresAt = Date.now() + (Number(data.expires_in) || 3600) * 1000 - 60000;
  }

  // a fresh access token from the stored refresh token (one request at a time)
  function fetchServerToken() {
    if (tokenRequest) return tokenRequest;
    tokenRequest = (async () => {
      try {
        await sdkReady();
        const data = await window.dataSdk.callFunction(FN, { action: "token" });
        useToken(data);
        const wasConnected = serverConnected;
        serverConnected = true;
        if (wasConnected !== true) notify("connected");
      } catch (error) {
        if (error.code === "not_connected" || error.code === "reconnect") {
          serverConnected = false; accessToken = ""; tokenExpiresAt = 0;
          if (error.code === "reconnect") setNotice("Google Calendar access expired or was removed. Click Connect Google Calendar to reconnect.");
          notify("disconnected");
        }
        throw error;
      } finally {
        tokenRequest = null;
      }
    })();
    return tokenRequest;
  }

  async function getToken() {
    if (accessToken && Date.now() < tokenExpiresAt) return accessToken;
    if (serverConnected === false) throw new Error("Google Calendar is not connected. Click Connect Google Calendar.");
    await fetchServerToken();
    return accessToken;
  }

  async function api(path, options = {}, retried = false) {
    const token = await getToken();
    const response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers
      }
    });
    if (response.status === 401 && !retried) {   // token revoked or expired early: get a new one once
      accessToken = ""; tokenExpiresAt = 0;
      return api(path, options, true);
    }
    if (!response.ok) {
      let message = `Google Calendar request failed (${response.status}).`;
      try {
        const body = await response.json();
        message = body.error?.message || message;
      } catch {}
      throw new Error(message);
    }
    if (response.status === 204) return null;
    return response.json();
  }

  function eventPath(eventId = "") {
    const base = "/calendars/primary/events";
    return eventId ? `${base}/${encodeURIComponent(eventId)}` : base;
  }

  // ----- first-time connect: full-page sign-in with Google, then back here -----
  function startGoogleSignIn() {
    const clientId = config.googleClientId?.trim();
    if (!clientId) throw new Error("Add your Google OAuth client ID to supabase-config.js first.");
    const state = crypto.randomUUID();
    sessionStorage.setItem(STATE_KEY, state);
    sessionStorage.setItem(RETURN_KEY, location.hash || "");
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri(),
      response_type: "code",
      scope,
      access_type: "offline",          // ask for a refresh token
      prompt: "consent",               // Google only issues one on the consent screen
      include_granted_scopes: "true",
      state
    });
    location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
    return new Promise(() => {});      // the page is navigating away
  }

  async function finishGoogleSignIn() {
    const url = new URL(location.href);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");
    const state = url.searchParams.get("state");
    if (!code && !error) return false;
    const expected = sessionStorage.getItem(STATE_KEY);
    const returnHash = sessionStorage.getItem(RETURN_KEY) || "";
    sessionStorage.removeItem(STATE_KEY); sessionStorage.removeItem(RETURN_KEY);
    // tidy the address bar (drop ?code=…) and go back to where Connect was clicked
    history.replaceState(null, "", `${location.pathname}${returnHash}`);
    if (returnHash) setTimeout(() => document.querySelector(returnHash)?.scrollIntoView({ block: "start" }), 600);
    if (!state || state !== expected) { setNotice("That Google sign-in didn't come from this page, so it was ignored. Click Connect Google Calendar again."); return true; }
    if (error) { setNotice(error === "access_denied" ? "Google Calendar wasn't connected: access was not allowed." : `Google sign-in failed: ${error}.`); return true; }
    try {
      await sdkReady();
      const data = await window.dataSdk.callFunction(FN, { action: "exchange", code, redirect_uri: redirectUri() });
      useToken(data);
      serverConnected = !!data.persistent;
      setNotice(data.persistent ? "" :
        "Connected for now, but Google didn't send a long-lived key, so you'd have to reconnect next time. To fix it: open myaccount.google.com/connections, remove Ultimate Dashboard, then click Connect Google Calendar again.");
      notify("connected");
    } catch (err) {
      setNotice(`Google Calendar could not be connected: ${err.message || err}`);
    }
    return true;
  }

  window.googleCalendar = {
    isConfigured() {
      return Boolean(config.googleClientId?.trim());
    },
    isConnected() {
      return Boolean(accessToken && Date.now() < tokenExpiresAt) || serverConnected === true;
    },
    notice() { return notice; },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async connect() {
      if (accessToken && Date.now() < tokenExpiresAt) return;
      if (serverConnected !== false) {
        try { await fetchServerToken(); return; }
        catch (error) {
          if (error.code !== "not_connected" && error.code !== "reconnect") throw error;
        }
      }
      setNotice("");
      return startGoogleSignIn();
    },
    async disconnect() {
      try { await sdkReady(); await window.dataSdk.callFunction(FN, { action: "disconnect" }); }
      finally {
        accessToken = ""; tokenExpiresAt = 0; serverConnected = false;
        notify("disconnected");
      }
    },
    async listEvents(timeMin, timeMax) {
      const events = [];
      let pageToken = "";
      do {
        const params = new URLSearchParams({
          singleEvents: "true",
          orderBy: "startTime",
          timeMin,
          timeMax,
          maxResults: "2500"
        });
        if (pageToken) params.set("pageToken", pageToken);
        const result = await api(`${eventPath()}?${params}`);
        events.push(...(result.items || []));
        pageToken = result.nextPageToken || "";
      } while (pageToken);
      return events;
    },
    occursOnDate(event, date) {
      const dayStart = new Date(`${date}T00:00:00`);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const start = event.start?.date
        ? new Date(`${event.start.date}T00:00:00`)
        : new Date(event.start?.dateTime);
      const end = event.end?.date
        ? new Date(`${event.end.date}T00:00:00`)
        : new Date(event.end?.dateTime);
      return start < dayEnd && end > dayStart;
    },
    async createEvent(event) {
      const result = await api(eventPath(), { method: "POST", body: JSON.stringify(event) });
      notify("changed");
      return result;
    },
    async updateEvent(eventId, event) {
      const result = await api(eventPath(eventId), { method: "PATCH", body: JSON.stringify(event) });
      notify("changed");
      return result;
    },
    async deleteEvent(eventId) {
      await api(eventPath(eventId), { method: "DELETE" });
      notify("changed");
    }
  };

  // on every visit: finish a sign-in that just came back from Google, or quietly
  // reconnect with the saved refresh token. Nothing pops up.
  (async () => {
    if (!window.googleCalendar.isConfigured()) return;
    try {
      const handled = await finishGoogleSignIn();
      if (!handled) await fetchServerToken();
    } catch (error) {
      if (serverConnected === null) serverConnected = false;
    }
  })();
})();
