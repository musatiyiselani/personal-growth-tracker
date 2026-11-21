const fs = require("fs"), nodePath = require("path");
const vm = require("vm");
const assert = require("assert");

function makeStorage() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)),
           removeItem: k => m.delete(k), _map: m };
}

function loadCommon({ path = "/dashboard.html", fetchImpl }) {
  const localStorage = makeStorage(), sessionStorage = makeStorage();
  const location = { pathname: path, href: "", replace(u) { this.replaced = u; } };
  const document = {
    body: { classList: { toggle() {}, add() {}, remove() {} } },
    addEventListener() {}, querySelectorAll() { return []; },
    getElementById() { return null; }, querySelector() { return null; },
    createElement() { return {}; }
  };
  const window = { location, PGT_API_BASE: "http://api.test" };
  const ctx = { window, document, localStorage, sessionStorage, location, fetch: fetchImpl,
                console, Date, Math, Number, String, JSON, Array, Promise, Error, Object, Map,
                setTimeout, clearTimeout, URLSearchParams, FormData, Intl };
  ctx.window = window; window.localStorage = localStorage; window.sessionStorage = sessionStorage;
  window.location = location; window.document = document;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(nodePath.join(__dirname, "..", "frontend", "js", "common.js"), "utf8"), ctx);
  return { PGT: window.PGT, window, localStorage, sessionStorage, location };
}

const jsonResponse = (status, body) => ({ ok: status >= 200 && status < 300, status,
  json: async () => body, blob: async () => "BLOB" });

