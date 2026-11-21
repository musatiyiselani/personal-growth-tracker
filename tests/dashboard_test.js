const fs = require("fs"), vm = require("vm"), assert = require("assert"), nodePath = require("path");
function el(id){ return { id, textContent: "", innerHTML: "", style: {}, classList: { toggle(){}, add(){}, remove(){} }, addEventListener(){} }; }
(async () => {
  const els = {};
  const getEl = id => (els[id] = els[id] || el(id));
  const bars = {};
  const document = {
    body: { classList: { toggle(){} } },
    addEventListener(evt, fn) { if (evt === "DOMContentLoaded") document._ready.push(fn); },
    _ready: [],
    getElementById: id => getEl(id),
    querySelector: sel => { const m = sel.match(/data-category="([^"]+)"/) || sel.match(/data-category-text="([^"]+)"/);
      if (!m) return null; const key = m[1]; return sel.includes("progress-fill") ? (bars[key] = bars[key] || el("bar-"+key)) : (bars["t-"+key] = bars["t-"+key] || el("t-"+key)); },
    querySelectorAll(){ return []; },
    createElement(){ return el("x"); }
  };
  const localStorage = { m: new Map(), getItem(k){ return this.m.has(k) ? this.m.get(k) : null; }, setItem(k,v){ this.m.set(k,String(v)); }, removeItem(k){ this.m.delete(k); } };
  localStorage.setItem("pgt_token","tok");
  const sessionStorage = { getItem(){return null}, setItem(){}, removeItem(){} };
  const window = { location: { pathname: "/dashboard.html", replace(){} , href:""}, PGT_API_BASE: "http://api.test", addEventListener(){} };
  const goals = [
    { id: 1, title: "Learn <Rust> & C", category: "Education", status: "In Progress", progress: 50, weekly_target: 5, unit: "hours" },
    { id: 2, title: "Ship site", category: "Web Development", status: "Completed", progress: 100, weekly_target: 3, unit: "tasks" },
    { id: 3, title: "Read", category: "Education", status: "Not Started", progress: 0, weekly_target: 2, unit: "pages" } ];
  const activities = [ { id: 9, title: "Lab", category: "Education", duration: 2.5, unit: "hours", activity_date: "2026-11-20", description: null } ];
  const calls = [];
  const fetchImpl = async (url, opts) => { calls.push(url);
    const body = url.endsWith("/goals/") ? goals : url.endsWith("/activities/") ? activities : {};
    return { ok: true, status: 200, json: async () => body }; };
  const ctx = { window, document, localStorage, sessionStorage, fetch: fetchImpl, console, Date, Math, Number, String, JSON, Array, Promise, Error, Object, Map, Intl, setTimeout, URLSearchParams, FormData };
  ctx.window.localStorage = localStorage; ctx.window.sessionStorage = sessionStorage; ctx.window.document = document;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(nodePath.join(__dirname, "..", "frontend", "js", "common.js"),"utf8"), ctx);
  ctx.PGT = window.PGT; // in a browser window and the global scope are the same object
  vm.runInContext(fs.readFileSync(nodePath.join(__dirname, "..", "frontend", "js", "dashboard.js"),"utf8"), ctx);
  for (const fn of document._ready) await fn();
  await new Promise(r => setTimeout(r, 20));

  assert.strictEqual(getEl("active-goals-count").textContent, 2);
  assert.strictEqual(getEl("completed-goals-count").textContent, 1);
  assert.strictEqual(getEl("activities-count").textContent, 1);
  assert.strictEqual(getEl("overall-progress").textContent, "50%");
  assert.strictEqual(bars["Education"].style.width, "25%");     // avg of 50 and 0
  assert.strictEqual(bars["Web Development"].style.width, "100%");
  assert.strictEqual(bars["Other"].style.width, "0%");
  assert.ok(getEl("dashboard-goals").innerHTML.includes("Learn &lt;Rust&gt; &amp; C"), "title escaped");
  assert.ok(!getEl("dashboard-goals").innerHTML.includes("<Rust>"), "no raw markup");
  assert.ok(getEl("dashboard-activities").innerHTML.includes("2.5 hours"));
  assert.ok(calls.some(u => u === "http://api.test/goals/") && calls.some(u => u === "http://api.test/activities/"));
  console.log("PASS dashboard renders counts, category averages, escaped titles and activity amounts");
  console.log("PASS dashboard API calls:", calls.join(", "));
})().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
