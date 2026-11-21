// Runs profile.js against mocked API responses, with a minimal DOM stand-in.
const fs = require("fs");
const vm = require("vm");
const assert = require("assert");
const nodePath = require("path");

const jsDir = nodePath.join(__dirname, "..", "frontend", "js");

function makeElement(id) {
  return {
    id, value: "", textContent: "", innerHTML: "", hidden: false, disabled: false,
    src: undefined, files: [], classList: { add() {}, remove() {}, toggle() {} },
    removeAttribute(name) { if (name === "src") this.src = undefined; },
    addEventListener(evt, fn) { this._handlers = this._handlers || {}; this._handlers[evt] = fn; }
  };
}

(async () => {
  const elements = {};
  const getEl = id => (elements[id] = elements[id] || makeElement(id));
  const ready = [];
  const document = {
    body: { classList: { toggle() {} } },
    addEventListener(evt, fn) { if (evt === "DOMContentLoaded") ready.push(fn); },
    getElementById: getEl,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => makeElement("x")
  };

  const revoked = [];
  let urlCounter = 0;
  const URLStub = { createObjectURL: () => `blob:mock-${++urlCounter}`, revokeObjectURL: u => revoked.push(u) };

  let hasPicture = true;
  const calls = [];
  const fetchImpl = async (url, opts = {}) => {
    calls.push(`${opts.method || "GET"} ${url}`);
    const json = body => ({ ok: true, status: 200, json: async () => body, blob: async () => new Blob(["img"], { type: "image/png" }) });
    if (url.endsWith("/profile/") && (!opts.method || opts.method === "GET")) {
      return json({ id: 1, name: "Ann", email: "ann@example.com", bio: "", created_at: "2026-01-02T10:00:00",
                    profile_picture: hasPicture ? "/profile/picture" : null });
    }
    if (url.endsWith("/profile/picture") && opts.method === "POST") {
      hasPicture = true; return json({ message: "ok", profile_picture: "/profile/picture" });
    }
    if (url.endsWith("/profile/picture") && opts.method === "DELETE") {
      hasPicture = false; return json({ message: "removed" });
    }
    if (url.endsWith("/profile/picture")) {
      if (!hasPicture) return { ok: false, status: 404, json: async () => ({ detail: "No profile picture is currently set." }) };
      return json({});
    }
    if (url.endsWith("/profile/settings")) return json({ dark_mode: false });
    throw new Error("unexpected call " + url);
  };

  const localStorage = { m: new Map(), getItem(k) { return this.m.has(k) ? this.m.get(k) : null; },
                         setItem(k, v) { this.m.set(k, String(v)); }, removeItem(k) { this.m.delete(k); } };
  localStorage.setItem("pgt_token", "tok");
  const window = { location: { pathname: "/profile.html", replace() {}, href: "" }, PGT_API_BASE: "http://api.test" };
  const ctx = { window, document, localStorage, sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
                fetch: fetchImpl, console, Date, Math, Number, String, JSON, Array, Promise, Error, Object, Map,
                Intl, setTimeout, URLSearchParams, FormData, Blob, URL: URLStub };
  window.localStorage = localStorage; window.document = document; window.sessionStorage = ctx.sessionStorage;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(nodePath.join(jsDir, "common.js"), "utf8"), ctx);
  ctx.PGT = window.PGT;
  vm.runInContext(fs.readFileSync(nodePath.join(jsDir, "profile.js"), "utf8"), ctx);
  for (const fn of ready) await fn();
  const settle = () => new Promise(r => setTimeout(r, 20));
  await settle();

  // 1. On load, the saved picture is fetched with the token and shown from a blob URL
  assert.strictEqual(getEl("profile-picture-preview").src, "blob:mock-1");
  assert.strictEqual(getEl("profile-picture-preview").hidden, false);
  assert.ok(calls.includes("GET http://api.test/profile/picture"));
  assert.strictEqual(getEl("profile-name").value, "Ann");
  console.log("PASS saved picture loads through the API and is shown from a blob URL");

  // 2. Upload replaces the picture and releases the previous blob URL
  getEl("profile-picture-input").files = [new Blob(["abcd"], { type: "image/png" })];
  await getEl("upload-picture")._handlers.click();
  await settle();
  assert.ok(calls.some(c => c === "POST http://api.test/profile/picture"));
  assert.strictEqual(getEl("profile-picture-preview").src, "blob:mock-2");
  assert.ok(revoked.includes("blob:mock-1"), "old blob URL released");
  assert.strictEqual(getEl("picture-message").textContent, "Profile picture uploaded.");
  console.log("PASS upload replaces the picture and releases the old blob URL");

  // 3. Remove hides the picture and releases its blob URL
  await getEl("remove-picture")._handlers.click();
  await settle();
  assert.strictEqual(getEl("profile-picture-preview").hidden, true);
  assert.strictEqual(getEl("profile-picture-preview").src, undefined);
  assert.ok(revoked.includes("blob:mock-2"));
  console.log("PASS remove hides the picture and releases its blob URL");

  // 4. Opening the page with no picture makes no picture request
  const before = calls.length;
  hasPicture = false;
  for (const fn of ready) await fn();
  await settle();
  assert.strictEqual(calls.slice(before).some(c => c.endsWith("/profile/picture")), false);
  assert.strictEqual(getEl("profile-picture-preview").hidden, true);
  console.log("PASS no picture request when the user has no picture");

  console.log("\nAll profile.js picture tests passed.");
})().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
