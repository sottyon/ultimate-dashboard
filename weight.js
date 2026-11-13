/* Ultimate Dashboard · Weight tracker (Workout Tracker page, "Weight" tab)
   Records in Supabase dashboard_records:
     { type: 'weight_log',  date: 'YYYY-MM-DD', weight: 151.2, unit: 'lb', created_at, updated_at }   one per day
     { type: 'weight_goal', start_weight: 160, goal_weight: 145, start_date: 'YYYY-MM-DD', unit: 'lb', ... }
   Also fills the Weight card on the Dashboard (#home-weight). */
(() => {
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtDate = (s, o) => parse(s).toLocaleDateString('en-US', o || { month: 'short', day: 'numeric' });
  const r1 = n => Math.round(n * 10) / 10;
  const num = n => r1(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  const signed = n => (n > 0.04 ? '+' : n < -0.04 ? '−' : '±') + num(Math.abs(n));
  const SCALE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4.5"/><path d="M8.6 10a4.6 4.6 0 0 1 6.8 0"/><path d="m12 11.4 1.4-1.9"/></svg>';
  const RANGES = [['1m', '1M', 31], ['3m', '3M', 92], ['6m', '6M', 183], ['1y', '1Y', 366], ['all', 'All', 0]];

  let ready = false, statusText = '', range = '3m', editingGoal = false, confirmDel = null, tip = null;
  let entries = [];   // [{ date, weight, unit, rec }] oldest first
  let goal = null;    // goal record
  let tab = 'workouts';
  try { tab = localStorage.getItem('ultimate-wo-tab') === 'weight' ? 'weight' : 'workouts'; range = localStorage.getItem('ultimate-weight-range') || '3m'; } catch (e) {}

  function fromRecords(records) {
    const byDate = new Map();
    let g = null;
    for (const r of records) {
      if (r.type === 'weight_log' && r.date && Number.isFinite(+r.weight)) {
        const cur = byDate.get(r.date);
        if (!cur || String(r.updated_at || '') > String(cur.updated_at || '')) byDate.set(r.date, r);
      } else if (r.type === 'weight_goal' && (!g || String(r.updated_at || '') > String(g.updated_at || ''))) g = r;
    }
    entries = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).map(rec => ({ date: rec.date, weight: +rec.weight, rec }));
    goal = g;
  }
  const unit = () => goal?.unit || 'lb';

  function summary() {
    if (!entries.length && !goal) return null;
    const last = entries[entries.length - 1] || null, current = last ? last.weight : null;
    const start = goal && Number.isFinite(+goal.start_weight) ? +goal.start_weight : entries[0]?.weight ?? null;
    const target = goal && Number.isFinite(+goal.goal_weight) ? +goal.goal_weight : null;
    let pct = null;
    if (current != null && start != null && target != null && Math.abs(start - target) > 0.01) pct = Math.max(0, Math.min(1, (start - current) / (start - target)));
    const weekAgo = iso(addDays(new Date(), -7));
    const prior = [...entries].reverse().find(e => e.date <= weekAgo);
    const monthStart = iso(new Date()).slice(0, 8) + '01';
    const beforeMonth = [...entries].reverse().find(e => e.date < monthStart) || entries.find(e => e.date >= monthStart);
    return {
      current, last, start, target, pct, unit: unit(), count: entries.length,
      change: current != null && start != null ? current - start : null,
      toGo: current != null && target != null ? target - current : null,
      week: current != null && prior ? current - prior.weight : null,
      month: current != null && beforeMonth && beforeMonth !== last ? current - beforeMonth.weight : null,
      recent: entries.slice(-14)
    };
  }

  /* ---------- saving ---------- */
  async function write(rec, fields) {
    if (!ready) { setStatus('Sign in to save your weight.'); return false; }
    const now = new Date().toISOString();
    try {
      const res = rec ? await window.dataSdk.update({ ...rec, ...fields, updated_at: now })
                      : await window.dataSdk.create({ ...fields, created_at: now, updated_at: now });
      if (!res?.isOk) throw res?.error || new Error('Save failed');
      setStatus(res.queued ? 'Saved on this device; waiting to sync.' : 'Saved.');
      return true;
    } catch (error) { setStatus(`Couldn't save: ${error.message || error}`); return false; }
  }
  async function logWeight(date, weight) {
    const ex = entries.find(e => e.date === date);
    const ok = await write(ex?.rec, { type: 'weight_log', date, weight: r1(weight), unit: unit() });
    if (ok && !goal) await write(null, { type: 'weight_goal', start_weight: r1(weight), goal_weight: null, start_date: date, unit: unit() });
    if (ok) try { window.celebrateDashboard?.(document.getElementById('wt-save'), 'stars'); } catch (e) {}
  }
  async function removeEntry(date) {
    const ex = entries.find(e => e.date === date); if (!ex) return;
    try { const res = await window.dataSdk.delete(ex.rec); if (!res?.isOk) throw res?.error || new Error('Delete failed'); setStatus('Entry deleted.'); }
    catch (error) { setStatus(`Couldn't delete: ${error.message || error}`); }
  }
  function setStatus(text) { statusText = text; const el = document.getElementById('weight-status'); if (el) el.textContent = text; }

  /* ---------- progress ring (shared by the page and the Dashboard card) ---------- */
  function ringHTML(pct, label, size, aria) {
    return `<div class="home-ring wt-ring ${size}" role="img" aria-label="${esc(aria)}"><svg viewBox="0 0 132 132"><circle class="ring-track" cx="66" cy="66" r="56"/><circle class="ring-fill" cx="66" cy="66" r="56" pathLength="100" stroke-dasharray="${((pct || 0) * 100).toFixed(1)} 100"/></svg>
      <div class="ring-center"><span class="ring-icon">${SCALE_ICON}</span><b class="ring-pct">${esc(label)}</b></div></div>`;
  }

  /* ---------- line chart ---------- */
  function chartHTML(list, target, u) {
    if (list.length < 2) return `<div class="wt-chart-empty">${list.length ? 'Log one more day to see your progress line.' : 'Your progress line appears after your first two entries.'}</div>`;
    const box = document.getElementById('weight-app')?.clientWidth || 0;
    const W = box ? Math.max(300, Math.min(1000, box - 56)) : 900, H = W < 520 ? 220 : 300, L = 46, R = 14, T = 18, B = 30;
    const t0 = parse(list[0].date).getTime(), t1 = parse(list[list.length - 1].date).getTime(), span = Math.max(1, t1 - t0);
    const vals = list.map(e => e.weight).concat(target != null ? [target] : []);
    let lo = Math.min(...vals), hi = Math.max(...vals); const padv = Math.max(1, (hi - lo) * 0.15); lo -= padv; hi += padv;
    const x = d => L + (parse(d).getTime() - t0) / span * (W - L - R);
    const y = v => T + (hi - v) / (hi - lo) * (H - T - B);
    const pts = list.map(e => [x(e.date), y(e.weight)]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${H - B} L${pts[0][0].toFixed(1)} ${H - B} Z`;
    const ticks = [0, 1, 2, 3].map(i => lo + (hi - lo) * i / 3);
    const xl = [list[0], list[Math.floor((list.length - 1) / 2)], list[list.length - 1]].filter((e, i, a) => a.indexOf(e) === i);
    return `<svg class="wt-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight over time, ${esc(num(list[0].weight))} to ${esc(num(list[list.length - 1].weight))} ${u}">
      ${ticks.map(v => `<line class="wt-grid" x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="wt-axis" x="${L - 8}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${num(v)}</text>`).join('')}
      ${xl.map((e, i) => `<text class="wt-axis" x="${x(e.date).toFixed(1)}" y="${H - 8}" text-anchor="${i === 0 ? 'start' : i === xl.length - 1 ? 'end' : 'middle'}">${fmtDate(e.date)}</text>`).join('')}
      ${target != null ? `<line class="wt-goal-line" x1="${L}" x2="${W - R}" y1="${y(target).toFixed(1)}" y2="${y(target).toFixed(1)}"/><text class="wt-goal-text" x="${W - R}" y="${(y(target) - 6).toFixed(1)}" text-anchor="end">Goal ${num(target)}</text>` : ''}
      <path class="wt-area" d="${area}"/><path class="wt-line" d="${line}"/>
      ${pts.map((p, i) => `<circle class="wt-dot ${tip === list[i].date ? 'on' : ''}" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${list.length > 60 ? 2.5 : 4}" data-wt-tip="${list[i].date}"><title>${fmtDate(list[i].date, { month: 'short', day: 'numeric', year: 'numeric' })}: ${num(list[i].weight)} ${u}</title></circle>`).join('')}
    </svg>`;
  }

  /* ---------- the Weight tab ---------- */
  function render() {
    const app = document.getElementById('weight-app');
    if (app) {
      const s = summary(), u = unit(), today = iso(new Date());
      const days = RANGES.find(r => r[0] === range)?.[2] || 0;
      const from = days ? iso(addDays(new Date(), -days)) : '';
      const shown = entries.filter(e => e.date >= from);
      const hasGoal = goal && goal.goal_weight != null && goal.goal_weight !== '';
      const tipE = tip && entries.find(e => e.date === tip);
      const ringLabel = s?.pct != null ? `${Math.round(s.pct * 100)}%` : s?.current != null ? num(s.current) : '—';
      app.innerHTML = `
      <div class="wt-top">
        <section class="wt-pane wt-log" aria-labelledby="wt-log-h">
          <h2 id="wt-log-h" class="wt-title">Log your weight</h2>
          <form id="wt-form" class="wt-form">
            <label class="wt-field"><span>Weight (${u})</span><input id="wt-weight" inputmode="decimal" placeholder="${s?.current != null ? num(s.current) : 'e.g. 150.4'}" autocomplete="off" required></label>
            <label class="wt-field"><span>Date</span><input id="wt-date" type="date" value="${today}" max="${today}" required></label>
            <button id="wt-save" class="wt-btn ink" type="submit">Save</button>
          </form>
          <p class="wt-hint">One entry per day. Logging a day again replaces that day's weight.</p>
        </section>
        <section class="wt-pane wt-goal" aria-labelledby="wt-goal-h">
          <div class="wt-goal-body">
            ${ringHTML(s?.pct, ringLabel, 'lg', s?.pct != null ? `${Math.round(s.pct * 100)}% of the way to your goal` : 'Weight goal progress')}
            <div class="wt-goal-copy">
              <h2 id="wt-goal-h" class="wt-title">${hasGoal ? `Goal: ${num(goal.goal_weight)} ${u}` : 'Set a goal'}</h2>
              <p class="wt-muted">${hasGoal ? `Started at ${num(goal.start_weight)} ${u}${goal.start_date ? ' on ' + fmtDate(goal.start_date, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}` : 'Add a goal weight to see how far along you are.'}</p>
              ${s?.toGo != null && hasGoal ? `<p class="wt-togo">${Math.abs(s.toGo) < 0.05 ? 'Goal reached 🎉' : `${num(Math.abs(s.toGo))} ${u} to go`}</p>` : ''}
              <button type="button" class="wt-btn" id="wt-goal-edit">${editingGoal ? 'Close' : hasGoal ? 'Edit goal' : 'Set goal'}</button>
            </div>
          </div>
          ${editingGoal ? `<form id="wt-goal-form" class="wt-form wt-goal-form">
            <label class="wt-field"><span>Starting weight</span><input id="wt-g-start" inputmode="decimal" value="${goal?.start_weight ?? (entries[0]?.weight ?? '')}" required></label>
            <label class="wt-field"><span>Start date</span><input id="wt-g-date" type="date" value="${goal?.start_date || entries[0]?.date || today}"></label>
            <label class="wt-field"><span>Goal weight</span><input id="wt-g-goal" inputmode="decimal" value="${goal?.goal_weight ?? ''}" required></label>
            <label class="wt-field"><span>Units</span><select id="wt-g-unit"><option value="lb" ${u === 'lb' ? 'selected' : ''}>Pounds (lb)</option><option value="kg" ${u === 'kg' ? 'selected' : ''}>Kilograms (kg)</option></select></label>
            <button class="wt-btn ink" type="submit">Save goal</button>
          </form>` : ''}
        </section>
      </div>
      <section class="wo-stats wt-stats" aria-label="Weight summary">
        <div class="wo-stat pink"><b>${s?.current != null ? num(s.current) : '—'}<small> ${u}</small></b><span>current${s?.last ? ' · ' + fmtDate(s.last.date) : ''}</span></div>
        <div class="wo-stat"><b>${s?.week != null ? signed(s.week) : '—'}</b><span>vs. a week ago</span></div>
        <div class="wo-stat aqua"><b>${s?.change != null ? signed(s.change) : '—'}</b><span>since you started</span></div>
        <div class="wo-stat"><b>${s?.count || 0}</b><span>entries logged</span></div>
      </section>
      <section class="wt-pane" aria-labelledby="wt-chart-h">
        <div class="wt-chart-head">
          <h2 id="wt-chart-h" class="wt-title">Progress</h2>
          <div class="wt-ranges" role="group" aria-label="Time range">${RANGES.map(([k, lbl]) => `<button type="button" class="wt-range ${range === k ? 'on' : ''}" data-wt-range="${k}" aria-pressed="${range === k}">${lbl}</button>`).join('')}</div>
        </div>
        <p class="wt-tip" aria-live="polite">${tipE ? `<b>${num(tipE.weight)} ${u}</b> · ${fmtDate(tipE.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}` : shown.length ? `${shown.length} entr${shown.length === 1 ? 'y' : 'ies'} · tap a dot for details` : ''}</p>
        ${chartHTML(shown, hasGoal ? +goal.goal_weight : null, u)}
      </section>
      <section class="wt-pane" aria-labelledby="wt-hist-h">
        <h2 id="wt-hist-h" class="wt-title">History</h2>
        ${entries.length ? `<ul class="wt-list">${[...entries].reverse().slice(0, 60).map((e, i, arr) => {
          const prev = arr[i + 1], d = prev ? e.weight - prev.weight : null;
          return `<li class="wt-row"><span class="wt-row-date">${fmtDate(e.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <span class="wt-row-val"><b>${num(e.weight)} ${u}</b>${d != null ? `<small>${signed(d)}</small>` : ''}</span>
            <button type="button" class="wt-del" data-wt-del="${e.date}" aria-label="Delete ${fmtDate(e.date)} entry">${confirmDel === e.date ? 'Delete?' : '×'}</button></li>`;
        }).join('')}</ul>` : '<p class="wt-muted">No entries yet. Log your weight above to start your graph.</p>'}
      </section>
      <p id="weight-status" class="wo-status" role="status" aria-live="polite">${esc(statusText)}</p>`;
    }
    paintHome();
    window.dispatchEvent(new CustomEvent('ultimate-weight-change'));
  }

  /* ---------- Dashboard card ---------- */
  function paintHome() {
    const box = document.getElementById('home-weight-body'); if (!box) return;
    const s = summary(), u = unit();
    const cap = document.getElementById('home-weight-caption');
    if (!s || s.current == null) {
      if (cap) cap.textContent = 'Not started';
      box.innerHTML = ringHTML(0, '—', 'sm', 'Weight goal progress') + '<div class="home-wt-copy"><p class="home-empty">Log your first weight to start your progress graph.</p></div>';
    } else {
      if (cap) cap.textContent = s.target != null ? `Goal ${num(s.target)} ${u}` : `Last logged ${fmtDate(s.last.date)}`;
      const r = s.recent, lo = Math.min(...r.map(e => e.weight)), hi = Math.max(...r.map(e => e.weight)), sp = Math.max(0.5, hi - lo);
      const spark = r.length > 1 ? `<svg class="home-wt-spark" viewBox="0 0 120 32" preserveAspectRatio="none" aria-hidden="true"><path d="${r.map((e, i) => (i ? 'L' : 'M') + (i / (r.length - 1) * 116 + 2).toFixed(1) + ' ' + (28 - (e.weight - lo) / sp * 24).toFixed(1)).join(' ')}"/></svg>` : '';
      box.innerHTML = ringHTML(s.pct, s.pct != null ? `${Math.round(s.pct * 100)}%` : num(s.current), 'sm', s.pct != null ? `${Math.round(s.pct * 100)}% of the way to your goal weight` : 'Current weight') +
        `<div class="home-wt-copy"><b class="home-wt-now">${num(s.current)} <small>${u}</small></b>
        <span class="home-caption">${[s.week != null ? `${signed(s.week)} this week` : '', s.toGo != null ? (Math.abs(s.toGo) < 0.05 ? 'Goal reached 🎉' : `${num(Math.abs(s.toGo))} to go`) : ''].filter(Boolean).join(' · ') || 'Keep logging to see trends'}</span>${spark}</div>`;
    }
    const foot = document.getElementById('overview-weight');
    if (foot) foot.textContent = s && s.current != null ? `${num(s.current)} ${u}${s.change != null && s.count > 1 ? ' · ' + signed(s.change) + ' since start' : ''}` : 'No weight logged yet';
  }

  /* ---------- tabs on the Workout Tracker page ---------- */
  function showTab(name) {
    tab = name === 'weight' ? 'weight' : 'workouts';
    try { localStorage.setItem('ultimate-wo-tab', tab); } catch (e) {}
    const w = document.getElementById('workout-app'), g = document.getElementById('weight-app');
    if (w) w.hidden = tab !== 'workouts';
    if (g) { const was = g.hidden; g.hidden = tab !== 'weight'; if (was && !g.hidden) render(); }
    document.querySelectorAll('.wo-tabs [data-wo-tab]').forEach(b => { const on = b.dataset.woTab === tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    const h = document.getElementById('wo-heading'), p = document.getElementById('wo-sub');
    if (h) h.textContent = tab === 'weight' ? 'Track your weight.' : 'Move a little, every day.';
    if (p) p.textContent = tab === 'weight' ? 'Log your weight, set a goal and watch your progress line.' : 'Tap what you did each day. Rest days count too.';
  }

  document.addEventListener('click', e => {
    const t = e.target;
    const tb = t.closest('[data-wo-tab]');
    if (tb) { showTab(tb.dataset.woTab); if (tb.tagName === 'BUTTON') return; }
    if (!t.closest('#weight-app')) return;
    const rg = t.closest('[data-wt-range]'); if (rg) { range = rg.dataset.wtRange; tip = null; try { localStorage.setItem('ultimate-weight-range', range); } catch (er) {} render(); return; }
    const dot = t.closest('[data-wt-tip]'); if (dot) { tip = tip === dot.dataset.wtTip ? null : dot.dataset.wtTip; render(); return; }
    if (t.id === 'wt-goal-edit') { editingGoal = !editingGoal; render(); if (editingGoal) document.getElementById('wt-g-goal')?.focus(); return; }
    const del = t.closest('[data-wt-del]');
    if (del) { const d = del.dataset.wtDel; if (confirmDel === d) { confirmDel = null; removeEntry(d); } else { confirmDel = d; render(); } return; }
  });
  document.addEventListener('keydown', e => {
    const b = e.target.closest?.('.wo-tabs [data-wo-tab]'); if (!b || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const next = b.dataset.woTab === 'weight' ? 'workouts' : 'weight'; showTab(next); document.querySelector(`.wo-tabs [data-wo-tab="${next}"]`)?.focus();
  });
  document.addEventListener('submit', async e => {
    if (e.target.id === 'wt-form') {
      e.preventDefault();
      const w = parseFloat(String(document.getElementById('wt-weight').value).replace(',', '.'));
      const date = document.getElementById('wt-date').value || iso(new Date());
      if (!(w >= 20 && w <= 1500)) { setStatus('Enter a weight between 20 and 1500.'); document.getElementById('wt-weight').focus(); return; }
      await logWeight(date, w);
    } else if (e.target.id === 'wt-goal-form') {
      e.preventDefault();
      const sw = parseFloat(document.getElementById('wt-g-start').value), gw = parseFloat(document.getElementById('wt-g-goal').value);
      if (!(sw >= 20 && sw <= 1500) || !(gw >= 20 && gw <= 1500)) { setStatus('Enter a starting and goal weight between 20 and 1500.'); return; }
      const ok = await write(goal, { type: 'weight_goal', start_weight: r1(sw), goal_weight: r1(gw), start_date: document.getElementById('wt-g-date').value || iso(new Date()), unit: document.getElementById('wt-g-unit').value });
      if (ok) { editingGoal = false; render(); }
    }
  });

  window.ultimateWeight = { summary, open: () => showTab('weight') };

  async function connect() {
    let tries = 0;
    while (!window.dataSdk && tries < 40) { await new Promise(r => setTimeout(r, 250)); tries++; }
    if (!window.dataSdk) { setStatus('Could not load your data connection.'); return; }
    const session = await window.dataSdk.getSession();
    if (!session.isOk || !session.session) { setStatus('Sign in to load and save your weight.'); return; }
    const out = await window.dataSdk.init({ onDataChanged(records) { fromRecords(records); confirmDel = null; render(); } });
    ready = !!out.isOk;
    if (!ready) setStatus('Weight tracker could not connect to your database.');
  }
  let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (tab === 'weight') render(); }, 200); });
  function start() { showTab(tab); render(); connect().catch(error => setStatus(error.message || String(error))); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
