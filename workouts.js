/* Ultimate Dashboard · Workout Tracker (page 2)
   Pick what you did each day. One Supabase dashboard record per day:
     { type: 'workout_log', date: 'YYYY-MM-DD', workouts: ['legs', 'core'], created_at, updated_at }
   "Rest day" is exclusive: choosing it clears the day's workouts, and choosing a
   workout clears Rest day. Also fills the Workouts card on the Dashboard. */
(() => {
  const WORKOUTS = [
    { key: 'back_biceps',      label: 'Back / Biceps',    icon: '💪' },
    { key: 'glutes',           label: 'Glutes',           icon: '🍑' },
    { key: 'legs',             label: 'Legs',             icon: '🦵' },
    { key: 'hot_pilates',      label: 'Hot Pilates',      icon: '🔥' },
    { key: 'reformer_pilates', label: 'Reformer Pilates', icon: '🤸' },
    { key: 'hot_yoga',         label: 'Hot Yoga',         icon: '🧘' },
    { key: 'cycle',            label: 'Cycle',            icon: '🚴' },
    { key: 'stair_master',     label: 'Stair Master',     icon: '🪜' },
    { key: 'core',             label: 'Core',             icon: '🎯' },
    { key: 'rest',             label: 'Rest day',         icon: '😴' }
  ];
  const BY_KEY = Object.fromEntries(WORKOUTS.map(w => [w.key, w]));
  const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const mondayOf = d => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return x; };
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let ready = false;
  let weekStart = mondayOf(new Date());
  const logs = new Map();       // date -> { rec, workouts }
  const dirty = new Map();      // date -> workouts waiting to save
  const saving = new Set();     // dates with a write in flight
  const timers = new Map();
  let statusText = '';

  function fromRecords(records) {
    const byDate = new Map();
    for (const r of records) {
      if (r.type !== 'workout_log' || !r.date) continue;
      const cur = byDate.get(r.date);
      if (!cur || String(r.updated_at || '') > String(cur.updated_at || '')) byDate.set(r.date, r);
    }
    for (const [date, rec] of byDate) {
      if (dirty.has(date) || saving.has(date)) { const l = logs.get(date); if (l) l.rec = rec; else logs.set(date, { rec, workouts: dirty.get(date) || [] }); continue; }
      logs.set(date, { rec, workouts: Array.isArray(rec.workouts) ? rec.workouts.filter(k => BY_KEY[k]) : [] });
    }
    for (const date of [...logs.keys()]) if (!byDate.has(date) && !dirty.has(date) && !saving.has(date) && logs.get(date).rec) logs.delete(date);
  }
  const workoutsOn = date => logs.get(date)?.workouts || [];

  function toggle(date, key) {
    let list = [...workoutsOn(date)];
    if (list.includes(key)) list = list.filter(k => k !== key);
    else if (key === 'rest') list = ['rest'];
    else list = list.filter(k => k !== 'rest').concat(key);
    list.sort((a, b) => WORKOUTS.findIndex(w => w.key === a) - WORKOUTS.findIndex(w => w.key === b));
    const entry = logs.get(date) || { rec: null, workouts: [] };
    entry.workouts = list; logs.set(date, entry);
    dirty.set(date, list);
    clearTimeout(timers.get(date));
    timers.set(date, setTimeout(() => save(date), 350));
    render();
  }

  async function save(date) {
    if (!dirty.has(date)) return;
    if (!ready) { setStatus('Sign in to save your workouts.'); return; }
    if (saving.has(date)) { timers.set(date, setTimeout(() => save(date), 400)); return; }
    const workouts = dirty.get(date); dirty.delete(date); saving.add(date);
    const entry = logs.get(date), now = new Date().toISOString();
    try {
      const result = entry?.rec
        ? await window.dataSdk.update({ ...entry.rec, workouts, updated_at: now })
        : await window.dataSdk.create({ type: 'workout_log', date, workouts, created_at: now, updated_at: now });
      if (!result?.isOk) throw result?.error || new Error('Save failed');
      setStatus(result.queued ? 'Saved on this device; waiting to sync.' : 'Saved.');
    } catch (error) {
      if (!dirty.has(date)) dirty.set(date, workouts);
      setStatus(`Couldn't save: ${error.message || error}. Trying again…`);
      timers.set(date, setTimeout(() => save(date), 4000));
    } finally {
      saving.delete(date);
    }
  }
  function setStatus(text) { statusText = text; const el = document.getElementById('workout-status'); if (el) el.textContent = text; }

  function weekStats(start) {
    const counts = {}; let sessions = 0, active = 0, rest = 0;
    for (let i = 0; i < 7; i++) {
      const list = workoutsOn(iso(addDays(start, i)));
      if (list.includes('rest')) rest++;
      const moves = list.filter(k => k !== 'rest');
      if (moves.length) active++;
      sessions += moves.length;
      moves.forEach(k => counts[k] = (counts[k] || 0) + 1);
    }
    return { counts, sessions, active, rest };
  }

  function render() {
    const app = document.getElementById('workout-app');
    if (!app) return;
    const today = iso(new Date());
    const end = addDays(weekStart, 6);
    const isThisWeek = iso(weekStart) === iso(mondayOf(new Date()));
    const range = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    const st = weekStats(weekStart);
    const top = Object.entries(st.counts).sort((a, b) => b[1] - a[1]);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = iso(addDays(weekStart, i)), list = workoutsOn(date);
      const moves = list.filter(k => k !== 'rest');
      const summary = list.includes('rest') ? 'Rest day' : moves.length ? `${moves.length} workout${moves.length === 1 ? '' : 's'}` : 'Nothing logged';
      days.push(`
        <article class="wo-day ${date === today ? 'is-today' : ''} ${list.includes('rest') ? 'is-rest' : ''}" data-date="${date}">
          <header class="wo-day-head">
            <div><h3>${DAY_NAMES[i]}</h3><p>${parse(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${date === today ? ' · Today' : ''}</p></div>
            <span class="wo-day-sum">${summary}</span>
          </header>
          <div class="wo-chips" role="group" aria-label="Workouts on ${DAY_NAMES[i]}">
            ${WORKOUTS.map(w => {
              const on = list.includes(w.key);
              return `<button type="button" class="wo-chip ${on ? 'on' : ''} ${w.key === 'rest' ? 'rest' : ''}" data-date="${date}" data-key="${w.key}" aria-pressed="${on}"><span aria-hidden="true">${w.icon}</span>${esc(w.label)}</button>`;
            }).join('')}
          </div>
        </article>`);
    }
    app.innerHTML = `
      <div class="wo-toolbar">
        <div class="wo-nav">
          <button type="button" class="canva-button secondary small-btn" data-wo-nav="-7" aria-label="Previous week">‹ Previous</button>
          <button type="button" class="canva-button secondary small-btn" data-wo-nav="0" ${isThisWeek ? 'disabled' : ''}>This week</button>
          <button type="button" class="canva-button secondary small-btn" data-wo-nav="7" aria-label="Next week">Next ›</button>
        </div>
        <h2 class="wo-range">${range}</h2>
      </div>
      <section class="wo-stats" aria-label="This week">
        <div class="wo-stat pink"><b>${st.sessions}</b><span>workout${st.sessions === 1 ? '' : 's'}</span></div>
        <div class="wo-stat"><b>${st.active}<small>/7</small></b><span>active days</span></div>
        <div class="wo-stat aqua"><b>${st.rest}</b><span>rest day${st.rest === 1 ? '' : 's'}</span></div>
        <div class="wo-stat wide"><span class="wo-top-label">This week's mix</span>${top.length ? `<div class="wo-mix">${top.map(([k, n]) => `<span class="wo-tag">${BY_KEY[k].icon} ${esc(BY_KEY[k].label)} ×${n}</span>`).join('')}</div>` : '<span class="wo-empty">Nothing logged yet.</span>'}</div>
      </section>
      <div class="wo-week">${days.join('')}</div>
      <p id="workout-status" class="wo-status" role="status" aria-live="polite">${esc(statusText)}</p>`;
    paintOverview();
  }

  function paintOverview() {
    const main = document.getElementById('overview-workouts');
    const detail = document.getElementById('overview-workouts-detail');
    if (!main) return;
    const st = weekStats(mondayOf(new Date()));
    main.textContent = `${st.sessions} workout${st.sessions === 1 ? '' : 's'} this week`;
    detail.textContent = `${st.active} active day${st.active === 1 ? '' : 's'} · ${st.rest} rest day${st.rest === 1 ? '' : 's'}`;
  }

  document.addEventListener('click', e => {
    const chip = e.target.closest('#workout-app .wo-chip');
    if (chip) { toggle(chip.dataset.date, chip.dataset.key); return; }
    const nav = e.target.closest('#workout-app [data-wo-nav]');
    if (nav) {
      const step = Number(nav.dataset.woNav);
      weekStart = step === 0 ? mondayOf(new Date()) : addDays(weekStart, step);
      render();
    }
  });
  window.addEventListener('pagehide', () => { for (const date of dirty.keys()) { clearTimeout(timers.get(date)); save(date); } });

  window.ultimateWorkouts = { workouts: WORKOUTS, forDate: date => workoutsOn(date).map(k => BY_KEY[k]) };

  async function connect() {
    let tries = 0;
    while (!window.dataSdk && tries < 40) { await new Promise(r => setTimeout(r, 250)); tries++; }
    if (!window.dataSdk) { setStatus('Could not load your data connection.'); return; }
    const session = await window.dataSdk.getSession();
    if (!session.isOk || !session.session) { setStatus('Sign in to load and save your workouts.'); return; }
    const out = await window.dataSdk.init({ onDataChanged(records) { fromRecords(records); render(); } });
    ready = !!out.isOk;
    if (!ready) setStatus('Workouts could not connect to your database.');
    for (const date of dirty.keys()) save(date);
  }
  function start() { render(); connect().catch(error => setStatus(error.message || String(error))); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  // keep "today" right if the dashboard stays open past midnight
  let lastDay = iso(new Date());
  setInterval(() => { if (iso(new Date()) !== lastDay) { lastDay = iso(new Date()); render(); } }, 60000);
})();
