/* Ultimate Dashboard · home page (Liquid Glass layout)
   Fills the Dashboard cards from your saved records: greeting, search, Finances
   ring, the week's "tasks finished vs. spending" wave, habit dots, task
   checklist, today's calendar and spending, notes, text-reminder state,
   workouts and books. Reads data only, except ticking a task, which saves
   completed / completed_at on that task, as the Tasks tab does. */
(() => {
  const $ = id => document.getElementById(id);
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const mondayOf = d => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return x; };
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtMoney = n => (n < -0.004 ? '−$' : '$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const WORKOUT_LABELS = { back_biceps: 'Back / Biceps', glutes: 'Glutes', legs: 'Legs', hot_pilates: 'Hot Pilates', reformer_pilates: 'Reformer Pilates', hot_yoga: 'Hot Yoga', cycle: 'Cycle', stair_master: 'Stair Master', core: 'Core', rest: 'Rest day' };
  const TABS = [
    ['Dashboard', '#page-1'], ['Tasks', '#page-8'], ['Workout Tracker', '#page-2'], ['Week in Depth', '#page-6'], ['Habit Tracker', '#page-3'],
    ['Finances', '#page-7'], ['Quarterly', '#page-4'], ['Book Tracker', '#page-5'], ['Text Reminders', './sms-reminders.html']
  ];

  let records = [];
  let ready = false;
  let events = [];
  let reminder = null;
  let pending = false;
  const busy = new Set();

  /* ---------- helpers ---------- */
  function setRing(id, fraction, label) {
    const el = $(id); if (!el) return;
    const pct = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0));
    el.querySelector('.ring-fill').setAttribute('stroke-dasharray', `${(pct * 100).toFixed(1)} 100`);
    el.querySelector('.ring-pct').textContent = label ?? `${Math.round(pct * 100)}%`;
  }
  const setText = (id, text) => { const el = $(id); if (el && el.textContent !== text) el.textContent = text; };
  const setHTML = (id, html) => { const el = $(id); if (el && el.__h !== html) { el.innerHTML = html; el.__h = html; } };
  const tasks = () => records.filter(r => r.type === 'task');
  const doneOn = (t, date) => t.completed && (t.completed_at ? iso(new Date(t.completed_at)) === date : t.due_date === date);
  const timeLabel = t => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return new Date(2000, 0, 1, h, m).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); };

  /* smooth area path through points (Catmull-Rom to Bézier) */
  function areaPath(points, w, h) {
    if (!points.length) return '';
    let d = `M ${points[0][0]} ${points[0][1]}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i], p1 = points[i], p2 = points[i + 1], p3 = points[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0]} ${p2[1].toFixed(1)}`;
    }
    return { line: d, area: `${d} L ${w} ${h} L 0 ${h} Z` };
  }

  /* ---------- cards ---------- */
  function renderHeader(today, budget) {
    const hour = new Date().getHours();
    const name = (window.SUPABASE_CONFIG?.displayName || '').trim();
    setText('home-greeting', `${hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'}${name ? ', ' + name : ''}`);
    const open = tasks().filter(t => !t.completed);
    const dueToday = open.filter(t => t.due_date === today).length;
    const parts = [new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })];
    parts.push(dueToday ? `${dueToday} task${dueToday === 1 ? '' : 's'} due` : `${open.length} open task${open.length === 1 ? '' : 's'}`);
    if (budget) parts.push(`${fmtMoney(budget.left)} left this week`);
    setText('home-subline', parts.join(' · '));
  }

  function renderFinances(budget) {
    if (!budget) {
      setRing('home-fin-ring', 0, '—'); setText('home-fin-left', '—');
      setText('home-fin-spent', 'Set up your budget'); setText('home-fin-next', 'Open Finances to start'); return;
    }
    const used = budget.total > 0 ? budget.spent / budget.total : 0;
    setRing('home-fin-ring', used);
    setText('home-fin-left', fmtMoney(budget.left));
    setText('home-fin-spent', `${fmtMoney(budget.spent)} of ${fmtMoney(budget.total)} spent`);
    const start = parse(budget.start), end = parse(budget.end);
    setText('home-fin-range', `Week of ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.getMonth() === start.getMonth() ? end.getDate() : end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
    setText('home-fin-next', budget.nextCheck ? `Next paycheck · ${parse(budget.nextCheck).toLocaleDateString('en-US', { weekday: 'short' })}` : '');
    $('home-fin-ring').classList.toggle('over', used > 1);
  }

  function renderWeek(monday, today) {
    const W = 472, H = 150;
    const days = DAY_KEYS.map((_, i) => iso(addDays(monday, i)));
    const done = days.map(d => tasks().filter(t => doneOn(t, d)).length);
    const spent = days.map(d => Math.max(0, window.ultimateBudget?.day?.(d)?.spent || 0));
    const maxDone = Math.max(1, ...done), maxSpent = Math.max(1, ...spent);
    const x = i => +(i * W / 6).toFixed(1);
    const aqua = areaPath(done.map((v, i) => [x(i), H - 12 - (v / maxDone) * (H - 40)]), W, H);
    const pink = areaPath(spent.map((v, i) => [x(i), H - 8 - (v / maxSpent) * (H - 80)]), W, H);
    const ti = days.indexOf(today);
    setHTML('home-wave', `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
      <path d="${aqua.area}" fill="url(#home-wave-aqua)"/><path d="${aqua.line}" fill="none" stroke="#a9dede" stroke-width="2"/>
      <path d="${pink.area}" fill="url(#home-wave-pink)"/><path d="${pink.line}" fill="none" stroke="#f3a3b7" stroke-width="2"/>
      ${ti >= 0 ? `<line x1="${x(ti)}" x2="${x(ti)}" y1="6" y2="${H}" stroke="#44362f" stroke-opacity=".18" stroke-dasharray="3 4"/>` : ''}
    </svg>`);
    setHTML('home-days', days.map((d, i) => `<a href="#page-6" class="${d === today ? 'is-today' : ''}" title="${DAY_SHORT[i]}: ${done[i]} task${done[i] === 1 ? '' : 's'} done · ${fmtMoney(spent[i])} spent">${DAY_SHORT[i]}</a>`).join(''));
    const totDone = done.reduce((a, b) => a + b, 0), totSpent = spent.reduce((a, b) => a + b, 0);
    setText('home-week-caption', `Tasks finished vs. spending · ${totDone} done · ${fmtMoney(totSpent)}`);
  }

  function renderHabits(monday, today) {
    const key = iso(monday);
    const habits = records.filter(r => r.habit_name).sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')));
    const todayIdx = DAY_KEYS.indexOf(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][parse(today).getDay()]);
    let checks = 0, goals = 0;
    const rows = habits.map(h => {
      const week = h.weeks?.[key] || {};
      const n = DAY_KEYS.filter(k => week[k]).length;
      const goal = Math.max(1, Math.min(7, Number(h.habit_goal) || 5));
      checks += Math.min(n, goal); goals += goal;
      return `<a href="#page-3" class="home-habit"><span class="home-habit-name">${esc(h.habit_name)}</span><span class="home-dots" aria-label="${n} of 7 days">${DAY_KEYS.map((k, i) => `<i class="${week[k] ? 'on' : ''} ${i === todayIdx ? 'today' : ''}"></i>`).join('')}</span></a>`;
    });
    setHTML('home-habit-list', rows.slice(0, 4).join('') + (rows.length > 4 ? `<a href="#page-3" class="home-more-link">+${rows.length - 4} more</a>` : '') ||
      '<a href="#page-3" class="home-empty">No habits yet. Add one →</a>');
    setRing('home-habit-ring', goals ? checks / goals : 0);
    setText('home-habits-caption', habits.length ? `This week · ${checks} of ${goals} check-ins` : 'This week');
  }

  function renderTasks(today) {
    const all = tasks();
    const doneCount = all.filter(t => t.completed).length;
    setRing('home-task-ring', all.length ? doneCount / all.length : 0);
    const todays = all.filter(t => t.due_date === today);
    setText('home-tasks-caption', todays.length
      ? `${todays.filter(t => t.completed).length} of ${todays.length} done today`
      : `${doneCount} of ${all.length} done`);
    const rank = t => (t.completed ? 3 : 0) + (t.due_date === today ? 0 : t.due_date && t.due_date < today ? 0.5 : t.due_date ? 1 : 2);
    const list = [...all].sort((a, b) => rank(a) - rank(b) || String(a.due_date || '9').localeCompare(String(b.due_date || '9')) || String(a.due_time || '99').localeCompare(String(b.due_time || '99'))).slice(0, 5);
    setHTML('home-task-list', list.length ? list.map(t => {
      const due = t.due_date ? (t.due_date === today ? 'Today' : parse(t.due_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })) + (t.due_time ? ' · ' + timeLabel(t.due_time) : '') : (t.category === 'Work' ? 'Work' : 'Personal');
      return `<label class="home-task ${t.completed ? 'done' : ''}"><input type="checkbox" class="home-task-check" data-id="${esc(t.__backendId)}" ${t.completed ? 'checked' : ''}><span class="home-task-text"><span>${esc(t.title || 'Untitled task')}</span><small>${esc(due)}</small></span></label>`;
    }).join('') : '<a href="#page-8" class="home-empty">No tasks yet. Add one →</a>');
  }

  function renderCalendar(today) {
    const box = $('home-events'); if (!box) return;
    const cal = window.googleCalendar;
    if (!cal?.isConfigured?.()) { setText('home-cal-caption', 'Google Calendar'); setHTML('home-events', '<p class="home-empty">Add a Google client ID in supabase-config.js to show today’s events.</p>'); }
    else if (!cal.isConnected()) { setText('home-cal-caption', 'Google Calendar'); setHTML('home-events', '<button type="button" class="home-btn-pill aqua" id="home-cal-connect">Connect Google Calendar</button>'); }
    else {
      const todays = events.filter(e => cal.occursOnDate(e, today)).sort((a, b) => String(a.start?.dateTime || a.start?.date).localeCompare(String(b.start?.dateTime || b.start?.date)));
      setText('home-cal-caption', `Google Calendar · ${todays.length} event${todays.length === 1 ? '' : 's'}`);
      setHTML('home-events', todays.length ? todays.slice(0, 4).map(e => {
        const t = e.start?.dateTime ? new Date(e.start.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(' ', ' ') : 'All day';
        return `<a href="#page-6" class="home-event"><span class="home-time">${esc(t)}</span><span>${esc(e.summary || 'Busy')}</span></a>`;
      }).join('') + (todays.length > 4 ? `<a href="#page-6" class="home-more-link">+${todays.length - 4} more</a>` : '') : '<p class="home-empty">Nothing on the calendar today.</p>');
    }
    const day = window.ultimateBudget?.day?.(today);
    const weekday = parse(today).toLocaleDateString('en-US', { weekday: 'long' });
    if (!day) { setText('home-spend-title', `${weekday} spending`); setHTML('home-spend-body', '<a href="#page-7" class="home-empty">Set up Finances to see spending →</a>'); return; }
    const m = day.money;
    setText('home-spend-title', `${weekday} spending · ${m(day.spent)}`);
    setHTML('home-spend-body', (day.txns.length ? `<ul>${day.txns.map(t => `<li><span>${esc(t.emoji)} ${esc(t.desc)}</span><b>${t.amount < 0 ? '+' + m(-t.amount) : m(t.amount)}</b></li>`).join('')}</ul>` : `<p class="home-empty">Nothing logged ${weekday === new Date().toLocaleDateString('en-US', { weekday: 'long' }) ? 'today' : ''}.</p>`) +
      `<button type="button" class="home-btn-pill white" data-add-spend="${today}">+ Add spending</button>`);
  }

  function renderNotes() {
    const notes = records.find(r => r.type === 'task_notes');
    const text = (notes?.content || '').trim();
    setText('home-note-text', text ? (text.length > 160 ? text.slice(0, 157) + '…' : text) : 'No notes yet. Tap to add one.');
    const on = !!(reminder && reminder.enabled && reminder.consented_at);
    const tog = $('home-sms-toggle'); if (tog) tog.classList.toggle('on', on);
    const row = $('home-sms-toggle-row'); if (row) row.setAttribute('aria-label', `Daily task texts are ${on ? 'on' : 'off'}. Manage text reminders.`);
  }

  function renderWorkouts(monday) {
    const days = DAY_KEYS.map((_, i) => iso(addDays(monday, i)));
    const logs = new Map(); records.filter(r => r.type === 'workout_log').forEach(r => { const c = logs.get(r.date); if (!c || String(r.updated_at) > String(c.updated_at)) logs.set(r.date, r); });
    const counts = {}; let active = 0;
    days.forEach(d => { const w = (logs.get(d)?.workouts || []).filter(k => k !== 'rest'); if (w.length) active++; w.forEach(k => counts[k] = (counts[k] || 0) + 1); });
    setRing('home-wo-ring', active / 7, `${active}/7`);
    const mix = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    setHTML('home-wo-mix', mix.length ? mix.map(([k, n]) => `<span class="home-chip">${esc(WORKOUT_LABELS[k] || k)} ×${n}</span>`).join('') : '<a href="#page-2" class="home-empty">Nothing logged yet this week →</a>');
  }

  function renderBooks() {
    const books = records.filter(r => r.book_title);
    const finished = books.filter(b => b.status === 'Finished').length;
    setRing('home-books-ring', books.length ? finished / books.length : 0, books.length ? `${finished}/${books.length}` : '0');
    const reading = books.filter(b => b.status === 'Reading');
    setHTML('home-books-list', (reading.length ? reading : books).slice(0, 3).map(b => `<li><a href="#page-5"><b>${esc(b.book_title)}</b><small>${esc(b.status || '')}</small></a></li>`).join('') || '<li><a href="#page-5" class="home-empty">Your shelf is empty. Add a book →</a></li>');
    setText('home-books-caption', reading.length ? `Reading ${reading.length}` : 'Your shelf');
  }

  function renderAll() {
    pending = false;
    const now = new Date(), today = iso(now), monday = mondayOf(now);
    const budget = window.ultimateBudget?.summary?.() || null;
    renderHeader(today, budget); renderFinances(budget); renderWeek(monday, today); renderHabits(monday, today);
    renderTasks(today); renderCalendar(today); renderNotes(); renderWorkouts(monday); renderBooks();
  }
  const schedule = () => { if (!pending) { pending = true; requestAnimationFrame(renderAll); } };

  /* ---------- search ---------- */
  function searchItems(q) {
    q = q.trim().toLowerCase(); if (!q) return [];
    const out = [];
    TABS.forEach(([label, href]) => { if (label.toLowerCase().includes(q)) out.push({ label, kind: 'Tab', href }); });
    tasks().forEach(t => { if (String(t.title || '').toLowerCase().includes(q)) out.push({ label: t.title, kind: t.completed ? 'Task · done' : 'Task', href: '#page-8' }); });
    records.filter(r => r.habit_name).forEach(h => { if (h.habit_name.toLowerCase().includes(q)) out.push({ label: h.habit_name, kind: 'Habit', href: '#page-3' }); });
    records.filter(r => r.book_title).forEach(b => { if (b.book_title.toLowerCase().includes(q) || String(b.book_author || '').toLowerCase().includes(q)) out.push({ label: b.book_title, kind: 'Book', href: '#page-5' }); });
    Object.entries(WORKOUT_LABELS).forEach(([, label]) => { if (label.toLowerCase().includes(q)) out.push({ label, kind: 'Workout', href: '#page-2' }); });
    return out.slice(0, 8);
  }
  function showResults() {
    const input = $('home-search-input'), list = $('home-search-results');
    const items = searchItems(input.value);
    list.innerHTML = items.length ? items.map((it, i) => `<li role="option" id="home-sr-${i}"><a href="${esc(it.href)}"><span>${esc(it.label)}</span><small>${esc(it.kind)}</small></a></li>`).join('')
      : input.value.trim() ? '<li class="home-sr-empty">No matches</li>' : '';
    list.hidden = !list.innerHTML; input.setAttribute('aria-expanded', String(!list.hidden));
  }

  /* ---------- events ---------- */
  function goNewTask(e) {
    e?.preventDefault();
    document.getElementById('page-8')?.scrollIntoView({ block: 'start' });
    setTimeout(() => { document.getElementById('open-form')?.click(); }, 250);
  }
  document.addEventListener('click', async e => {
    if (e.target.closest('#home-new-task, #home-add-task')) { goNewTask(e); return; }
    if (e.target.closest('#home-cal-connect')) { try { await window.googleCalendar.connect(); } catch (err) { setHTML('home-events', `<p class="home-empty">${esc(err.message || err)}</p>`); } return; }
    const add = e.target.closest('[data-add-spend]');
    if (add) { window.ultimateBudget?.addFor?.(add.dataset.addSpend); return; }
    if (!e.target.closest('.home-search')) { const l = $('home-search-results'); if (l) l.hidden = true; }
  });
  document.addEventListener('change', async e => {
    const box = e.target.closest('.home-task-check'); if (!box) return;
    const id = box.dataset.id, task = records.find(r => r.__backendId === id);
    if (!task || !ready || busy.has(id)) { box.checked = !!task?.completed; return; }
    busy.add(id);
    const desired = box.checked;
    box.closest('.home-task')?.classList.toggle('done', desired);
    try {
      const res = await window.dataSdk.update({ ...task, completed: desired, completed_at: desired ? new Date().toISOString() : null });
      if (!res?.isOk) throw res?.error || new Error('Could not save');
      if (desired) window.celebrateDashboard?.(box, 'confetti-pop');
    } catch (err) { box.checked = !desired; box.closest('.home-task')?.classList.toggle('done', !desired); }
    finally { busy.delete(id); }
  });
  function bindSearch() {
    const input = $('home-search-input'); if (!input) return;
    input.addEventListener('input', showResults);
    input.addEventListener('focus', showResults);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { const first = $('home-search-results').querySelector('a'); if (first) { e.preventDefault(); first.click(); input.blur(); $('home-search-results').hidden = true; } }
      if (e.key === 'Escape') { $('home-search-results').hidden = true; input.blur(); }
    });
  }

  async function loadEvents() {
    const cal = window.googleCalendar;
    if (!cal?.isConnected?.()) { events = []; schedule(); return; }
    try {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end = addDays(start, 1);
      events = await cal.listEvents(start.toISOString(), end.toISOString());
    } catch (err) { events = []; }
    schedule();
  }

  async function connect() {
    let tries = 0;
    while (!window.dataSdk && tries < 40) { await new Promise(r => setTimeout(r, 250)); tries++; }
    if (!window.dataSdk) return;
    const session = await window.dataSdk.getSession();
    if (!session.isOk || !session.session) return;
    const out = await window.dataSdk.init({ onDataChanged(data) { records = data; schedule(); } });
    ready = !!out.isOk;
    try { reminder = await window.dataSdk.getTaskReminder(); } catch (err) { reminder = null; }
    schedule();
  }

  function start() {
    bindSearch();
    window.addEventListener('ultimate-budget-change', schedule);
    window.googleCalendar?.subscribe?.(() => loadEvents());
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { schedule(); loadEvents(); } });
    setInterval(schedule, 60000);
    schedule();
    connect().catch(() => {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
