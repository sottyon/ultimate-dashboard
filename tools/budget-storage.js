/* ---------- starting data ----------
   Your real balances, bills and transactions are NOT stored in this file,
   because the site is public. They live only in your Supabase account and
   arrive after you sign in. A new account starts from the setup screen:
   import a backup from the old Paycheck Budget app, or start blank. */
function blankTemplate(){
  const today = iso(new Date()), now = new Date().toISOString();
  return {
    version: 1,
    inputs: {
      generalTarget: 10000, vacationTarget: 1500, vacationDeadline: iso(addDays(new Date(), 90)), vetTarget: 300,
      apy: 0.04, pay: { total: 0, rent: 0, general: 0, checking: 0 },
      firstCheck: today, daysBetween: 14,
      start: { checking: 0, general: 0, rent: 0, vet: 0, vacation: 0 },
      vacationPerCheck: 0, vetPerCheck: 0, extraGeneral: 0, rent: 0, rentDay: 1
    },
    categories: ["Groceries","Gas","Pets","Entertainment","Dining","Shopping","Other essentials","Buffer","Subscriptions","Personal Care","Vacation","Other"]
      .map(name => ({ name, perCheck: 0 })),
    bills: [], oneTime: [],
    cards: [ { name: "Chase Sapphire", account: "Chase", dueDay: 24 }, { name: "Capital One", account: "Capital One", dueDay: 2 } ],
    snapshot: { date: today, at: now.slice(0, 19), checking: 0, general: 0, ccBucket: 0, rent: 0, vet: 0, vacation: 0, brokerage: 0, chaseOwed: 0, capOwed: 0 },
    txns: [], moves: [], savedAt: null
  };
}

/* ---------- state & persistence ----------
   Every change is written to this device instantly (localStorage), then to
   your Supabase account as one "budget_state" dashboard record. Changes from
   your other devices stream in through the dashboard's live sync.
   Transactions are merged by id, so two devices never overwrite each other's
   purchases. Offline edits are queued by data.js and sent when you reconnect. */
const LS_KEY = "ultimate-dash-budget-v1";
__CLONE_MIGRATE__
function loadLocal(){
  try { const raw = localStorage.getItem(LS_KEY); if (raw){ const d = JSON.parse(raw); if (d && d.version === 1) return migrate(d); } } catch(e){}
  return null;
}
let S = loadLocal();

