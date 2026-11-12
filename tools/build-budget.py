# Rebuilds budget.js from the Paycheck Budget app.
# Usage (from the repo root):  python3 tools/build-budget.py PATH/TO/Finance/index.html budget.js
# The Finance repo is only read, never changed.
import re, sys, json, pathlib
src = pathlib.Path(sys.argv[1]).read_text()
out_path = pathlib.Path(sys.argv[2])
lines = src.split("\n")
L = lambda a, b: "\n".join(lines[a-1:b])          # 1-based inclusive

def must(cond, msg):
    if not cond: sys.exit("BUILD ERROR: " + msg)

# ---------------- CSS ----------------
css = src[src.index("<style>")+7:src.index("</style>")]
css = re.sub(r'@font-face\{[^}]*\}\n', '', css)
css = re.sub(r':root\{.*?\n\}\n', '', css, count=1, flags=re.S)
dark = css.index("@media (prefers-color-scheme: dark){")
dark_end = css.index("\n}\n", css.index("\n  }", dark)) + 3
css = css[:dark] + css[dark_end:]
def rep(a, b):
    global css
    must(a in css, "css missing: " + a[:60]); css = css.replace(a, b)
rep('html,body{font-feature-settings:"tnum" 1;margin:0;background:var(--bg);color:var(--ink);font-family:var(--font);font-size:16px;-webkit-text-size-adjust:100%}',
    ':host{display:block;font-feature-settings:"tnum" 1;background:var(--bg);color:var(--ink);font-family:var(--font);font-optical-sizing:auto;font-size:16px;border-radius:22px;border:1px solid var(--line);overflow:clip}')
rep('body{padding-top:env(safe-area-inset-top);padding-bottom:calc(84px + env(safe-area-inset-bottom))}\n', '')
rep('.wrap{max-width:560px;margin:0 auto;padding:12px 16px 24px}', '.wrap{max-width:640px;margin:0 auto;padding:12px 16px 96px}')
rep('h1{font-size:30px;line-height:1.1;margin:10px 2px 2px;letter-spacing:-.02em}', 'h1{font-size:30px;line-height:1.1;margin:10px 2px 2px;letter-spacing:-.02em;font-weight:672}')
rep('color:var(--ink3);font-weight:600;margin:22px 4px 8px}', 'color:var(--ink3);font-weight:672;margin:22px 4px 8px}')
rep('.wk-title{font-weight:700;font-size:17px}', '.wk-title{font-weight:672;font-size:17px}')
css = re.sub(r'nav\.tabs\{position:fixed;left:0;right:0;bottom:0;(.*?)border-top:1px solid var\(--line\);(.*?)padding:6px 4px calc\(6px \+ env\(safe-area-inset-bottom\)\);z-index:20\}',
             r'nav.tabs{position:sticky;top:0;\1border-bottom:1px solid var(--line);\2padding:6px 4px;z-index:20}', css)
must('position:sticky;top:0' in css, "tabs rewrite failed")
css = re.sub(r'\.fab\{position:fixed;right:18px;bottom:calc\(78px \+ env\(safe-area-inset-bottom\)\);', '.fab{display:none;position:fixed;right:18px;bottom:calc(20px + env(safe-area-inset-bottom));', css)
must('.fab{display:none' in css, "fab rewrite failed")
css = re.sub(r'\.pill\{position:fixed;top:calc\(8px \+ env\(safe-area-inset-top\)\);right:12px;z-index:30;', '.pill{', css)
css = css.replace('bottom:calc(150px + env(safe-area-inset-bottom))', 'bottom:calc(96px + env(safe-area-inset-bottom))')
css = '''
:host{
  color-scheme:light;
  /* project palette: #fdbfce pink · #d0efef aqua · #44362f cocoa · #dbdfeb mist (plus tints of them) */
  --bg:#eff1f6; --card:#ffffff; --card2:#eff1f6; --line:#dbdfeb;
  --ink:#44362f; --ink2:#807672; --ink3:#a29a97;
  --accent:#fdbfce; --on-accent:#44362f; --mark:#fdbfce; --soft:#d0efef; --on-soft:#44362f;
  --good:#44362f; --goodbar:#bad5d4; --warn:#bc8f96; --bad:#8a6a6b; --bad-soft:#fdbfce; --warn-soft:#fee2e9; --good-soft:#d0efef;
  --track:#dbdfeb; --hero-wash:#fdbfce;
  --r:16px;
  --font:"Cause",cursive;
}
''' + css + '''
.fab.show{display:block}
.tag.warn{color:var(--ink)}
.tag.bad{color:var(--ink)}
.bud-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 18px 10px;max-width:640px;margin:0 auto}
.bud-title{font-size:13px;letter-spacing:.16em;text-transform:uppercase;font-weight:672;margin:0;color:var(--ink)}
.sheet-bg{z-index:10050}.toast{z-index:10060}.fab{z-index:10040}
b,strong{font-weight:672}
'''

# ---------------- HTML ----------------
body = src[src.index("<body>")+6:src.index("<script>", src.index("<body>"))]
body = body.replace('<div class="pill" id="syncPill">Saved on this phone</div>\n', '')
tabs = body[body.index('<nav class="tabs"'):body.index('</nav>')+6]
must(tabs, "tabs markup")
body = body.replace(tabs, '')
body = body.replace('<div class="wrap" id="view"></div>',
  '<div class="bud-head"><h2 class="bud-title">Finances</h2><div class="pill" id="syncPill">Connecting…</div></div>\n' + tabs + '\n<div class="wrap" id="view"></div>')

