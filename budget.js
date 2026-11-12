/* Ultimate Dashboard · Budget page
   Built from the Paycheck Budget app (sottyon/Finance @ 6b80d57) by build-budget.py.
   The app runs inside a shadow root so its styles and the dashboard's styles
   (Tailwind, page CSS) can't affect each other.
   Data: one "budget_state" record in Supabase via window.dataSdk (data.js). */
(() => {
const BUDGET_CSS = "\n:host{\n  color-scheme:light;\n  /* project palette: #fdbfce pink \u00b7 #d0efef aqua \u00b7 #44362f cocoa \u00b7 #dbdfeb mist (plus tints of them) */\n  --bg:#eff1f6; --card:#ffffff; --card2:#eff1f6; --line:#dbdfeb;\n  --ink:#44362f; --ink2:#807672; --ink3:#a29a97;\n  --accent:#fdbfce; --on-accent:#44362f; --mark:#fdbfce; --soft:#d0efef; --on-soft:#44362f;\n  --good:#44362f; --goodbar:#bad5d4; --warn:#bc8f96; --bad:#8a6a6b; --bad-soft:#fdbfce; --warn-soft:#fee2e9; --good-soft:#d0efef;\n  --track:#dbdfeb; --hero-wash:#fdbfce;\n  --r:16px;\n  --font:\"Cause\",cursive;\n}\n\n*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}\n:host{display:block;font-feature-settings:\"tnum\" 1;background:var(--bg);color:var(--ink);font-family:var(--font);font-optical-sizing:auto;font-size:16px;border-radius:22px;border:1px solid var(--line);overflow:clip}\nbutton,input,select,textarea{font:inherit;color:inherit}\n.wrap{max-width:640px;margin:0 auto;padding:12px 16px 96px}\nh1{font-size:30px;line-height:1.1;margin:10px 2px 2px;letter-spacing:-.02em;font-weight:672}\n.sub{color:var(--ink2);font-size:14px;margin:0 2px 14px}\nh2{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink3);font-weight:672;margin:22px 4px 8px}\n.card{background:var(--card);border-radius:var(--r);padding:16px;margin-bottom:12px;box-shadow:0 1px 0 rgba(0,0,0,.03)}\n.card.hero{background:linear-gradient(135deg,var(--hero-wash) 0%,var(--card) 72%)}\n.hero .big{font-size:44px;font-weight:700;letter-spacing:-.03em;font-variant-numeric:tabular-nums;line-height:1}\n.hero .lbl{color:var(--ink2);font-size:14px;margin-bottom:6px}\n.row{display:flex;align-items:center;justify-content:space-between;gap:12px}\n.muted{color:var(--ink2)} .faint{color:var(--ink3)} .small{font-size:13px}\n.num{font-variant-numeric:tabular-nums;font-weight:600}\n.bar{height:8px;background:var(--track);border-radius:4px;overflow:hidden;margin-top:8px}\n.bar>i{display:block;height:100%;background:var(--mark);border-radius:4px}\n.bar.over>i{background:var(--bad)} .bar.near>i{background:var(--warn)}\n.bar.thick{height:12px;border-radius:6px}.bar.thick>i{border-radius:6px}\n.stats{display:grid;grid-template-columns:1fr 1fr;gap:12px}\n.stat{background:var(--card);border-radius:var(--r);padding:14px}\n.stat .v{font-size:22px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-.02em}\n.stat .k{font-size:13px;color:var(--ink2);margin-top:2px}\n.list{background:var(--card);border-radius:var(--r);overflow:hidden;margin-bottom:12px}\n.item{padding:13px 16px;border-bottom:1px solid var(--line)}\n.item:last-child{border-bottom:0}\n.item.tap{cursor:pointer}.item.tap:active{background:var(--card2)}\n.cat{display:flex;gap:10px;align-items:center;min-width:0}\n.emoji{width:34px;height:34px;border-radius:10px;background:var(--soft);display:grid;place-items:center;font-size:17px;flex:none}\n.name{font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.tag{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:600;padding:2px 8px;border-radius:999px}\n.tag.bad{background:var(--bad-soft);color:var(--bad)} .tag.warn{background:var(--warn-soft);color:var(--warn)} .tag.good{background:var(--good-soft);color:var(--good)}\n.neg{color:var(--good)}\nnav.tabs{position:sticky;top:0;background:color-mix(in srgb,var(--card) 88%,transparent);backdrop-filter:saturate(1.6) blur(18px);-webkit-backdrop-filter:saturate(1.6) blur(18px);border-bottom:1px solid var(--line);display:flex;justify-content:space-around;padding:6px 4px;z-index:20}\nnav.tabs button{background:none;border:0;display:flex;flex-direction:column;align-items:center;gap:2px;font-size:11px;color:var(--ink3);padding:4px 8px;min-width:58px;cursor:pointer}\nnav.tabs button svg{width:24px;height:24px}\nnav.tabs button.on{color:var(--ink);font-weight:600}\nnav.tabs button.on svg{background:var(--accent);color:var(--on-accent);border-radius:10px;padding:2px 10px;box-sizing:content-box;margin:0 -10px}\n.fab{display:none;position:fixed;right:18px;bottom:calc(20px + env(safe-area-inset-bottom));width:58px;height:58px;border-radius:29px;border:0;background:var(--accent);color:var(--on-accent);font-size:30px;line-height:1;box-shadow:0 6px 18px rgba(0,0,0,.22);z-index:21;cursor:pointer}\n.seg{display:flex;background:var(--card2);border-radius:10px;padding:2px;gap:2px}\n.seg button{flex:1;border:0;background:none;padding:8px 6px;border-radius:8px;font-size:14px;cursor:pointer}\n.seg button.on{background:var(--card);box-shadow:0 1px 3px rgba(0,0,0,.12);font-weight:600}\n.btn{border:0;border-radius:12px;padding:12px 16px;font-weight:600;background:var(--accent);color:var(--on-accent);cursor:pointer;width:100%;font-size:16px}\n.btn.ghost{background:var(--soft);color:var(--on-soft)}\n.btn.danger{background:var(--bad-soft);color:var(--bad)}\n.btn.sm{width:auto;padding:8px 12px;font-size:14px;border-radius:10px}\n.check{display:flex;gap:12px;align-items:center;cursor:pointer}\n.check .box{width:24px;height:24px;border-radius:12px;border:2px solid var(--ink3);flex:none;display:grid;place-items:center}\n.check.done .box{background:var(--soft);border-color:var(--good);color:var(--on-soft)}\n.check.done .name{text-decoration:line-through;color:var(--ink3)}\n.sheet-bg{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:40;display:none;align-items:flex-end;justify-content:center}\n.sheet-bg.open{display:flex}\n.sheet{background:var(--bg);width:100%;max-width:560px;border-radius:20px 20px 0 0;max-height:92vh;overflow:auto;padding:10px 16px calc(20px + env(safe-area-inset-bottom));animation:up .22s ease-out}\n@keyframes up{from{transform:translateY(40px);opacity:.4}to{transform:none;opacity:1}}\n.grab{width:40px;height:5px;border-radius:3px;background:var(--line);margin:4px auto 10px}\n.field{background:var(--card);border-radius:12px;padding:10px 14px;margin-bottom:10px}\n.field label{display:block;font-size:12px;color:var(--ink3);margin-bottom:2px}\n.field input,.field select,.field textarea{width:100%;border:0;background:none;outline:none;font-size:17px;padding:2px 0}\n.amount-in{font-size:40px!important;font-weight:700;letter-spacing:-.02em}\n.chips{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 12px}\n.chip{border:1px solid var(--line);background:var(--card);border-radius:999px;padding:7px 12px;font-size:14px;cursor:pointer}\n.chip.on{background:var(--accent);border-color:var(--accent);color:var(--on-accent);font-weight:600}\n.daychips{display:flex;gap:6px;overflow-x:auto;padding:2px 2px 10px;margin:0 -2px;scrollbar-width:none}\n.daychips::-webkit-scrollbar{display:none}\n.dchip{flex:none;border:0;background:var(--card);border-radius:12px;padding:8px 10px;display:flex;flex-direction:column;align-items:center;gap:2px;min-width:58px;cursor:pointer;color:var(--ink)}\n.dchip b{font-size:13px;font-weight:600}.dchip span{font-size:12px;color:var(--ink3)}\n.dchip.is-today b{text-decoration:underline;text-underline-offset:3px}\n.dchip.on{background:var(--accent);color:var(--on-accent)}.dchip.on span{color:var(--on-accent)}\n.quick .qrow{display:flex;gap:8px;margin-bottom:8px}.quick .qrow:last-of-type{margin-bottom:0}\n.quick input:not([type=checkbox]),.quick select{flex:1;min-width:0;border:0;border-radius:10px;background:var(--card2);padding:10px 12px;font-size:16px;outline:none;color:var(--ink);-webkit-appearance:none;appearance:none}\n.quick #qAmt{flex:0 0 34%;font-weight:700;font-variant-numeric:tabular-nums}\n.quick .qsel{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}.quick .qsel span{font-size:11px;color:var(--ink3);padding-left:4px}\n.quick .qref{display:flex;align-items:center;gap:6px;font-size:14px;color:var(--ink2);padding:0 4px}\n.quick .qref input{width:18px;height:18px;accent-color:var(--mark)}\n.weeknav{display:flex;align-items:center;gap:10px;margin:4px 0 12px}\n.weeknav button{background:var(--card);border:0;border-radius:12px;width:44px;height:44px;font-size:24px;cursor:pointer;flex:none;color:var(--ink)}\n.weeknav button:disabled{opacity:.35}\n.weeknav .wk-mid{flex:1;text-align:center}\n.wk-title{font-weight:672;font-size:17px}\n.monthnav{display:flex;align-items:center;justify-content:space-between;margin:6px 0 10px}\n.monthnav button{background:var(--card);border:0;border-radius:10px;width:40px;height:36px;font-size:20px;cursor:pointer}\n.chart{display:flex;align-items:flex-end;gap:6px;height:116px;position:relative}\n.chart .col{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end;cursor:pointer;position:relative}\n.chart .col b{display:block;width:100%;max-width:30px;background:var(--mark);border-radius:4px 4px 0 0}\n.chart .col.over b{background:var(--bad)}\n.chart .col.today span{color:var(--ink);font-weight:700}\n.chart .col span{font-size:11px;color:var(--ink3);display:block;height:14px;line-height:14px}\n.chart .cap{position:absolute;left:0;right:0;border-top:1.5px dashed var(--ink3);pointer-events:none}\n.tip{font-size:13px;color:var(--ink2);min-height:18px;margin-top:6px}\n.search{width:100%;border:0;border-radius:12px;padding:10px 14px;background:var(--card);margin-bottom:10px;font-size:16px;outline:none}\n.dayhead{font-size:13px;color:var(--ink3);margin:14px 4px 6px;display:flex;justify-content:space-between}\n.toast{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(96px + env(safe-area-inset-bottom));background:var(--ink);color:var(--bg);padding:10px 16px;border-radius:12px;font-size:14px;z-index:60;opacity:0;transition:opacity .2s;pointer-events:none}\n.toast.show{opacity:1}\n.pill{font-size:11px;font-weight:600;padding:4px 10px;border-radius:999px;background:var(--card);color:var(--ink2);box-shadow:0 1px 4px rgba(0,0,0,.08)}\n.pill.good{background:var(--good-soft);color:var(--ink)}.pill.warn{background:var(--warn-soft);color:var(--warn)}.pill.bad{background:var(--bad-soft);color:var(--bad)}\n.sync{font-size:12px;color:var(--ink3);text-align:center;margin:18px 0 0}\ntable.mini{width:100%;border-collapse:collapse;font-size:14px}\ntable.mini td{padding:6px 0;border-bottom:1px solid var(--line)}\ntable.mini td:last-child{text-align:right;font-variant-numeric:tabular-nums}\ntable.mini tr:last-child td{border-bottom:0}\ntextarea.json{width:100%;min-height:140px;border:0;border-radius:12px;background:var(--card);padding:10px;font-family:ui-monospace,Menlo,monospace;font-size:12px}\n\n.fab.show{display:block}\n.tag.warn{color:var(--ink)}\n.tag.bad{color:var(--ink)}\n.bud-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 18px 10px;max-width:640px;margin:0 auto}\n.bud-title{font-size:13px;letter-spacing:.16em;text-transform:uppercase;font-weight:672;margin:0;color:var(--ink)}\n.sheet-bg{z-index:10050}.toast{z-index:10060}.fab{z-index:10040}\nb,strong{font-weight:672}\n";
const BUDGET_HTML = "\n<div class=\"bud-head\"><h2 class=\"bud-title\">Finances</h2><div class=\"pill\" id=\"syncPill\">Connecting\u2026</div></div>\n<nav class=\"tabs\" id=\"tabs\">\n  <button data-tab=\"today\" class=\"on\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l3 2\"/></svg>Today</button>\n  <button data-tab=\"activity\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"><path d=\"M4 6h16M4 12h16M4 18h10\"/></svg>Activity</button>\n  <button data-tab=\"month\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"><path d=\"M5 20V10M12 20V4M19 20v-7\"/></svg>Month</button>\n  <button data-tab=\"goals\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"><path d=\"M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z\"/></svg>Plan</button>\n  <button data-tab=\"accounts\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"><rect x=\"3\" y=\"6\" width=\"18\" height=\"13\" rx=\"2\"/><path d=\"M3 10h18M7 15h4\"/></svg>Accounts</button>\n</nav>\n<div class=\"wrap\" id=\"view\"></div>\n\n<button class=\"fab\" id=\"fab\" aria-label=\"Add a purchase\">+</button>\n\n\n\n<div class=\"sheet-bg\" id=\"sheetBg\"><div class=\"sheet\" id=\"sheet\"></div></div>\n<div class=\"toast\" id=\"toast\"></div>\n\n";

function boot(host){
  if (host.shadowRoot) return;
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = "<style>" + BUDGET_CSS + "</style>" + BUDGET_HTML;
  // the original app talks to `document`; point it at the shadow root instead
  const document = {
    getElementById: id => root.getElementById(id),
    querySelector: sel => root.querySelector(sel),
    querySelectorAll: sel => root.querySelectorAll(sel),
    addEventListener: (...a) => window.document.addEventListener(...a),
    get hidden(){ return window.document.hidden; }
  };
  let budgetVisible = false;
  function fabState(){
    const fab = root.getElementById("fab");
    if (fab) fab.classList.toggle("show", budgetVisible && !!S);
  }
  try {
    new IntersectionObserver(entries => { budgetVisible = entries.some(e => e.isIntersecting); fabState(); }, { threshold: 0.05 }).observe(host);
  } catch(e){ budgetVisible = true; }

  /* ============================================================
     Paycheck Budget — daily tracker built from the
     "Paycheck and Savings Budget" Google Sheet (11/10/2026).
     All math mirrors the sheet's Check Schedule, Weekly View,
     Monthly View and Dashboard tabs.
     ============================================================ */

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
  function clone(o){ return JSON.parse(JSON.stringify(o)); }
  function migrate(d){
    d.deleted = d.deleted || [];
    d.adjustments = d.adjustments || [];
    d.txns.forEach(t => {
      if (!t.updatedAt) t.updatedAt = "2026-11-10T00:00:00.000Z";
      // anything you entered yourself (not the imported sheet rows) moves balances
      if (!t.createdAt && !/^s\d{1,2}$/.test(t.id)) t.createdAt = t.updatedAt > d.snapshot.at ? t.updatedAt : d.snapshot.at + ".001Z";
    });
    if (!d.budgetHistory){
      const per = {}; d.categories.forEach(c => per[c.name] = +c.perCheck || 0);
      d.budgetHistory = [{ from: d.inputs.firstCheck, per }];
    }
    return d;
  }
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

  /* merge two copies: newer copy wins for settings; purchases and transfers are combined */
  function merge(a, b){
    const newer = (b.savedAt || "") > (a.savedAt || "") ? b : a;
    const out = clone(newer);
    const deleted = new Set([...(a.deleted || []), ...(b.deleted || [])]);
    const tx = new Map();
    [...a.txns, ...b.txns].forEach(t => { const cur = tx.get(t.id); if (!cur || (t.updatedAt || "") > (cur.updatedAt || "")) tx.set(t.id, t); });
    out.txns = [...tx.values()].filter(t => !deleted.has(t.id));
    const mv = new Map(); [...(a.moves || []), ...(b.moves || [])].forEach(m => mv.set(m.id, m));
    out.moves = [...mv.values()].filter(m => !deleted.has(m.id));
    const adj = new Map(); [...(a.adjustments || []), ...(b.adjustments || [])].forEach(x => adj.set(x.id, x));
    out.adjustments = [...adj.values()].filter(x => !deleted.has(x.id)).sort((x, y) => x.at.localeCompare(y.at));
    out.deleted = [...deleted].slice(-2000);
    return migrate(out);
  }
  function sameData(a, b){ return JSON.stringify(a) === JSON.stringify(b); }


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
    return { left: wk.total - sp.total, spent: sp.total, total: wk.total, start: wk.start, end: wk.end, money };
  }


  // where a transaction can come from, and which balance it moves
  const ACCOUNTS = [
    { name: "Chase",              key: "chaseOwed", card: true,  label: "Chase Sapphire" },
    { name: "Capital One",        key: "capOwed",   card: true,  label: "Capital One" },
    { name: "Checking",           key: "checking" },
    { name: "General Savings",    key: "general" },
    { name: "CC Payments bucket", key: "ccBucket" },
    { name: "Rent bucket",        key: "rent" },
    { name: "Vet Visits",         key: "vet" },
    { name: "Vacation",           key: "vacation" },
    { name: "Brokerage",          key: "brokerage" }
  ];
  const ACCT_BY_NAME = Object.fromEntries(ACCOUNTS.map(a => [a.name, a]));
  const ACCT_BY_KEY = Object.fromEntries(ACCOUNTS.map(a => [a.key, a]));
  const NON_SPEND = new Set(["Fixed bill"]);
  const EMOJI = { "Groceries":"🛒","Gas":"⛽","Pets":"🐾","Entertainment":"🎬","Dining":"🍽️","Shopping":"🛍️","Other essentials":"🚇","Buffer":"🛟","Business Start Up":"💼","Subscriptions":"🔁","Personal Care":"🧴","Vacation":"✈️","Other":"•","Fixed bill":"🧾" };
  const BUCKET_LABEL = { checking:"Checking", general:"General Savings", ccBucket:"CC Payments bucket", rent:"Rent bucket", vet:"Vet Visits", vacation:"Vacation", brokerage:"Brokerage" };

  /* ---------- date helpers ---------- */
  const pad = n => String(n).padStart(2, "0");
  const D = s => { const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); };
  const iso = d => d.getFullYear() + "-" + pad(d.getMonth()+1) + "-" + pad(d.getDate());
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const dayDiff = (a, b) => Math.round((D(iso(b)) - D(iso(a))) / 86400000);
  const todayISO = () => iso(new Date());
  const fmtDate = (s, opt) => D(s).toLocaleDateString("en-US", opt || { month: "short", day: "numeric" });
  const money = (n, cents = true) => {
    const neg = n < -0.004; const v = Math.abs(n);
    const s = v.toLocaleString("en-US", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });
    return (neg ? "−$" : "$") + s;
  };
  const r2 = n => Math.round(n * 100) / 100;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

  /* ---------- the plan engine (mirrors Check Schedule tab) ---------- */
  // budgets are versioned by paycheck, so editing them never rewrites past weeks
  function perCheckOn(dateStr){
    const h = [...S.budgetHistory].sort((a, b) => a.from.localeCompare(b.from));
    let cur = h[0]; h.forEach(e => { if (e.from <= dateStr) cur = e; });
    return cur.per;
  }
  function shares(dateStr){
    const per = perCheckOn(dateStr || todayISO());
    const tot = S.categories.reduce((a, c) => a + (+per[c.name] || 0), 0) || 1;
    const m = {}; S.categories.forEach(c => m[c.name] = (+per[c.name] || 0) / tot); return m;
  }
  function currentCheckDate(){
    const I = S.inputs, n = Math.max(0, Math.floor(dayDiff(D(I.firstCheck), D(todayISO())) / I.daysBetween));
    return iso(addDays(D(I.firstCheck), n * I.daysBetween));
  }
  function schedule(count = 30){
    const I = S.inputs, out = [];
    let general = I.start.general, vac = I.start.vacation, vet = I.start.vet, rent = I.start.rent;
    for (let n = 1; n <= count; n++){
      const date = addDays(D(I.firstCheck), I.daysBetween * (n-1));
      const end = addDays(date, I.daysBetween - 1);
      const first = n === 1;
      const checkingAvail = first ? I.start.checking : I.pay.checking;
      if (!first){ general = general * (1 + I.apy / 26) + I.pay.general; rent += I.pay.rent; }
      const vacT = Math.max(0, Math.min(I.vacationPerCheck, I.vacationTarget - vac));
      const vetT = Math.max(0, Math.min(I.vetPerCheck, I.vetTarget - vet));
      vac += vacT; vet += vetT;
      const bothFunded = vacT === 0 && vetT === 0;
      const extra = bothFunded ? Math.max(0, Math.min(I.extraGeneral, I.generalTarget - general)) : 0;
      general += extra;
      let fixed = 0, fixedList = [], oneTime = 0, oneList = [], rentPaid = 0;
      for (let d = new Date(date); d <= end; d = addDays(d, 1)){
        S.bills.forEach(b => { if (+b.day === d.getDate()){ fixed += +b.amount; fixedList.push({ ...b, date: iso(d) }); } });
        S.oneTime.forEach(o => { if (o.date === iso(d)){ oneTime += +o.amount; oneList.push(o); } });
        if (d.getDate() === I.rentDay){ rentPaid += I.rent; }
      }
      rent -= rentPaid;
      const spending = checkingAvail - vacT - vetT - extra - fixed - oneTime;
      const sh = shares(iso(date));
      const cat = {}; Object.keys(sh).forEach(k => cat[k] = spending * sh[k]);
      out.push({ n, date: iso(date), end: iso(end), checkingAvail, vacT, vetT, extra, fixed, fixedList, oneTime, oneList,
        spending, cat, general, vac, vet, rent, rentPaid });
    }
    return out;
  }

  /* ---------- spending queries ---------- */
  const isSpend = t => !NON_SPEND.has(t.category);
  function spentBy(from, to, filter = isSpend){
    const by = {}; let total = 0;
    S.txns.forEach(t => { if (t.date >= from && t.date <= to && filter(t)){ by[t.category] = (by[t.category] || 0) + +t.amount; total += +t.amount; } });
    return { by, total };
  }
  function weekIdxOf(dateStr){ return Math.floor(dayDiff(D(S.inputs.firstCheck), D(dateStr)) / 7); }
  function weekByIdx(idx, sched){
    const start = iso(addDays(D(S.inputs.firstCheck), idx * 7)), end = iso(addDays(D(start), 6));
    const check = idx >= 0 ? sched[Math.floor(idx / 2)] : null;
    const budget = {}; let total = 0;
    if (check) Object.keys(check.cat).forEach(k => { budget[k] = check.cat[k] / 2; total += budget[k]; });
    return { idx, n: idx + 1, start, end, check, budget, total, prePlan: idx < 0 };
  }
  function weekFor(dateStr, sched){ const i = weekIdxOf(dateStr); return i < 0 ? null : weekByIdx(i, sched); }
  function weekBounds(){
    const cur = weekIdxOf(todayISO());
    const earliest = S.txns.reduce((m, t) => t.date < m ? t.date : m, todayISO());
    return { min: Math.min(weekIdxOf(earliest), cur), max: Math.max(cur, 0) + 6, cur };
  }
  function monthBudget(y, m, sched){
    const first = new Date(y, m, 1), last = new Date(y, m + 1, 0);
    const fs = iso(first), ls = iso(last);
    const budget = {}; S.categories.forEach(c => budget[c.name] = 0);
    sched.forEach(c => {
      const a = c.date > fs ? c.date : fs, b = c.end < ls ? c.end : ls;
      if (a > b) return;
      const days = dayDiff(D(a), D(b)) + 1;
      Object.keys(c.cat).forEach(k => budget[k] = (budget[k] || 0) + c.cat[k] * days / S.inputs.daysBetween);
    });
    // before the plan started, the sheet counts actual spending as the budget
    const preEnd = iso(addDays(D(S.inputs.firstCheck), -1));
    if (fs <= preEnd){
      const pre = spentBy(fs, ls < preEnd ? ls : preEnd);
      Object.keys(pre.by).forEach(k => budget[k] = (budget[k] || 0) + pre.by[k]);
    }
    return { start: fs, end: ls, budget };
  }

  /* ---------- live balances (Balance Log snapshot + later activity) ---------- */
  // A transaction is already inside the starting balances if it was part of the
  // imported sheet (no createdAt) or entered before the balances were set.
  function countsTowardBalance(t){ return !!t.createdAt && t.createdAt > S.snapshot.at; }
  function live(){
    const s = S.snapshot, b = { ...s };
    S.txns.forEach(t => {
      if (!countsTowardBalance(t)) return;
      const a = ACCT_BY_NAME[t.account]; if (!a) return;
      b[a.key] += a.card ? +t.amount : -t.amount;     // cards: owed goes up; cash: balance goes down
    });
    S.moves.forEach(mv => {
      if (mv.at <= s.at) return;
      if (mv.from && b[mv.from] != null) b[mv.from] -= +mv.amount;
      if (mv.to && b[mv.to] != null) b[mv.to] += +mv.amount;
    });
    S.adjustments.forEach(x => { if (b[x.key] != null) b[x.key] += +x.delta; });
    Object.keys(b).forEach(k => { if (typeof b[k] === "number") b[k] = r2(b[k]); });
    return b;
  }
  function moveDone(key){ return S.moves.find(m => m.key === key); }
  function toggleMove(key, label, from, to, amount){
    const ex = moveDone(key);
    if (ex){ S.moves = S.moves.filter(m => m !== ex); S.deleted.push(ex.id); }
    else S.moves.push({ id: uid(), key, label, from, to, amount: r2(amount), at: new Date().toISOString(), date: todayISO() });
    save(); render();
  }
  function replaceAll(d){
    const now = new Date().toISOString(), keep = new Set(d.txns.map(t => t.id)), keepM = new Set((d.moves || []).map(m => m.id));
    d.deleted = [...new Set([...(S.deleted || []), ...S.txns.filter(t => !keep.has(t.id)).map(t => t.id), ...S.moves.filter(m => !keepM.has(m.id)).map(m => m.id)])];
    d.txns.forEach(t => t.updatedAt = now);
    S = d;
  }
  function acctOptions(sel){ return ACCOUNTS.map(a => `<option value="${esc(a.name)}" ${a.name === sel ? "selected" : ""}>${esc(a.label || a.name)}</option>`).join(""); }
  function catOptions(sel){ return [...S.categories.map(c => c.name), "Fixed bill"].map(c => `<option value="${esc(c)}" ${c === sel ? "selected" : ""}>${EMOJI[c] || ""} ${esc(c)}</option>`).join(""); }
  function lastUsed(){ try { return JSON.parse(localStorage.getItem(LS_KEY + "-last")) || { account: "Chase", category: "Dining" }; } catch(e){ return { account: "Chase", category: "Dining" }; } }
  function remember(t){ try { localStorage.setItem(LS_KEY + "-last", JSON.stringify({ account: t.account, category: t.category })); } catch(e){} }
  function sheetOpen(){ const bg = document.getElementById("sheetBg"); return bg && bg.classList.contains("open"); }
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

  /* ---------- UI helpers ---------- */
  function barHTML(spent, budget, thick){
    const pct = budget > 0 ? spent / budget : (spent > 0 ? 1.01 : 0);
    const cls = pct > 1 ? "over" : pct > 0.85 ? "near" : "";
    return `<div class="bar ${thick ? "thick" : ""} ${cls}"><i style="width:${Math.min(100, Math.max(0, pct * 100)).toFixed(1)}%"></i></div>`;
  }
  function statusTag(spent, budget){
    if (budget <= 0 && spent > 0) return `<span class="tag bad">▲ Unbudgeted</span>`;
    if (spent > budget + 0.004) return `<span class="tag bad">▲ Over ${money(spent - budget)}</span>`;
    if (budget > 0 && spent / budget > 0.85) return `<span class="tag warn">● Close</span>`;
    return "";
  }
  function catRows(budget, by, opts = {}){
    const names = S.categories.map(c => c.name).filter(n => (budget[n] || 0) > 0.004 || (by[n] || 0) !== 0);
    if (opts.spendOnly){
      const tot = names.reduce((a, n) => a + Math.max(0, by[n] || 0), 0) || 1;
      return names.sort((a, b) => (by[b] || 0) - (by[a] || 0)).map(n => `<div class="item"><div class="row"><div class="cat"><div class="emoji">${EMOJI[n] || "•"}</div><div class="name">${esc(n)}</div></div><div class="num">${money(by[n] || 0)}</div></div>
        <div class="bar"><i style="width:${(Math.max(0, by[n] || 0) / tot * 100).toFixed(1)}%"></i></div></div>`).join("") || `<div class="item muted">No spending.</div>`;
    }
    return names.map(n => {
      const b = budget[n] || 0, s = by[n] || 0, left = b - s;
      return `<div class="item">
        <div class="row"><div class="cat"><div class="emoji">${EMOJI[n] || "•"}</div><div style="min-width:0"><div class="name">${esc(n)}</div>
        <div class="small faint">${money(s)} of ${money(b)}</div></div></div>
        <div style="text-align:right">${statusTag(s, b) || `<div class="num">${money(left)}</div><div class="small faint">left</div>`}</div></div>
        ${barHTML(s, b)}</div>`;
    }).join("");
  }
  function toast(msg){ const t = document.getElementById("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 1800); }

  /* ---------- views ---------- */
  let tab = "today", monthCursor = null, filterCat = "", query = "";

  let weekOffset = 0, dayPick = null;
  function viewToday(){
    const sched = schedule(60), today = todayISO(), now = D(today);
    const bounds = weekBounds();
    const idx = Math.max(bounds.min, Math.min(bounds.max, bounds.cur + weekOffset));
    weekOffset = idx - bounds.cur;
    const wk = weekByIdx(idx, sched);
    const isCur = weekOffset === 0, isPast = wk.end < today, isFuture = wk.start > today;
    const sp = spentBy(wk.start, wk.end), left = wk.total - sp.total;
    const dailyBase = wk.total / 7;
    const cardSpend = spentBy(wk.start, wk.end, t => isSpend(t) && t.account !== "Checking").total;
    const ccKey = "cc-week-" + wk.n, ccDone = wk.prePlan ? null : moveDone(ccKey);
    const rangeLbl = `${fmtDate(wk.start)} – ${fmtDate(wk.end)}`;
    const weekName = wk.prePlan ? "Before your plan" : `Week ${wk.n}`;

    // daily chart
    const days = []; let maxV = Math.max(dailyBase, 1);
    for (let i = 0; i < 7; i++){ const d = iso(addDays(D(wk.start), i)); const v = spentBy(d, d).total; days.push({ d, v }); maxV = Math.max(maxV, v); }
    const PLOT = 88;
    const chart = `<div class="chart" id="dayChart">${dailyBase > 0 ? `<div class="cap" style="bottom:${18 + dailyBase / maxV * PLOT}px"></div>` : ""}${days.map(x => `<div class="col ${dailyBase > 0 && x.v > dailyBase ? "over" : ""} ${x.d === today ? "today" : ""}" data-tip="${fmtDate(x.d, { weekday:"long", month:"short", day:"numeric" })}: ${money(x.v)} spent${dailyBase > 0 ? " of " + money(dailyBase) : ""}">
        <b style="height:${Math.max(2, Math.max(0, x.v) / maxV * PLOT)}px"></b><span>${"SMTWTFS"[D(x.d).getDay()]}</span></div>`).join("")}
        </div><div class="tip" id="chartTip">${dailyBase > 0 ? `Dashed line = ${money(dailyBase)} daily budget. ` : ""}Tap a day for details.</div>`;

    const nav = `<div class="weeknav">
      <button id="wPrev" aria-label="Previous week" ${idx <= bounds.min ? "disabled" : ""}>‹</button>
      <div class="wk-mid"><div class="wk-title">${weekName}${isCur ? ' <span class="tag good">This week</span>' : ""}</div><div class="small muted">${rangeLbl}${wk.check ? ` · paycheck #${wk.check.n}` : ""}</div></div>
      <button id="wNext" aria-label="Next week" ${idx >= bounds.max ? "disabled" : ""}>›</button>
    </div>${!isCur ? `<button class="btn ghost sm" id="wToday" style="width:100%;margin:-4px 0 12px">Back to this week</button>` : ""}`;

    let top;
    if (isCur){
      const daysLeft = dayDiff(now, D(wk.end)) + 1;
      const spentBeforeToday = spentBy(wk.start, iso(addDays(now, -1))).total;
      const todaySpent = spentBy(today, today).total;
      const perDayLeft = Math.max(0, (wk.total - spentBeforeToday) / daysLeft);
      const nextCheck = sched.find(c => c.date > today);
      const toPay = nextCheck ? dayDiff(now, D(nextCheck.date)) : null;
      top = `<h1>${now.toLocaleDateString("en-US", { weekday: "long" })}</h1>
      <p class="sub">${fmtDate(today, { month: "long", day: "numeric" })}${toPay != null ? ` · payday in ${toPay} day${toPay === 1 ? "" : "s"}` : ""}</p>
      ${nav}
      <div class="card hero"><div class="lbl">Left to spend this week</div>
        <div class="big" style="color:${left < 0 ? "var(--bad)" : "var(--ink)"}">${money(left)}</div>
        ${barHTML(sp.total, wk.total, true)}
        <div class="row small muted" style="margin-top:8px"><span>${money(sp.total)} spent</span><span>of ${money(wk.total)} weekly cap</span></div></div>
      <div class="stats">
        <div class="stat"><div class="v" style="color:${todaySpent > perDayLeft ? "var(--bad)" : "inherit"}">${money(todaySpent)}</div><div class="k">Spent today</div></div>
        <div class="stat"><div class="v">${money(Math.max(0, perDayLeft - todaySpent))}</div><div class="k">Still OK today<br><span class="faint">${money(perDayLeft)}/day for ${daysLeft} day${daysLeft === 1 ? "" : "s"}</span></div></div>
      </div>`;
    } else {
      const biggest = days.reduce((m, x) => x.v > m.v ? x : m, days[0]);
      const elapsed = isPast ? 7 : Math.max(1, dayDiff(D(wk.start), now) + 1);
      top = `<h1>${isPast ? "Past week" : isFuture ? "Upcoming week" : "Week"}</h1>
      <p class="sub">Saved spending and budget for ${rangeLbl}</p>
      ${nav}
      <div class="card hero"><div class="lbl">${wk.prePlan ? "Spent this week" : isFuture ? "Budget for this week" : left >= 0 ? "Finished under budget by" : "Finished over budget by"}</div>
        <div class="big" style="color:${!wk.prePlan && !isFuture && left < 0 ? "var(--bad)" : "var(--ink)"}">${wk.prePlan ? money(sp.total) : isFuture ? money(wk.total) : money(Math.abs(left))}</div>
        ${wk.total > 0 ? barHTML(sp.total, wk.total, true) : ""}
        <div class="row small muted" style="margin-top:8px"><span>${money(sp.total)} spent</span><span>${wk.total > 0 ? "of " + money(wk.total) + " weekly cap" : "no budget yet"}</span></div></div>
      ${isFuture ? "" : `<div class="stats">
        <div class="stat"><div class="v">${money(sp.total / elapsed)}</div><div class="k">Daily average</div></div>
        <div class="stat"><div class="v">${money(biggest.v)}</div><div class="k">Biggest day<br><span class="faint">${fmtDate(biggest.d, { weekday:"long" })}</span></div></div></div>`}`;
    }

    // upcoming bills (current week only)
    let upcomingHTML = "";
    if (isCur){
      const upcoming = [];
      for (let i = 0; i <= 14; i++){
        const d = addDays(now, i);
        S.bills.forEach(b => { if (+b.day === d.getDate()) upcoming.push({ name: b.name, amount: +b.amount, date: iso(d), kind: "Bill" }); });
        S.oneTime.forEach(o => { if (o.date === iso(d)) upcoming.push({ name: o.name, amount: +o.amount, date: o.date, kind: "One-time" }); });
        S.cards.forEach(c => { if (c.dueDay === d.getDate()) upcoming.push({ name: c.name + " payment due", amount: null, date: iso(d), kind: "Card" }); });
        if (d.getDate() === S.inputs.rentDay) upcoming.push({ name: "Rent (from Rent bucket)", amount: S.inputs.rent, date: iso(d), kind: "Rent" });
      }
      upcomingHTML = `<h2>Coming up (next 2 weeks)</h2>
      <div class="list">${upcoming.length ? upcoming.map(u => `<div class="item row"><div><div class="name">${esc(u.name)}</div><div class="small faint">${fmtDate(u.date, { weekday:"short", month:"short", day:"numeric" })} · ${u.kind}</div></div><div class="num">${u.amount != null ? money(u.amount) : ""}</div></div>`).join("") : `<div class="item muted">Nothing due.</div>`}</div>`;
    }

    const weekTx = S.txns.filter(t => t.date >= wk.start && t.date <= wk.end).sort((a, b) => b.date.localeCompare(a.date));
    if (!dayPick || dayPick < wk.start || dayPick > wk.end) dayPick = (today >= wk.start && today <= wk.end) ? today : "all";
    const shownTx = dayPick === "all" ? weekTx : weekTx.filter(t => t.date === dayPick);
    const formDate = dayPick === "all" ? ((today >= wk.start && today <= wk.end) ? today : wk.start) : dayPick;
    const lu = lastUsed();
    const dayChips = `<div class="daychips"><button class="dchip ${dayPick === "all" ? "on" : ""}" data-day="all"><b>All</b><span>${money(sp.total, false)}</span></button>${days.map(x => `<button class="dchip ${dayPick === x.d ? "on" : ""} ${x.d === today ? "is-today" : ""}" data-day="${x.d}"><b>${D(x.d).toLocaleDateString("en-US", { weekday: "short" })} ${D(x.d).getDate()}</b><span>${x.v ? money(x.v, false) : "–"}</span></button>`).join("")}</div>`;
    const quickAdd = `<form class="card quick" id="quickAdd" autocomplete="off">
      <div class="small muted" style="margin-bottom:8px">Add to <b>${fmtDate(formDate, { weekday: "long", month: "short", day: "numeric" })}</b></div>
      <div class="qrow"><input id="qAmt" inputmode="decimal" placeholder="$0.00" aria-label="Amount"><input id="qDesc" placeholder="What / where" aria-label="Description"></div>
      <div class="qrow"><label class="qsel"><span>Category</span><select id="qCat">${catOptions(lu.category)}</select></label><label class="qsel"><span>Paid from</span><select id="qAcct">${acctOptions(lu.account)}</select></label></div>
      <div class="qrow" style="align-items:center"><label class="qref"><input type="checkbox" id="qRefund"> Refund</label><button class="btn sm" type="submit" style="flex:1">Add transaction</button></div>
      <input type="hidden" id="qDate" value="${formDate}">
    </form>`;
    const todo = wk.prePlan || isFuture ? "" : `<h2>To-do</h2><div class="list">
      ${wk.idx % 2 === 0 || isCur ? transferChecks(wk.check) : ""}
      <div class="item"><div class="check ${ccDone ? "done" : ""}" data-move="${ccKey}" data-label="Week ${wk.n} card spending to CC Payments" data-from="checking" data-to="ccBucket" data-amt="${r2(Math.max(0, cardSpend))}">
        <div class="box">${ccDone ? "✓" : ""}</div><div style="flex:1;min-width:0"><div class="name">Move week ${wk.n} card spending to CC Payments</div>
        <div class="small faint">${ccDone ? "Done · " + money(ccDone.amount) : money(cardSpend) + (isPast ? " card spending this week" : " so far · do this at the end of the week")}</div></div></div></div></div>`;

    return `${top}
    <h2>Daily log</h2>
    ${dayChips}
    ${quickAdd}
    <div class="list">${shownTx.length ? shownTx.map(txnRow).join("") : `<div class="item muted">Nothing logged ${dayPick === "all" ? "this week" : "on " + fmtDate(dayPick, { weekday: "long" })} yet.</div>`}</div>
    <h2>By day</h2>
    <div class="card" style="position:relative">${chart}</div>
    <h2>By category</h2>
    <div class="list">${wk.prePlan ? catRows({}, sp.by, { spendOnly: true }) : catRows(wk.budget, sp.by)}</div>
    ${todo}
    ${upcomingHTML}`;
  }
  function transferChecks(check){
    const items = [];
    if (check.vacT > 0) items.push({ key: "vac-" + check.n, label: `Move ${money(check.vacT)} to Vacation`, from: "checking", to: "vacation", amt: check.vacT });
    if (check.vetT > 0) items.push({ key: "vet-" + check.n, label: `Move ${money(check.vetT)} to Vet Visits`, from: "checking", to: "vet", amt: check.vetT });
    if (check.extra > 0) items.push({ key: "extra-" + check.n, label: `Move ${money(check.extra)} extra to General Savings`, from: "checking", to: "general", amt: check.extra });
    return items.map(i => { const d = moveDone(i.key); return `<div class="item"><div class="check ${d ? "done" : ""}" data-move="${i.key}" data-label="${esc(i.label)}" data-from="${i.from}" data-to="${i.to}" data-amt="${r2(i.amt)}">
      <div class="box">${d ? "✓" : ""}</div><div style="flex:1"><div class="name">${i.label}</div><div class="small faint">Paycheck #${check.n} (${fmtDate(check.date)}) transfer${d ? " · done " + fmtDate(d.date) : ""}</div></div></div></div>`; }).join("");
  }
  function recentList(n){
    const list = [...S.txns].sort((a, b) => b.date.localeCompare(a.date)).slice(0, n);
    return `<h2>Recent</h2><div class="list">${list.map(txnRow).join("")}</div>`;
  }
  function txnRow(t){
    return `<div class="item tap row" data-edit="${t.id}"><div class="cat"><div class="emoji">${EMOJI[t.category] || "•"}</div><div style="min-width:0"><div class="name">${esc(t.desc || t.category)}</div><div class="small faint">${esc(t.category)} · ${esc(t.account)}${t.note ? " · " + esc(t.note) : ""}</div></div></div><div class="num ${t.amount < 0 ? "neg" : ""}">${t.amount < 0 ? "+" + money(-t.amount) : money(t.amount)}</div></div>`;
  }

  function viewActivity(){
    let list = [...S.txns].sort((a, b) => b.date.localeCompare(a.date) || 0);
    if (filterCat) list = list.filter(t => t.category === filterCat);
    if (query){ const q = query.toLowerCase(); list = list.filter(t => (t.desc + " " + t.note + " " + t.category + " " + t.account).toLowerCase().includes(q)); }
    const groups = {}; list.forEach(t => (groups[t.date] = groups[t.date] || []).push(t));
    const cats = ["", ...S.categories.map(c => c.name), "Fixed bill"];
    return `<h1>Activity</h1><p class="sub">${S.txns.length} transactions · tap one to edit</p>
    <input class="search" id="q" placeholder="Search" value="${esc(query)}" type="search">
    <div class="chips">${cats.map(c => `<button class="chip ${filterCat === c ? "on" : ""}" data-filter="${esc(c)}">${c ? (EMOJI[c] || "") + " " + esc(c) : "All"}</button>`).join("")}</div>
    ${Object.keys(groups).length ? Object.keys(groups).map(d => {
      const tot = groups[d].filter(isSpend).reduce((a, t) => a + +t.amount, 0);
      return `<div class="dayhead"><span>${fmtDate(d, { weekday:"long", month:"short", day:"numeric" })}</span><span>${money(tot)}</span></div><div class="list">${groups[d].map(txnRow).join("")}</div>`;
    }).join("") : `<div class="card muted">No matching transactions.</div>`}`;
  }

  function viewMonth(){
    const sched = schedule();
    const now = new Date();
    if (!monthCursor) monthCursor = { y: now.getFullYear(), m: now.getMonth() };
    const { y, m } = monthCursor;
    const mb = monthBudget(y, m, sched), sp = spentBy(mb.start, mb.end);
    const total = Object.values(mb.budget).reduce((a, b) => a + b, 0);
    const fixed = spentBy(mb.start, mb.end, t => t.category === "Fixed bill").total;
    const label = new Date(y, m, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const daysIn = new Date(y, m + 1, 0).getDate();
    const isCur = y === now.getFullYear() && m === now.getMonth();
    const elapsed = isCur ? now.getDate() : (new Date(y, m, 1) < now ? daysIn : 0);
    return `<div class="monthnav"><button id="mPrev" aria-label="Previous month">‹</button><h1 style="margin:0">${label}</h1><button id="mNext" aria-label="Next month">›</button></div>
    <div class="card hero">
      <div class="lbl">Spent this month</div>
      <div class="big">${money(sp.total)}</div>
      ${barHTML(sp.total, total, true)}
      <div class="row small muted" style="margin-top:8px"><span>${money(total - sp.total)} left</span><span>of ${money(total)} budget</span></div>
      ${elapsed ? `<div class="small faint" style="margin-top:6px">Day ${elapsed} of ${daysIn} · ${Math.round(elapsed / daysIn * 100)}% of the month gone, ${total ? Math.round(sp.total / total * 100) : 0}% of budget used</div>` : ""}
    </div>
    <div class="stats"><div class="stat"><div class="v">${money(fixed)}</div><div class="k">Fixed bills logged<br><span class="faint">rent, loan, Bark Box</span></div></div>
    <div class="stat"><div class="v">${money(sp.total + fixed)}</div><div class="k">Everything out<br><span class="faint">spending + bills</span></div></div></div>
    <h2>By category</h2><div class="list">${catRows(mb.budget, sp.by)}</div>
    <p class="small faint" style="margin:0 4px">Budgets are pro-rated from each paycheck's spending cash, like the sheet's Monthly View. Days before ${fmtDate(S.inputs.firstCheck)} use actual spending as the budget.</p>`;
  }

  function viewGoals(){
    const sched = schedule(60), today = todayISO(), L = live(), I = S.inputs;
    const cur = [...sched].reverse().find(c => c.date <= today) || sched[0];
    const goal = (name, current, target, key, note) => {
      const hit = sched.find(c => c[key] >= target - 0.005);
      const pct = Math.min(1, current / target);
      return `<div class="card"><div class="row"><div><div class="name" style="font-size:17px">${name}</div><div class="small faint">${note || ""}</div></div><div style="text-align:right"><div class="num">${Math.round(pct * 100)}%</div></div></div>
        <div class="bar thick"><i style="width:${(pct * 100).toFixed(1)}%;background:var(--goodbar)"></i></div>
        <div class="row small muted" style="margin-top:8px"><span>${money(current)} of ${money(target, false)}</span><span>${current >= target ? "Reached 🎉" : hit ? "On pace for " + fmtDate(hit.date, { month: "short", day: "numeric", year: "numeric" }) : "Past 2028"}</span></div></div>`;
    };
    const p = cur;
    return `<h1>Plan</h1><p class="sub">Paycheck #${p.n} · ${fmtDate(p.date)} to ${fmtDate(p.end)}</p>
    <h2>Savings goals</h2>
    ${goal("General Savings", L.general, I.generalTarget, "general", `HYSA · ${(I.apy * 100).toFixed(2)}% APY`)}
    ${goal("Vacation", L.vacation, I.vacationTarget, "vac", "Deadline " + fmtDate(I.vacationDeadline, { month:"short", day:"numeric", year:"numeric" }))}
    ${goal("Vet Visits", L.vet, I.vetTarget, "vet")}

    <h2>This paycheck's transfers</h2>
    <div class="list">${transferChecks(p) || `<div class="item muted">No transfers this check — goals funded.</div>`}</div>

    <h2>Where this paycheck goes</h2>
    <div class="card"><table class="mini">
      <tr><td>Rent bucket (direct deposit)</td><td>${money(I.pay.rent)}</td></tr>
      <tr><td>General Savings (direct deposit)</td><td>${money(I.pay.general)}</td></tr>
      <tr><td>Checking (direct deposit)</td><td>${money(I.pay.checking)}</td></tr>
      <tr><td class="faint">Unallocated (rounding)</td><td class="faint">${money(I.pay.total - I.pay.rent - I.pay.general - I.pay.checking)}</td></tr>
      <tr><td><b>Total biweekly pay</b></td><td><b>${money(I.pay.total)}</b></td></tr>
    </table></div>
    <div class="card"><table class="mini">
      <tr><td>Checking on payday</td><td>${money(p.checkingAvail)}</td></tr>
      <tr><td>Less Vacation transfer</td><td>${money(-p.vacT)}</td></tr>
      <tr><td>Less Vet transfer</td><td>${money(-p.vetT)}</td></tr>
      <tr><td>Less extra to General</td><td>${money(-p.extra)}</td></tr>
      <tr><td>Less fixed bills ${p.fixedList.map(b => esc(b.name)).join(", ") ? `<span class="faint">(${p.fixedList.map(b => esc(b.name)).join(", ")})</span>` : ""}</td><td>${money(-p.fixed)}</td></tr>
      <tr><td>Less one-time items</td><td>${money(-p.oneTime)}</td></tr>
      <tr><td><b>Cash to spend this cycle</b></td><td><b>${money(p.spending)}</b></td></tr>
      <tr><td>Weekly cap</td><td>${money(p.spending / 2)}</td></tr>
    </table></div>

    <h2>Next paychecks</h2>
    <div class="list">${sched.filter(c => c.date > today).slice(0, 6).map(c => `<div class="item"><div class="row"><div><div class="name">#${c.n} · ${fmtDate(c.date, { weekday:"short", month:"short", day:"numeric" })}</div>
      <div class="small faint">${[c.vacT ? "Vacation " + money(c.vacT, false) : "", c.vetT ? "Vet " + money(c.vetT, false) : "", c.extra ? "Extra General " + money(c.extra) : "", c.fixed ? "Bills " + money(c.fixed) : "", c.oneTime ? "One-time " + money(c.oneTime) : "", c.rentPaid ? "Rent from bucket" : ""].filter(Boolean).join(" · ")}</div></div>
      <div style="text-align:right"><div class="num">${money(c.spending / 2)}</div><div class="small faint">/week</div></div></div></div>`).join("")}</div>`;
  }

  function viewAccounts(){
    const L = live();
    const cash = L.checking + L.general + L.ccBucket + L.rent + L.vet + L.vacation + L.brokerage;
    const owed = L.chaseOwed + L.capOwed;
    const acct = (k, v, note) => { const a = ACCT_BY_NAME[k] || ACCOUNTS.find(x => x.label === k); return `<div class="item row tap" data-adjust="${a ? a.key : ""}"><div><div class="name">${k}</div>${note ? `<div class="small faint">${note}</div>` : ""}</div><div class="row" style="gap:8px"><div class="num">${money(v)}</div><span class="faint">›</span></div></div>`; };
    const today = todayISO();
    const plannedFromChecking = S.oneTime.filter(o => /capital one|chase/i.test(o.name) && o.date >= today).reduce((a, o) => a + +o.amount, 0);
    const ccCover = L.ccBucket + plannedFromChecking - owed;
    return `<h1>Accounts</h1><p class="sub">Starting balances from ${fmtDate(S.snapshot.date, { month:"short", day:"numeric", year:"numeric" })}, updated by every transaction you enter. Tap an account to adjust it.</p>
    <div class="stats"><div class="stat"><div class="v">${money(cash - owed)}</div><div class="k">Net worth</div></div>
    <div class="stat"><div class="v" style="color:${ccCover < 0 ? "var(--bad)" : "var(--good)"}">${ccCover < 0 ? money(ccCover) : "Covered"}</div><div class="k">CC bucket vs cards owed${plannedFromChecking ? `<br><span class="faint">counts ${money(plannedFromChecking)} card payment planned from checking</span>` : ""}</div></div></div>
    <h2>Cash</h2><div class="list">
      ${acct("Checking", L.checking)}
      ${acct("General Savings", L.general, "HYSA")}
      ${acct("CC Payments bucket", L.ccBucket, "Pays the cards each month")}
      ${acct("Rent bucket", L.rent, L.rent >= S.inputs.rent ? "Covers next month's rent" : "Short of one month's rent")}
      ${acct("Vet Visits", L.vet)}
      ${acct("Vacation", L.vacation)}
      ${acct("Brokerage", L.brokerage)}
    </div>
    <h2>Cards owed</h2><div class="list">
      ${acct("Chase Sapphire", L.chaseOwed, "Due the 24th")}
      ${acct("Capital One", L.capOwed, "Due the 2nd")}
    </div>
    <h2>Manual adjustments</h2>
    <div class="list">${S.adjustments.length ? [...S.adjustments].reverse().map(x => `<div class="item row tap" data-adjedit="${x.id}"><div style="min-width:0"><div class="name">${esc((ACCT_BY_KEY[x.key] || {}).label || (ACCT_BY_KEY[x.key] || {}).name || x.key)}</div><div class="small faint">${fmtDate(x.date, { month:"short", day:"numeric", year:"numeric" })}${x.note ? " · " + esc(x.note) : ""}</div></div><div class="num ${x.delta >= 0 ? "" : ""}">${x.delta >= 0 ? "+" : ""}${money(x.delta)}</div></div>`).join("") : `<div class="item muted small">None yet. Tap any account above to correct its balance.</div>`}</div>
    <button class="btn ghost" id="addAdj">+ Adjust a balance</button>

    <h2>Fixed bills</h2><div class="list">
      ${S.bills.map((b, i) => `<div class="item row tap" data-bill="${i}"><div><div class="name">${esc(b.name)}</div><div class="small faint">Day ${b.day} each month</div></div><div class="num">${money(+b.amount)}</div></div>`).join("")}
      ${S.oneTime.map((o, i) => `<div class="item row tap" data-one="${i}"><div><div class="name">${esc(o.name)}</div><div class="small faint">One-time · ${fmtDate(o.date, { month:"short", day:"numeric", year:"numeric" })}</div></div><div class="num">${money(+o.amount)}</div></div>`).join("")}
    </div>
    <div class="row" style="gap:8px"><button class="btn ghost" id="addBill">+ Monthly bill</button><button class="btn ghost" id="addOne">+ One-time item</button></div>

    <h2>Budget per paycheck</h2>
    <div class="list">${S.categories.map((c, i) => `<div class="item row"><div class="cat"><div class="emoji">${EMOJI[c.name] || "•"}</div><div style="min-width:0"><div class="name">${esc(c.name)}</div>${c.note ? `<div class="small faint">${esc(c.note)}</div>` : ""}</div></div>
      <input data-percheck="${i}" inputmode="decimal" value="${c.perCheck}" style="width:80px;text-align:right;border:0;background:var(--card2);border-radius:8px;padding:6px 8px"></div>`).join("")}</div>
    <p class="small faint" style="margin:0 4px 12px">These set each category's share of the spending cash (same as the Inputs tab). Changes apply from the current paycheck on; past weeks keep the budget they had. Total: ${money(S.categories.reduce((a, c) => a + +c.perCheck, 0), false)} per check.</p>

    <h2>Backup</h2>
    <div class="row" style="gap:8px"><button class="btn ghost" id="exportBtn">Copy backup</button><button class="btn ghost" id="importBtn">Restore</button></div>
    <div style="height:8px"></div>
    <button class="btn danger" id="resetBtn">Reset to imported starting data</button>
    <p class="sync">Every change saves instantly on this phone and to your Ultimate Dashboard account, and shows up on your other devices.</p>`;
  }

  /* ---------- sheets (modals) ---------- */
  function openSheet(html, bind){
    const bg = document.getElementById("sheetBg"), sh = document.getElementById("sheet");
    sh.innerHTML = `<div class="grab"></div>` + html; bg.classList.add("open");
    if (bind) bind(sh);
  }
  function closeSheet(){ document.getElementById("sheetBg").classList.remove("open"); }

  function txnSheet(id){
    const t = id ? S.txns.find(x => x.id === id) : { date: todayISO(), account: lastUsed().account, category: lastUsed().category, amount: "", desc: "", note: "" };
    const isRefund = t.amount !== "" && +t.amount < 0;
    const cats = [...S.categories.map(c => c.name), "Fixed bill"];
    let st = { account: t.account, category: t.category, refund: isRefund };
    openSheet(`
      <div class="row" style="margin-bottom:10px"><button class="btn sm ghost" id="cancel">Cancel</button><b>${id ? "Edit" : "New"} ${st.refund ? "refund" : "purchase"}</b><button class="btn sm" id="saveT">Save</button></div>
      <div class="field"><label>Amount</label><input class="amount-in" id="amt" inputmode="decimal" placeholder="0.00" value="${t.amount === "" ? "" : Math.abs(t.amount)}"></div>
      <div class="seg" id="refundSeg" style="margin-bottom:10px"><button data-r="0" class="${!st.refund ? "on" : ""}">Purchase</button><button data-r="1" class="${st.refund ? "on" : ""}">Refund</button></div>
      <div class="field"><label>Description</label><input id="desc" placeholder="Where / what" value="${esc(t.desc)}"></div>
      <div class="field"><label>Paid from</label><select id="acctSel">${acctOptions(st.account)}</select></div>
      <div class="chips" id="catChips">${cats.map(c => `<button class="chip ${st.category === c ? "on" : ""}" data-c="${esc(c)}">${EMOJI[c] || ""} ${esc(c)}</button>`).join("")}</div>
      <div class="field"><label>Date</label><input id="date" type="date" value="${t.date}"></div>
      <div class="field"><label>Note (optional)</label><input id="note" value="${esc(t.note)}"></div>
      ${id ? `<button class="btn danger" id="delT">Delete transaction</button>` : ""}
    `, sh => {
      sh.querySelector("#cancel").onclick = closeSheet;
      sh.querySelector("#acctSel").onchange = e => { st.account = e.target.value; };
      sh.querySelectorAll("#refundSeg button").forEach(b => b.onclick = () => { st.refund = b.dataset.r === "1"; sh.querySelectorAll("#refundSeg button").forEach(x => x.classList.toggle("on", x === b)); });
      sh.querySelectorAll("#catChips .chip").forEach(b => b.onclick = () => { st.category = b.dataset.c; sh.querySelectorAll("#catChips .chip").forEach(x => x.classList.toggle("on", x === b)); });
      sh.querySelector("#saveT").onclick = () => {
        const a = parseFloat(String(sh.querySelector("#amt").value).replace(/[$,\s]/g, ""));
        if (!(a > 0)){ sh.querySelector("#amt").focus(); toast("Enter an amount"); return; }
        const rec = { id: id || uid(), date: sh.querySelector("#date").value || todayISO(), account: st.account, category: st.category,
          amount: r2(st.refund ? -a : a), desc: sh.querySelector("#desc").value.trim(), note: sh.querySelector("#note").value.trim(), updatedAt: new Date().toISOString(), createdAt: id ? t.createdAt : new Date().toISOString() };
        if (!rec.createdAt) delete rec.createdAt;
        remember(rec);
        if (id) S.txns = S.txns.map(x => x.id === id ? rec : x); else S.txns.push(rec);
        save(); closeSheet(); render(); toast(id ? "Updated" : `Logged ${money(rec.amount)} · ${rec.category}`);
      };
      const del = sh.querySelector("#delT");
      if (del) del.onclick = () => {
        if (del.dataset.confirm){ S.txns = S.txns.filter(x => x.id !== id); S.deleted.push(id); save(); closeSheet(); render(); toast("Deleted"); }
        else { del.dataset.confirm = "1"; del.textContent = "Tap again to delete"; }
      };
      if (!id) setTimeout(() => sh.querySelector("#amt").focus(), 250);
    });
  }

  function adjustSheet(key, adjId){
    const L = live();
    const ex = adjId ? S.adjustments.find(x => x.id === adjId) : null;
    let k = ex ? ex.key : (key || "checking");
    let mode = ex ? "amount" : "balance";
    const label = kk => (ACCT_BY_KEY[kk].label || ACCT_BY_KEY[kk].name) + (ACCT_BY_KEY[kk].card ? " (owed)" : "");
    openSheet(`<div class="row" style="margin-bottom:10px"><button class="btn sm ghost" id="cancel">Cancel</button><b>${ex ? "Edit adjustment" : "Adjust balance"}</b><button class="btn sm" id="saveA">Save</button></div>
      <div class="field"><label>Account</label><select id="aKey">${ACCOUNTS.map(a => `<option value="${a.key}" ${a.key === k ? "selected" : ""}>${label(a.key)}</option>`).join("")}</select></div>
      <div class="card small" style="padding:12px 14px"><div class="row"><span class="muted">Current balance</span><b class="num" id="aCur"></b></div></div>
      ${ex ? "" : `<div class="seg" id="aMode" style="margin-bottom:10px"><button data-m="balance" class="on">Set new balance</button><button data-m="amount">Add / subtract</button></div>`}
      <div class="field"><label id="aLbl"></label><input class="amount-in" id="aVal" inputmode="decimal" placeholder="0.00" value="${ex ? ex.delta : ""}"></div>
      <div class="small faint" id="aPreview" style="margin:-4px 4px 10px"></div>
      <div class="field"><label>Note (optional)</label><input id="aNote" placeholder="Why? e.g. interest, fee, cash withdrawal" value="${ex ? esc(ex.note) : ""}"></div>
      ${ex ? `<button class="btn danger" id="delA">Delete adjustment</button>` : ""}`,
    sh => {
      const cur = () => ex ? L[k] - ex.delta : L[k];
      const parse = () => { const v = parseFloat(String(sh.querySelector("#aVal").value).replace(/[$,\s]/g, "")); return isNaN(v) ? null : v; };
      const delta = () => { const v = parse(); if (v == null) return null; return mode === "balance" ? r2(v - cur()) : r2(v); };
      const upd = () => {
        sh.querySelector("#aCur").textContent = money(cur());
        sh.querySelector("#aLbl").textContent = mode === "balance" ? "New balance" : "Amount to add (use − to subtract)";
        const d = delta();
        sh.querySelector("#aPreview").textContent = d == null ? "" : `${d >= 0 ? "+" : ""}${money(d)} → new balance ${money(cur() + d)}`;
      };
      sh.querySelector("#aKey").onchange = e => { k = e.target.value; upd(); };
      sh.querySelector("#aVal").oninput = upd;
      sh.querySelectorAll("#aMode button").forEach(b => b.onclick = () => { mode = b.dataset.m; sh.querySelectorAll("#aMode button").forEach(x => x.classList.toggle("on", x === b)); upd(); });
      sh.querySelector("#cancel").onclick = closeSheet;
      sh.querySelector("#saveA").onclick = () => {
        const d = delta();
        if (d == null){ toast("Enter an amount"); sh.querySelector("#aVal").focus(); return; }
        if (d === 0 && !ex){ toast("No change to save"); return; }
        const rec = { id: ex ? ex.id : uid(), key: k, delta: d, note: sh.querySelector("#aNote").value.trim(), date: ex ? ex.date : todayISO(), at: ex ? ex.at : new Date().toISOString() };
        if (ex) S.adjustments = S.adjustments.map(x => x.id === ex.id ? rec : x); else S.adjustments.push(rec);
        save(); closeSheet(); render(); toast(`${label(k)} ${d >= 0 ? "+" : ""}${money(d)}`);
      };
      const del = sh.querySelector("#delA");
      if (del) del.onclick = () => {
        if (del.dataset.confirm){ S.adjustments = S.adjustments.filter(x => x.id !== ex.id); S.deleted.push(ex.id); save(); closeSheet(); render(); toast("Adjustment removed"); }
        else { del.dataset.confirm = "1"; del.textContent = "Tap again to delete"; }
      };
      upd();
      if (!ex) setTimeout(() => sh.querySelector("#aVal").focus(), 250);
    });
  }

  function billSheet(kind, idx){
    const isOne = kind === "one";
    const arr = isOne ? S.oneTime : S.bills;
    const b = idx != null ? arr[idx] : (isOne ? { name: "", amount: "", date: todayISO() } : { name: "", amount: "", day: 1 });
    openSheet(`<div class="row" style="margin-bottom:10px"><button class="btn sm ghost" id="cancel">Cancel</button><b>${isOne ? "One-time item" : "Monthly bill"}</b><button class="btn sm" id="saveBill">Save</button></div>
      <div class="field"><label>Name</label><input id="bn" value="${esc(b.name)}"></div>
      <div class="field"><label>Amount</label><input id="ba" inputmode="decimal" value="${b.amount}"></div>
      ${isOne ? `<div class="field"><label>Due date</label><input id="bd" type="date" value="${b.date}"></div>` : `<div class="field"><label>Day of month charged</label><input id="bd" inputmode="numeric" value="${b.day}"></div>`}
      ${idx != null ? `<button class="btn danger" id="delBill">Delete</button>` : ""}`,
    sh => {
      sh.querySelector("#cancel").onclick = closeSheet;
      sh.querySelector("#saveBill").onclick = () => {
        const rec = { name: sh.querySelector("#bn").value.trim() || "Bill", amount: r2(parseFloat(sh.querySelector("#ba").value) || 0) };
        if (isOne) rec.date = sh.querySelector("#bd").value; else rec.day = Math.min(31, Math.max(1, parseInt(sh.querySelector("#bd").value) || 1));
        if (idx != null) arr[idx] = rec; else arr.push(rec);
        save(); closeSheet(); render(); toast("Saved — plan recalculated");
      };
      const del = sh.querySelector("#delBill");
      if (del) del.onclick = () => { arr.splice(idx, 1); save(); closeSheet(); render(); };
    });
  }

  function importSheet(){
    openSheet(`<div class="row" style="margin-bottom:10px"><button class="btn sm ghost" id="cancel">Cancel</button><b>Restore backup</b><button class="btn sm" id="doImp">Restore</button></div>
      <p class="small muted" style="margin:0 4px 10px">Paste a backup you copied earlier.</p><textarea class="json" id="impTxt"></textarea>`,
    sh => {
      sh.querySelector("#cancel").onclick = closeSheet;
      sh.querySelector("#doImp").onclick = () => {
        try { const d = JSON.parse(sh.querySelector("#impTxt").value); if (d.version !== 1 || !Array.isArray(d.txns)) throw 0; const keep = S && S.origin; replaceAll(migrate(d)); if (!S.origin) S.origin = keep || (() => { const o = clone(S); delete o.origin; return o; })(); save(); closeSheet(); render(); toast("Restored"); }
        catch(e){ toast("That doesn't look like a backup"); }
      };
    });
  }

  /* ---------- render & events ---------- */
  function render(){
    try { window.dispatchEvent(new CustomEvent("ultimate-budget-change")); } catch(e){}
    const v = document.getElementById("view");
    if (!S){ v.innerHTML = viewSetup(); document.getElementById("tabs").style.display = "none"; fabState(); return; }
    document.getElementById("tabs").style.display = "";
    v.innerHTML = tab === "today" ? viewToday() : tab === "activity" ? viewActivity() : tab === "month" ? viewMonth() : tab === "goals" ? viewGoals() : viewAccounts();
    document.querySelectorAll("#tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
    const ch = document.getElementById("dayChart");
    if (ch){
      ch.querySelectorAll(".col").forEach(c => {
        const show = () => document.getElementById("chartTip").textContent = c.dataset.tip;
        c.onclick = show; c.onmouseenter = show;
      });
    }
    const q = document.getElementById("q");
    if (q) q.oninput = e => { query = e.target.value; const pos = e.target.selectionStart; render(); const n = document.getElementById("q"); n.focus(); n.setSelectionRange(pos, pos); };
  }

  document.getElementById("tabs").addEventListener("click", e => {
    const b = e.target.closest("button[data-tab]"); if (!b) return;
    if (b.dataset.tab === "today" && tab === "today") weekOffset = 0;
    tab = b.dataset.tab; render(); host.scrollIntoView({ block: "start" });
    try { localStorage.setItem(LS_KEY + "-tab", tab); } catch(e){}
  });
  document.getElementById("fab").onclick = () => txnSheet(null);
  document.getElementById("sheetBg").addEventListener("click", e => { if (e.target.id === "sheetBg") closeSheet(); });
  document.getElementById("view").addEventListener("click", async e => {
    const t = e.target;
    const edit = t.closest("[data-edit]"); if (edit){ txnSheet(edit.dataset.edit); return; }
    const mv = t.closest("[data-move]"); if (mv){ toggleMove(mv.dataset.move, mv.dataset.label, mv.dataset.from, mv.dataset.to, +mv.dataset.amt); return; }
    const f = t.closest("[data-filter]"); if (f){ filterCat = f.dataset.filter; render(); return; }
    const bill = t.closest("[data-bill]"); if (bill){ billSheet("bill", +bill.dataset.bill); return; }
    const one = t.closest("[data-one]"); if (one){ billSheet("one", +one.dataset.one); return; }
    if (t.id === "wPrev" || t.id === "wNext"){ weekOffset += t.id === "wPrev" ? -1 : 1; render(); return; }
    const dc = t.closest("[data-day]"); if (dc){ dayPick = dc.dataset.day; render(); return; }
    if (t.id === "wToday"){ weekOffset = 0; render(); host.scrollIntoView({ block: "start" }); return; }
    if (t.id === "mPrev" || t.id === "mNext"){ let { y, m } = monthCursor; m += t.id === "mPrev" ? -1 : 1; if (m < 0){ m = 11; y--; } if (m > 11){ m = 0; y++; } monthCursor = { y, m }; render(); return; }
    const adj = t.closest("[data-adjust]"); if (adj){ adjustSheet(adj.dataset.adjust || "checking"); return; }
    const adjE = t.closest("[data-adjedit]"); if (adjE){ adjustSheet(null, adjE.dataset.adjedit); return; }
    if (t.id === "addAdj") return adjustSheet("checking");
    if (t.id === "addBill") return billSheet("bill", null);
    if (t.id === "addOne") return billSheet("one", null);
    if (t.id === "importBtn") return importSheet();
    if (t.id === "setupBlank") return adoptStart(blankTemplate());
    if (t.id === "setupImport"){ try { const d = JSON.parse(document.getElementById("setupTxt").value); if (d.version !== 1 || !Array.isArray(d.txns)) throw 0; delete d.origin; adoptStart(d); toast("Budget imported"); } catch(err){ toast("That doesn't look like a backup"); } return; }
    if (t.id === "exportBtn"){ try { await navigator.clipboard.writeText(JSON.stringify(S)); toast("Backup copied — paste it into Notes"); } catch(err){ toast("Couldn't copy here"); } return; }
    if (t.id === "resetBtn"){
      if (t.dataset.confirm){ const o = S.origin ? clone(S.origin) : blankTemplate(); const d = migrate(o); d.origin = S.origin; replaceAll(d); save(); render(); toast("Reset to starting data"); }
      else { t.dataset.confirm = "1"; t.textContent = "Tap again — this erases your changes"; }
    }
  });
  document.getElementById("view").addEventListener("submit", e => {
    if (e.target.id !== "quickAdd") return;
    e.preventDefault();
    const f = e.target, amtEl = f.querySelector("#qAmt");
    const a = parseFloat(String(amtEl.value).replace(/[$,\s]/g, ""));
    if (!(a > 0)){ amtEl.focus(); toast("Enter an amount"); return; }
    const now = new Date().toISOString();
    const rec = { id: uid(), date: f.querySelector("#qDate").value, account: f.querySelector("#qAcct").value, category: f.querySelector("#qCat").value,
      amount: r2(f.querySelector("#qRefund").checked ? -a : a), desc: f.querySelector("#qDesc").value.trim(), note: "", createdAt: now, updatedAt: now };
    S.txns.push(rec); remember(rec); save(); render();
    toast(`${rec.amount < 0 ? "Refund" : "Added"} ${money(Math.abs(rec.amount))} · ${rec.category} · ${rec.account}`);
  });
  document.getElementById("view").addEventListener("change", e => {
    const i = e.target.closest("[data-percheck]"); if (!i) return;
    const v = parseFloat(i.value), c = S.categories[+i.dataset.percheck];
    c.perCheck = isNaN(v) ? 0 : Math.max(0, v);
    const from = currentCheckDate(), per = {}; S.categories.forEach(x => per[x.name] = +x.perCheck || 0);
    S.budgetHistory = S.budgetHistory.filter(e => e.from !== from).concat([{ from, per }]);
    save(); render(); toast("Budget updated");
  });

  try { const saved = localStorage.getItem(LS_KEY + "-tab"); if (saved) tab = saved; } catch(e){}
  let touchX = null, touchY = null;
  document.getElementById("view").addEventListener("touchstart", e => { touchX = e.touches[0].clientX; touchY = e.touches[0].clientY; }, { passive: true });
  document.getElementById("view").addEventListener("touchend", e => {
    if (tab !== "today" || touchX == null) return;
    const dx = e.changedTouches[0].clientX - touchX, dy = e.changedTouches[0].clientY - touchY; touchX = null;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 2){ const b = document.getElementById(dx > 0 ? "wPrev" : "wNext"); if (b && !b.disabled) b.click(); }
  }, { passive: true });
  render();
  connectCloud();
  // roll the day forward if the app stays open past midnight
  let lastDay = todayISO();
  setInterval(() => { if (todayISO() !== lastDay){ lastDay = todayISO(); render(); } }, 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });

  window.ultimateBudget = { summary: budgetSummary, open: tabName => { if (tabName){ tab = tabName; render(); } host.scrollIntoView({ block: "start" }); } };
  window.addEventListener("ultimate-budget-change", fabState);
  fabState();
  window.dispatchEvent(new CustomEvent("ultimate-budget-change"));
}

function start(){ document.querySelectorAll("budget-app").forEach(boot); }
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
