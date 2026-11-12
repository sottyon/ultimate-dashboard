/* Ultimate Dashboard · Week in Depth additions
   Fills the extra sections on each day card (the cards are built by the page's
   own script; each one carries data-date="YYYY-MM-DD"):
     • Tasks due that day (from the Dashboard checklist; due day and time are optional)
     • Habits ticked in the Habit Tracker for that day
     • "<Weekday> Spending Overview": a drop-down with the day's total and
       transactions from Finances
   It also provides window.taskDueLabel(), used by the Dashboard task list. */
(() => {
  const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let records = [];
  let pending = false;

  const pad = n => String(n).padStart(2, '0');
  const parseDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const mondayOf = s => { const d = parseDate(s); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return isoDate(d); };
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtTime = t => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    return new Date(2000, 0, 1, h, m).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };
  // write only on change: the MutationObserver below would otherwise re-trigger forever
  const setHTML = (el, html) => { if (el && el.__wid !== html) { el.innerHTML = html; el.__wid = html; } };
  const setText = (el, text) => { if (el && el.textContent !== text) el.textContent = text; };
  const fallbackMoney = n => (n < -0.004 ? '−$' : '$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  window.taskDueLabel = task => {
    if (!task || (!task.due_date && !task.due_time)) return '';
    const parts = [];
    if (task.due_date) parts.push(parseDate(task.due_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
    if (task.due_time) parts.push(fmtTime(task.due_time));
    return 'Due ' + parts.join(' · ');
  };

  function renderTasks(card, date) {
    const list = card.querySelector('.wid-task-list');
    if (!list) return;
    const tasks = records
      .filter(r => r.type === 'task' && r.due_date === date)
      .sort((a, b) => (a.due_time || '99:99').localeCompare(b.due_time || '99:99') || String(a.title).localeCompare(String(b.title)));
    setHTML(list, tasks.map(t => `
      <li class="wid-task ${t.completed ? 'done' : ''}">
        <span class="wid-check" aria-hidden="true">${t.completed ? '✓' : ''}</span>
        <span class="wid-task-main"><span class="wid-task-title">${esc(t.title || 'Untitled task')}</span>
        <span class="wid-task-meta">${[t.due_time ? fmtTime(t.due_time) : '', t.category === 'Work' ? 'Work' : 'Personal', t.completed ? 'Done' : ''].filter(Boolean).join(' · ')}</span></span>
      </li>`).join(''));
    card.querySelector('.wid-tasks-empty').hidden = tasks.length > 0;
  }

  function renderHabits(card, date) {
    const list = card.querySelector('.wid-habit-list');
    if (!list) return;
    const week = mondayOf(date), key = DAY_KEYS[parseDate(date).getDay()];
    const done = records.filter(r => r.type === 'habit' && r.habit_name && r.weeks?.[week]?.[key]);
    setHTML(list, done.map(h => `<li class="wid-habit"><span class="wid-check on" aria-hidden="true">✓</span>${esc(h.habit_name)}</li>`).join(''));
    // the page's own "Nothing logged yet." line only knows about logged habits
    const logged = card.querySelector('.habits-list')?.children.length || 0;
    const empty = card.querySelector('.wid-logged-empty');
    if (empty) {
      setText(empty, 'No habits tracked yet.');
      empty.classList.toggle('hidden', done.length + logged > 0);
      empty.hidden = done.length + logged > 0;
    }
  }

  function renderSpending(card, date) {
    const box = card.querySelector('.wid-spend');
    if (!box) return;
    const weekday = WEEKDAY[parseDate(date).getDay()];
    setText(box.querySelector('.wid-spend-title'), `${weekday} Spending Overview`);
    const day = window.ultimateBudget?.day?.(date);
    const body = box.querySelector('.wid-spend-body');
    const total = box.querySelector('.wid-spend-total');
    if (!day) {
      setText(total, '');
      setHTML(body, `<p class="wid-note">Set up your budget in <a href="#page-7">Finances</a> to see spending here.</p>`);
      return;
    }
    const money = day.money || fallbackMoney;
    setText(total, money(day.spent));
    const rows = day.txns.map(t => `
      <li class="wid-txn">
        <span class="wid-txn-main"><span class="wid-txn-title">${esc(t.emoji)} ${esc(t.desc)}</span>
        <span class="wid-txn-meta">${esc(t.category)} · ${esc(t.account)}${t.spend ? '' : ' · not counted as spending'}</span></span>
        <span class="wid-txn-amt ${t.amount < 0 ? 'refund' : ''}">${t.amount < 0 ? '+' + money(-t.amount) : money(t.amount)}</span>
      </li>`).join('');
    const budgetLine = day.dailyBudget ? `<span>Daily budget ${money(day.dailyBudget)}</span>` : '';
    setHTML(body, `
      <div class="wid-spend-stats"><span><b>${money(day.spent)}</b> spent</span>${budgetLine}${day.bills ? `<span>Bills ${money(day.bills)}</span>` : ''}</div>
      ${rows ? `<ul class="wid-txn-list">${rows}</ul>` : `<p class="wid-note">Nothing logged on ${weekday}.</p>`}
      <button type="button" class="wid-add" data-date="${date}">+ Add spending for ${weekday} in Finances</button>`);
    box.classList.toggle('over', !!day.dailyBudget && day.spent > day.dailyBudget + 0.004);
  }

  function renderAll() {
    pending = false;
    document.querySelectorAll('#week-grid .day-card[data-date]').forEach(card => {
      const date = card.dataset.date;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
      renderTasks(card, date);
      renderHabits(card, date);
      renderSpending(card, date);
    });
  }
  const schedule = () => { if (!pending) { pending = true; requestAnimationFrame(renderAll); } };

  document.addEventListener('click', e => {
    const add = e.target.closest('.wid-add');
    if (!add) return;
    if (window.ultimateBudget?.addFor) window.ultimateBudget.addFor(add.dataset.date);
    else location.hash = '#page-7';
  });

  async function connect() {
    let tries = 0;
    while (!window.dataSdk && tries < 40) { await new Promise(r => setTimeout(r, 250)); tries++; }
    if (!window.dataSdk) return;
    const session = await window.dataSdk.getSession();
    if (!session.isOk || !session.session) return;
    await window.dataSdk.init({ onDataChanged(data) { records = data; schedule(); } });
  }

  function start() {
    const grid = document.getElementById('week-grid');
    if (grid) {
      // re-fill when the page script switches weeks or redraws a card
      new MutationObserver(schedule).observe(grid, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-date'] });
    }
    window.addEventListener('ultimate-budget-change', schedule);
    schedule();
    connect().catch(() => {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