(async () => {
  // 1. Authorised GET sends the bearer token and returns parsed JSON
  let seen;
  let env = loadCommon({ fetchImpl: async (url, opts) => { seen = { url, opts }; return jsonResponse(200, [{ id: 1 }]); } });
  env.localStorage.setItem("pgt_token", "abc123");
  const goals = await env.PGT.api.get("/goals/");
  assert.deepStrictEqual(goals, [{ id: 1 }]);
  assert.strictEqual(seen.url, "http://api.test/goals/");
  assert.strictEqual(seen.opts.headers.Authorization, "Bearer abc123");
  console.log("PASS authorised GET sends bearer token");

  // 2. JSON body sets Content-Type; login uses auth:false (no header)
  env = loadCommon({ fetchImpl: async (url, opts) => { seen = { url, opts }; return jsonResponse(201, { id: 9 }); } });
  env.localStorage.setItem("pgt_token", "abc123");
  await env.PGT.api.post("/goals/", { title: "x" });
  assert.strictEqual(seen.opts.headers["Content-Type"], "application/json");
  assert.strictEqual(seen.opts.body, JSON.stringify({ title: "x" }));
  await env.PGT.api.postForm("/users/login", new URLSearchParams({ username: "a", password: "b" }), { auth: false });
  assert.strictEqual(seen.opts.headers.Authorization, undefined);
  assert.strictEqual(seen.opts.headers["Content-Type"], undefined);
  console.log("PASS JSON body sets content type; login form sends no token");

  // 3. 401 on a protected page clears session and redirects
  env = loadCommon({ path: "/goals.html", fetchImpl: async () => jsonResponse(401, { detail: "Not authenticated" }) });
  env.localStorage.setItem("pgt_token", "old");
  env.localStorage.setItem("pgt_user", "{}");
  await assert.rejects(env.PGT.api.get("/goals/"), /session has ended/);
  assert.strictEqual(env.localStorage.getItem("pgt_token"), null);
  assert.strictEqual(env.location.replaced, "index.html");
  console.log("PASS 401 clears session and redirects to login");

  // 4. 401 on the login page does NOT redirect (wrong password case uses auth:false)
  env = loadCommon({ path: "/index.html", fetchImpl: async () => jsonResponse(401, { detail: "Incorrect email or password" }) });
  await assert.rejects(env.PGT.api.postForm("/users/login", new URLSearchParams(), { auth: false }), /Incorrect email or password/);
  assert.strictEqual(env.location.replaced, undefined);
  console.log("PASS wrong-password message shown on login page without redirect");

  // 5. 422 validation array -> readable message, "Value error," prefix removed
  env = loadCommon({ fetchImpl: async () => jsonResponse(422, { detail: [
    { msg: "Value error, 'name' cannot be set to null.", loc: ["body", "name"] },
    { msg: "value is not a valid email address", loc: ["body", "email"] } ] }) });
  env.localStorage.setItem("pgt_token", "t");
  await assert.rejects(env.PGT.api.put("/profile/", { name: null }), (e) => {
    assert.strictEqual(e.message, "'name' cannot be set to null. value is not a valid email address");
    return true; });
  console.log("PASS validation errors are formatted for display");

  // 6. Plain string detail (e.g. 400 duplicate email) passes through
  env = loadCommon({ fetchImpl: async () => jsonResponse(400, { detail: "That email address is already in use." }) });
  env.localStorage.setItem("pgt_token", "t");
  await assert.rejects(env.PGT.api.put("/profile/", {}), /already in use/);
  console.log("PASS string error detail passes through");

  // 7. Network failure gives a clear message
  env = loadCommon({ fetchImpl: async () => { throw new TypeError("Failed to fetch"); } });
  await assert.rejects(env.PGT.api.get("/goals/"), /Cannot reach the server/);
  console.log("PASS network failure message");

  // 8. Non-JSON error body falls back to generic message
  env = loadCommon({ fetchImpl: async () => ({ ok: false, status: 500, json: async () => { throw new SyntaxError("x"); } }) });
  await assert.rejects(env.PGT.api.get("/goals/"), /Something went wrong/);
  console.log("PASS non-JSON error uses fallback message");

  // 9. Login guard: protected page without token redirects; public page does not
  env = loadCommon({ path: "/dashboard.html", fetchImpl: async () => jsonResponse(200, {}) });
  assert.strictEqual(env.PGT.requireLogin(), false);
  assert.strictEqual(env.location.replaced, "index.html");
  env = loadCommon({ path: "/index.html", fetchImpl: async () => jsonResponse(200, {}) });
  assert.strictEqual(env.PGT.requireLogin(), true);
  assert.strictEqual(env.location.replaced, undefined);
  console.log("PASS login guard: protected pages redirect, public pages stay");

  // 10. Remember-me chooses storage; logout clears both
  env = loadCommon({ fetchImpl: async () => jsonResponse(200, {}) });
  env.PGT.saveSession("tok", { id: 1, name: "A" }, false);
  assert.strictEqual(env.sessionStorage.getItem("pgt_token"), "tok");
  assert.strictEqual(env.localStorage.getItem("pgt_token"), null);
  env.PGT.saveSession("tok2", { id: 1, name: "A" }, true);
  assert.strictEqual(env.localStorage.getItem("pgt_token"), "tok2");
  assert.strictEqual(env.sessionStorage.getItem("pgt_token"), null);
  assert.deepStrictEqual(env.PGT.getCurrentUser(), { id: 1, name: "A" });
  const ev = { prevented: false, preventDefault() { this.prevented = true; } };
  env.PGT.logout(ev);
  assert.ok(ev.prevented);
  assert.strictEqual(env.localStorage.getItem("pgt_token"), null);
  assert.strictEqual(env.location.href, "index.html");
  console.log("PASS remember-me storage choice and logout");

  // 11. Helpers
  env = loadCommon({ fetchImpl: async () => jsonResponse(200, {}) });
  const P = env.PGT;
  assert.strictEqual(P.escapeHTML(`<img src=x onerror="a">&'`), "&lt;img src=x onerror=&quot;a&quot;&gt;&amp;&#39;");
  assert.strictEqual(P.formatPercentage(66.6), "67%");
  assert.strictEqual(P.formatNumber(2.345), "2.35");
  assert.strictEqual(P.formatNumber(3), "3");
  assert.notStrictEqual(P.formatDate("2026-11-20"), "Invalid date");
  assert.notStrictEqual(P.formatDate("2026-11-20T10:00:00.123"), "Invalid date");
  assert.strictEqual(P.formatDate(null), "No date available");
  assert.strictEqual(P.averageProgress([{ progress: 50 }, { progress: 100 }]), 75);
  assert.strictEqual(P.averageProgress([]), 0);
  const d = P.dateOffset(6), today = P.getTodayDate();
  assert.match(d, /^\d{4}-\d{2}-\d{2}$/); assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
  const diff = (new Date(today) - new Date(d)) / 86400000;
  assert.ok(Math.round(diff) === 6, `expected 6 days, got ${diff}`);
  console.log("PASS display helpers and date offsets");

  // 12. Theme: saved preference applies, setDarkMode persists
  env = loadCommon({ fetchImpl: async () => jsonResponse(200, {}) });
  env.PGT.setDarkMode(true);
  assert.strictEqual(env.localStorage.getItem("pgt_dark_mode"), "true");
  console.log("PASS dark mode preference persists");

  console.log("\nAll common.js tests passed.");
})().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