# ---------------- JS ----------------
s_start = src.index("<script>", src.index("<body>")) + 8
js_lines_start = src[:s_start].count("\n") + 2
seed_start = next(i for i,l in enumerate(lines,1) if l.startswith("const SEED = {"))
seed_end = next(i for i in range(seed_start, len(lines)+1) if lines[i-1] == "};")
acc_start = seed_end + 1
state_start = next(i for i,l in enumerate(lines,1) if l.startswith("/* ---------- state & persistence"))
clone_start = next(i for i,l in enumerate(lines,1) if l.startswith("function clone("))
load_start = next(i for i,l in enumerate(lines,1) if l.startswith("function load(){"))
merge_start = next(i for i,l in enumerate(lines,1) if l.startswith("/* merge two copies"))
cc_start = next(i for i,l in enumerate(lines,1) if l.startswith("async function connectCloud"))
date_start = next(i for i,l in enumerate(lines,1) if l.startswith("/* ---------- date helpers"))
end_script = next(i for i,l in enumerate(lines,1) if i > date_start and l.startswith("</script>"))
header = L(js_lines_start, seed_start-1)
storage = (pathlib.Path(__file__).parent / "budget-storage.js").read_text()
storage = storage.replace("__CLONE_MIGRATE__", L(clone_start, load_start-1)).replace("__MERGE__", L(merge_start, cc_start-1))
rest = L(date_start, end_script-1)

def jrep(a, b, count=1):
    global rest
    n = rest.count(a); must(n >= count, f"js missing ({n}): {a[:70]}"); rest = rest.replace(a, b)
jrep('  const v = document.getElementById("view");\n',
     '  const v = document.getElementById("view");\n'
     '  if (!S){ v.innerHTML = viewSetup(); document.getElementById("tabs").style.display = "none"; fabState(); return; }\n'
     '  document.getElementById("tabs").style.display = "";\n')
jrep('window.scrollTo(0, 0)', 'host.scrollIntoView({ block: "start" })', 2)
jrep('<button class="btn danger" id="resetBtn">Reset to sheet data (11/10)</button>', '<button class="btn danger" id="resetBtn">Reset to imported starting data</button>')
jrep('to your Claude account, and shows up on your other devices.', 'to your Ultimate Dashboard account, and shows up on your other devices.')
jrep('if (t.dataset.confirm){ replaceAll(migrate(clone(SEED))); save(); render(); toast("Reset to sheet data"); }',
     'if (t.dataset.confirm){ const o = S.origin ? clone(S.origin) : blankTemplate(); const d = migrate(o); d.origin = S.origin; replaceAll(d); save(); render(); toast("Reset to starting data"); }')
jrep('  if (t.id === "importBtn") return importSheet();\n',
     '  if (t.id === "importBtn") return importSheet();\n'
     '  if (t.id === "setupBlank") return adoptStart(blankTemplate());\n'
     '  if (t.id === "setupImport"){ try { const d = JSON.parse(document.getElementById("setupTxt").value); if (d.version !== 1 || !Array.isArray(d.txns)) throw 0; delete d.origin; adoptStart(d); toast("Budget imported"); } catch(err){ toast("That doesn\'t look like a backup"); } return; }\n')
# restore keeps the original "origin"
jrep('replaceAll(migrate(d)); save(); closeSheet(); render(); toast("Restored");',
     'const keep = S && S.origin; replaceAll(migrate(d)); if (!S.origin) S.origin = keep || (() => { const o = clone(S); delete o.origin; return o; })(); save(); closeSheet(); render(); toast("Restored");')
# render hook for the overview card + fab visibility
jrep('function render(){\n', 'function render(){\n  try { window.dispatchEvent(new CustomEvent("ultimate-budget-change")); } catch(e){}\n')
must("connectCloud();" in rest, "connectCloud call")

js = "\n".join([header, storage, L(acc_start, state_start-1), rest])
must("SEED" not in js, "SEED still referenced")

module = r'''/* Ultimate Dashboard · Budget page
   Built from the Paycheck Budget app (sottyon/Finance @ 6b80d57) by build-budget.py.
   The app runs inside a shadow root so its styles and the dashboard's styles
   (Tailwind, page CSS) can't affect each other.
   Data: one "budget_state" record in Supabase via window.dataSdk (data.js). */
(() => {
const BUDGET_CSS = __CSS__;
const BUDGET_HTML = __HTML__;

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

__JS__

  window.ultimateBudget = { summary: budgetSummary, open: tabName => { if (tabName){ tab = tabName; render(); } host.scrollIntoView({ block: "start" }); } };
  window.addEventListener("ultimate-budget-change", fabState);
  fabState();
  window.dispatchEvent(new CustomEvent("ultimate-budget-change"));
}

function start(){ document.querySelectorAll("budget-app").forEach(boot); }
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
'''
module = module.replace("__CSS__", json.dumps(css)).replace("__HTML__", json.dumps(body))
indented = "\n".join(("  " + l) if l.strip() else l for l in js.split("\n"))
module = module.replace("__JS__", indented)
out_path.write_text(module)
print("wrote", out_path, len(module), "bytes")