const sync = { state: "local", dirty: false, writing: false, timer: null, rec: null, ready: false, creating: false };
function setSync(state){
  sync.state = state;
  const el = document.getElementById("syncPill");
  if (!el) return;
  const map = {
    local:      ["Saved on this device", "warn"],
    signedout:  ["Sign in to sync", "warn"],
    connecting: ["Connecting…", ""],
    saving:     ["Saving…", ""],
    synced:     ["✓ Saved to your account", "good"],
    queued:     ["Saved on this device · syncs when online", "warn"],
    error:      ["Couldn't sync · saved on this device", "bad"]
  };
  const [txt, cls] = map[state] || map.local;
  el.textContent = txt; el.className = "pill " + cls;
}
function persistLocal(){ try { if (S) localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch(e){} }
function save(){
  if (!S) return;
  S.savedAt = new Date().toISOString();
  persistLocal();
  sync.dirty = true;
  if (sync.ready){ setSync("saving"); clearTimeout(sync.timer); sync.timer = setTimeout(pushCloud, 400); }
}
async function pushCloud(){
  if (!sync.ready || !sync.dirty || !S || !window.dataSdk) return;
  if (sync.writing || (sync.creating && !sync.rec)){ clearTimeout(sync.timer); sync.timer = setTimeout(pushCloud, 400); return; }
  sync.writing = true; sync.dirty = false;
  const payload = { type: "budget_state", state: JSON.stringify(S), savedAt: S.savedAt, updated_at: new Date().toISOString() };
  try {
    let res;
    if (sync.rec) res = await window.dataSdk.update({ ...sync.rec, ...payload });
    else { sync.creating = true; res = await window.dataSdk.create({ ...payload, created_at: new Date().toISOString() }); sync.creating = false; }
    if (!res || !res.isOk) throw (res && res.error) || new Error("Save failed");
    setSync(sync.dirty ? "saving" : res.queued ? "queued" : "synced");
  } catch(e){
    sync.creating = false; sync.dirty = true;
    setSync(navigator.onLine ? "error" : "queued");
    if (navigator.onLine){ clearTimeout(sync.timer); sync.timer = setTimeout(pushCloud, 5000 + Math.random() * 2000); }
  }
  sync.writing = false;
  if (sync.dirty && sync.state === "saving"){ clearTimeout(sync.timer); sync.timer = setTimeout(pushCloud, 250); }
}
function flush(){ if (sync.dirty && sync.ready){ clearTimeout(sync.timer); pushCloud(); } }

__MERGE__

/* called by data.js with every dashboard record whenever anything changes */
function onRecords(all){
  sync.ready = true;
  const recs = all.filter(r => r && r.type === "budget_state")
    .sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")));
  if (!recs.length){
    sync.rec = null;
    if (S){ sync.dirty = true; setSync("saving"); clearTimeout(sync.timer); sync.timer = setTimeout(pushCloud, 50); }
    else { setSync("synced"); if (!sheetOpen()) render(); }
    return;
  }
  sync.rec = recs[0];
  const copies = recs.map(r => { try { const d = JSON.parse(r.state); return d && d.version === 1 ? migrate(d) : null; } catch(e){ return null; } }).filter(Boolean);
  if (!copies.length){ setSync("error"); return; }
  const remote = copies[0];
  let merged = copies.reduce((a, b) => merge(a, b));
  if (S) merged = merge(S, merged);
  const needPush = copies.length > 1 || !sameData(merged.txns, remote.txns) || !sameData(merged.moves, remote.moves) ||
    !sameData(merged.adjustments, remote.adjustments) || (merged.savedAt || "") > (remote.savedAt || "");
  if (!S || !sameData(merged, S)){ S = merged; persistLocal(); if (!sheetOpen()) render(); }
  // two devices created a budget at the same moment: keep the oldest record, remove the others
  if (recs.length > 1 && navigator.onLine) recs.slice(1).forEach(r => { if (!String(r.__backendId).startsWith("offline-")) window.dataSdk.delete(r); });
  if (needPush){ sync.dirty = true; setSync("saving"); clearTimeout(sync.timer); sync.timer = setTimeout(pushCloud, 250); }
  else if (!sync.writing && !sync.dirty) setSync("synced");
}
async function connectCloud(){
  setSync("connecting");
  let tries = 0;
  while (!window.dataSdk && tries < 40){ await new Promise(r => setTimeout(r, 250)); tries++; }
  if (!window.dataSdk){ setSync("local"); return; }
  try {
    const sess = await window.dataSdk.getSession();
    if (!sess.isOk || !sess.session){ setSync("signedout"); return; }
    const out = await window.dataSdk.init({ onDataChanged: onRecords });
    if (!out.isOk) setSync("error");
  } catch(e){ setSync("error"); }
}
window.addEventListener("pagehide", flush);
window.document.addEventListener("visibilitychange", () => { if (window.document.hidden) flush(); });
window.addEventListener("online", () => { if (sync.dirty) flush(); });

/* ---------- first-run setup ---------- */
function viewSetup(){
  return `<h1>Set up your budget</h1>
  <p class="sub">Bring over everything from your Paycheck Budget app, or start fresh. Either way, your numbers are saved only to your signed-in account and never to this site's code.</p>
  <div class="card">
    <div class="name" style="font-size:17px;font-weight:672">Move your existing budget</div>
    <ol class="small muted" style="padding-left:18px;line-height:1.6">
      <li>Open your old <b>Paycheck Budget</b> app.</li>
      <li>Go to <b>Accounts</b>, scroll to <b>Backup</b>, and tap <b>Copy backup</b>.</li>
      <li>Paste it below and tap <b>Import</b>.</li>
    </ol>
    <textarea class="json" id="setupTxt" placeholder="Paste your backup here"></textarea>
    <div style="height:10px"></div>
    <button class="btn" id="setupImport">Import</button>
  </div>
  <div class="card">
    <div class="name" style="font-size:17px;font-weight:672">Start blank</div>
    <p class="small muted">Starts with $0 balances and empty category budgets. Set your budgets under <b>Accounts</b>.</p>
    <button class="btn ghost" id="setupBlank">Start a blank budget</button>
  </div>`;
}
function adoptStart(d){
  d = migrate(d);
  const origin = clone(d); delete origin.origin;
  d.origin = origin;
  S = d; save(); render();
}

/* ---------- summary for the dashboard overview card ---------- */
function budgetSummary(){
  if (!S) return null;
  const sched = schedule(60), idx = Math.max(0, weekIdxOf(todayISO()));
  const wk = weekByIdx(idx, sched), sp = spentBy(wk.start, wk.end);
  const next = sched.find(c => c.date > todayISO());
  return { left: wk.total - sp.total, spent: sp.total, total: wk.total, start: wk.start, end: wk.end, nextCheck: next ? next.date : null, money };
}

/* ---------- one day's activity, for the Week in Depth cards ---------- */
function budgetDay(dateStr){
  if (!S) return null;
  const txns = S.txns.filter(t => t.date === dateStr)
    .sort((a, b) => (a.createdAt || a.updatedAt || "").localeCompare(b.createdAt || b.updatedAt || ""))
    .map(t => ({ id: t.id, desc: t.desc || t.category, category: t.category, account: t.account, amount: +t.amount, note: t.note || "", spend: isSpend(t), emoji: EMOJI[t.category] || "•" }));
  const spent = spentBy(dateStr, dateStr).total;
  const bills = spentBy(dateStr, dateStr, t => !isSpend(t)).total;
  const sched = schedule(60), idx = weekIdxOf(dateStr);
  const dailyBudget = idx >= 0 ? weekByIdx(idx, sched).total / 7 : null;
  return { date: dateStr, spent, bills, dailyBudget, txns, money };
}
