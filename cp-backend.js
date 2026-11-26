/* CONTENT PLAN INDO GROUP — penghubung dashboard (GitHub Pages) ke Google Apps Script.
   Menyediakan window.claude.use("db" | "user" | "assets" | "mcp") yang sama dengan versi Claude,
   jadi kode dashboard tidak perlu diubah:
   - db     : dokumen disimpan di tab DATA spreadsheet, perubahan tim diambil tiap ±10 detik
   - user   : login akun Google; Editor/Pemilik dari tab AKSES, selain itu Viewer (baca saja)
   - assets : upload logo & screenshot ke 1 folder Google Drive
   - mcp    : tombol Backup / Impor Google Sheets di Pengaturan */
(function () {
  "use strict";
  const CFG = Object.assign({}, window.CP_CONFIG || {});
  if (/ISI_/.test(CFG.CLIENT_ID || "")) CFG.CLIENT_ID = "";
  const API = /ISI_/.test(CFG.API_URL || "") ? "" : (CFG.API_URL || "");
  const KEY = "cp-auth-v1";
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const mkErr = (code, message) => Object.assign(new Error(message || code), { code });

  /* ---------- login ---------- */
  /* login disimpan di perangkat (localStorage) dan berlaku sampai klik Keluar: server memberi sesi sendiri ("s1.…")
     sehingga tidak ikut habis bersama token Google (±1 jam). Hak akses tetap dicek server di setiap simpanan. */
  let auth = null; // {token, exp, email, role, canEdit, nick}
  const isSess = a => !!(a && String(a.token || "").indexOf("s1.") === 0);
  try {
    auth = JSON.parse(localStorage.getItem(KEY) || sessionStorage.getItem(KEY) || "null");
    if (auth && !isSess(auth) && auth.exp * 1000 < Date.now() + 60000) auth = null;
  } catch (_) { auth = null; }
  function setAuth(a) { auth = a; try { if (a) localStorage.setItem(KEY, JSON.stringify(a)); else localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); } catch (_) {} renderAuth(); window.dispatchEvent(new Event("cp-auth")); }
  /* login dari tab lain di browser yang sama ikut terbaca */
  window.addEventListener("storage", e => { if (e.key !== KEY) return; try { auth = JSON.parse(e.newValue || "null"); } catch (_) { auth = null; } renderAuth(); window.dispatchEvent(new Event("cp-auth")); });
  function jwtPayload(t) { try { const p = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"); return JSON.parse(decodeURIComponent(escape(atob(p)))); } catch (_) { return {}; } }

  async function api(action, body) {
    if (!API) throw mkErr("not_configured", "Alamat server (API_URL) belum diisi di config.js");
    let r, j;
    try {
      r = await fetch(API, { method: "POST", redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(Object.assign({ action, token: auth && auth.token }, body || {})) });
    } catch (e) { throw mkErr("unavailable", "Server Google Apps Script tidak bisa dihubungi"); }
    try { j = await r.json(); } catch (e) { throw mkErr("unavailable", "Jawaban server tidak terbaca. Cek API_URL dan akses web app (Anyone)."); }
    if (!j.ok) {
      if (j.code === "auth_expired" || j.code === "auth_required") { if (auth) setAuth(null); promptLogin(); }
      throw mkErr(j.code || "error", j.message);
    }
    return j;
  }

  async function onCredential(resp) {
    const token = resp && resp.credential; if (!token) return;
    const p = jwtPayload(token);
    const tmp = { token, exp: Number(p.exp) || Math.floor(Date.now() / 1000) + 3000, email: p.email || "", role: "Viewer", canEdit: false };
    auth = tmp;
    try {
      const me = await api("me");
      const a = Object.assign(tmp, { email: me.email, role: me.role, canEdit: !!me.canEdit, nick: me.nick || "" });
      if (me.session) { a.token = me.session; a.exp = 0; }   // server baru: sesi sampai klik Keluar
      setAuth(a); toastMsg(me.canEdit ? "Masuk sebagai " + me.role + ": " + me.email : "Masuk sebagai " + me.email + " (hanya melihat)");
    }
    catch (e) { setAuth(null); toastMsg("Gagal masuk: " + (e.message || e.code), 9000); }
  }
  function promptLogin() { try { if (window.google && google.accounts && google.accounts.id) google.accounts.id.prompt(); } catch (_) {} }
  async function logout() { const tk = auth && auth.token; try { google.accounts.id.disableAutoSelect(); } catch (_) {} if (isSess(auth)) { try { await api("logout"); } catch (_) {} } if (auth && auth.token === tk) setAuth(null); toastMsg("Anda sudah keluar"); }
  /* peran diperbarui diam-diam saat dashboard dibuka (mis. baru dijadikan Editor di tab AKSES) */
  setTimeout(async () => { if (!isSess(auth)) return; try { const me = await api("me"); if (me.role !== auth.role || !!me.canEdit !== auth.canEdit || (me.nick || "") !== (auth.nick || "")) setAuth(Object.assign({}, auth, { role: me.role, canEdit: !!me.canEdit, nick: me.nick || "" })); } catch (_) {} }, 1500);
  function toastMsg(m, ms) { const t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = m; t.style.maxWidth = "min(560px, calc(100vw - 32px))"; t.style.borderRadius = "14px"; document.querySelectorAll(".toast").forEach(x => x.remove()); document.body.appendChild(t); setTimeout(() => t.remove(), ms || 3200); }
  /* tombol login Google di tempat lain (misalnya banner "Mode baca saja") */
  function mountButton(el) { if (!el || !gisReady || !CFG.CLIENT_ID) return false; try { el.innerHTML = ""; google.accounts.id.renderButton(el, { theme: "filled_black", size: "large", shape: "pill", text: "signin_with", locale: "id" }); return true; } catch (_) { return false; } }
  /* sesi login Google berlaku ±1 jam: minta masuk ulang sebelum habis, dan beri tahu saat habis */
  /* hanya untuk login lama (token Google): minta perpanjang sebelum habis; sesi "s1." tidak kedaluwarsa */
  setInterval(() => { if (!auth || isSess(auth)) return; const left = auth.exp * 1000 - Date.now(); if (left < 0) { setAuth(null); toastMsg("Sesi login berakhir. Klik Masuk dengan Google untuk lanjut mengedit.", 7000); } else if (left < 150000) promptLogin(); }, 60000);

  let gisReady = false;
  function initGis() {
    if (gisReady || !(window.google && google.accounts && google.accounts.id)) return false;
    if (!CFG.CLIENT_ID) { renderAuth(); return true; }
    google.accounts.id.initialize({ client_id: CFG.CLIENT_ID, callback: onCredential, auto_select: true, cancel_on_tap_outside: true, use_fedcm_for_prompt: true });
    gisReady = true; renderAuth(); window.dispatchEvent(new Event("cp-gis")); if (!auth) promptLogin(); return true;
  }
  (function waitGis(n) { if (!initGis() && n < 100) setTimeout(() => waitGis(n + 1), 150); })(0);

  function renderAuth() {
    const box = document.getElementById("authBox"); if (!box) return;
    if (auth) {
      box.innerHTML = `<div class="authme" title="${esc(auth.email)}"><span class="authav">${esc((auth.email || "?")[0].toUpperCase())}</span><span class="authtx"><b>${esc(auth.email)}</b><small>${esc(auth.canEdit ? auth.role : "Viewer · baca saja")}</small></span><button type="button" data-cplogout title="Keluar" aria-label="Keluar">⎋</button></div>`;
    } else if (!CFG.CLIENT_ID) {
      box.innerHTML = `<small class="authnote">Login belum diatur (CLIENT_ID di config.js)</small>`;
    } else {
      box.innerHTML = `<div id="gisBtn" class="gisbtn"></div><small class="authnote">Masuk dengan email terdaftar untuk mengedit</small>`;
      if (gisReady) try { google.accounts.id.renderButton(document.getElementById("gisBtn"), { theme: "outline", size: "medium", shape: "pill", text: "signin_with", width: 196, locale: "id" }); } catch (_) {}
    }
  }
  document.addEventListener("click", e => { if (e.target.closest && e.target.closest("[data-cplogout]")) logout(); });
  document.addEventListener("DOMContentLoaded", renderAuth);

  /* ---------- database (mirip Firestore kecil) ---------- */
  const store = new Map();          // path -> JSON string
  const prefRev = new Map();        // prefix -> rev terakhir yang sudah diambil
  const subs = new Set();           // {kind, path, cb, err, ready}
  const parent = p => p.split("/").slice(0, -1).join("/");
  const prefOf = s => s.kind === "doc" ? s.path : s.path + "/";
  const docSnap = p => ({ id: p.split("/").pop(), exists: store.has(p), data: () => store.has(p) ? JSON.parse(store.get(p)) : undefined });
  const colSnap = p => { const docs = [...store.keys()].filter(k => parent(k) === p).sort().map(docSnap); return { docs, size: docs.length, empty: !docs.length, metadata: { fromCache: false } }; };
  const inPrefix = (path, prefix) => prefix.endsWith("/") ? (path.startsWith(prefix) && !path.slice(prefix.length).includes("/")) : path === prefix;

  let timer = null, due = 0, polling = false, again = false, fails = 0;
  /* keep the sooner of the pending poll and the new one */
  function schedule(ms, force) { const at = Date.now() + ms; if (timer && !force && due <= at) return; clearTimeout(timer); due = at; timer = setTimeout(() => { timer = null; poll(); }, ms); }
  async function poll() {
    if (polling) { again = true; return; }
    const prefixes = [...new Set([...subs].map(prefOf))];
    if (!prefixes.length) return;
    polling = true;
    try {
      const j = await api("list", { queries: prefixes.map(p => ({ prefix: p, since: prefRev.has(p) ? prefRev.get(p) : -1 })) });
      fails = 0;
      apply(j, prefixes);
    } catch (e) {
      fails++;
      for (const s of subs) if (!s.ready && s.err) { s.err(e); s.ready = true; }
    } finally {
      polling = false;
      if (again) { again = false; schedule(30); }
      else schedule(document.hidden ? 60000 : Math.min(60000, 10000 * Math.max(1, fails)));
    }
  }
  function apply(j, prefixes) {
    const changed = new Set();
    if (!j.same) for (const r of j.res || []) {
      const keep = new Set(r.paths || []);
      for (const k of [...store.keys()]) if (inPrefix(k, r.prefix) && !keep.has(k)) { store.delete(k); changed.add(k); }
      for (const d of r.docs || []) { const s = JSON.stringify(d.data); if (store.get(d.path) !== s) { store.set(d.path, s); changed.add(d.path); } }
    }
    prefixes.forEach(p => prefRev.set(p, j.rev));
    for (const s of subs) {
      if (!prefixes.includes(prefOf(s))) continue;
      const hit = s.kind === "doc" ? changed.has(s.path) : [...changed].some(k => parent(k) === s.path);
      if (!s.ready || hit) { s.ready = true; try { s.cb(s.kind === "doc" ? docSnap(s.path) : colSnap(s.path)); } catch (e) { console.error(e); } }
    }
  }
  function subscribe(kind, path, cb, err) {
    const s = { kind, path, cb, err, ready: false };
    subs.add(s);
    const p = prefOf(s);
    if (prefRev.has(p) && [...subs].some(x => x !== s && prefOf(x) === p && x.ready)) { s.ready = true; setTimeout(() => cb(kind === "doc" ? docSnap(path) : colSnap(path)), 0); }
    else if (polling) again = true; else schedule(20);
    return () => { subs.delete(s); if (![...subs].some(x => prefOf(x) === p)) prefRev.delete(p); };
  }
  async function getOnce(kind, path) {
    const p = kind === "doc" ? path : path + "/";
    const j = await api("list", { queries: [{ prefix: p, since: -1 }] });
    const r = (j.res || [])[0] || { paths: [], docs: [] };
    for (const d of r.docs) store.set(d.path, JSON.stringify(d.data));
    return kind === "doc" ? docSnap(path) : colSnap(path);
  }
  const db = {
    doc: path => ({
      id: path.split("/").pop(), path,
      get: () => getOnce("doc", path),
      set: async v => { const s = JSON.stringify(v ?? {}); await api("set", { path, data: JSON.parse(s) }); store.set(path, s); },
      delete: async () => { await api("delete", { path }); store.delete(path); },
      /* hanya sel yang berubah: server menggabungkannya ke versi terbarunya lalu mengembalikan hasilnya */
      patch: async (ops, hdr) => { const j = await api("patch", { path, ops, hdr }); if (j.doc) store.set(path, JSON.stringify(j.doc)); else store.delete(path); return j.doc || null; },
      onSnapshot: (cb, err) => subscribe("doc", path, cb, err)
    }),
    collection: path => ({
      path,
      get: () => getOnce("col", path),
      onSnapshot: (cb, err) => subscribe("col", path, cb, err)
    })
  };
  document.addEventListener("visibilitychange", () => { if (!document.hidden && subs.size) schedule(50); });

  /* ---------- user ---------- */
  const user = {
    canEdit: async () => !!(auth && auth.canEdit),
    isOwner: async () => !!(auth && auth.role === "Pemilik"),
    can: async () => !!(auth && auth.canEdit)
  };

  /* ---------- upload ke Google Drive ---------- */
  const assets = {
    upload: async file => {
      if (!auth || !auth.canEdit) throw mkErr("not_editor", "Masuk sebagai Editor untuk mengupload");
      if (file.size > 10 * 1024 * 1024) throw mkErr("too_large", "File terlalu besar (maks. 10 MB)");
      const b64 = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(",")[1] || ""); fr.onerror = () => rej(mkErr("read_failed", "File tidak terbaca")); fr.readAsDataURL(file); });
      const j = await api("upload", { name: file.name || "upload", mime: file.type || "image/png", b64 });
      return { id: j.id, url: window.CP_BLOB(j.id) };
    }
  };
  /* gambar dari Google Drive (logo, screenshot). Bila gagal tampil: coba link thumbnail, lalu ambil lewat server. */
  window.CP_BLOB = id => "https://lh3.googleusercontent.com/d/" + encodeURIComponent(id) + "=w1600";
  const imgCache = new Map();
  window.CP_IMG = async (im, id) => {
    const step = Number(im.dataset.imgTry || 0); im.dataset.imgTry = step + 1;
    if (step === 0) { im.src = "https://drive.google.com/thumbnail?id=" + encodeURIComponent(id) + "&sz=w1600"; return; }
    if (step > 1) return;
    try {
      let u = imgCache.get(id);
      if (!u) { const j = await api("img", { id }); u = "data:" + (j.mime || "image/png") + ";base64," + j.b64; imgCache.set(id, u); }
      im.src = u;
    } catch (_) {}
  };
  document.addEventListener("error", e => {
    const im = e.target; if (!im || im.tagName !== "IMG") return;
    const m = /googleusercontent\.com\/d\/([\w-]+)/.exec(im.src) || /drive\.google\.com\/thumbnail\?id=([\w-]+)/.exec(im.src);
    if (m) window.CP_IMG(im, m[1]);
  }, true);

  /* ---------- tombol Backup / Impor Google Sheets ---------- */
  const mcp = {
    callTool: async (server, tool, input) => {
      try { const j = await api("gs", { tool, input }); return { payload: j.payload }; }
      catch (e) { if (e.code === "tool_error" || e.code === "not_editor") throw e; throw mkErr("server_unavailable", e.message); }
    }
  };

  /* ---------- ✨ script AI (Gemini di server Apps Script) ---------- */
  const ai = {
    script: async prompt => {
      if (!auth || !auth.canEdit) throw mkErr("not_editor", "Masuk sebagai Editor untuk memakai AI");
      const j = await api("ai", { prompt });
      return j.result;
    }
  };

  /* ---------- tim: nama panggilan, siapa yang online, catatan aktivitas ---------- */
  let gid = ""; try { gid = localStorage.getItem("cp-gid") || ""; if (!gid) { gid = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("cp-gid", gid); } } catch (_) { gid = "t" + Math.random().toString(36).slice(2); }
  const team = {
    kind: "server",
    me: () => auth,
    ping: (page, since) => api("ping", { gid, page, since }),
    setNick: async nick => { const j = await api("nick", { nick }); if (auth) { auth.nick = j.nick; setAuth(auth); } return j.nick; },
    log: items => api("log", { items })
  };

  const NS = { db, user, assets, mcp, ai, team };
  window.claude = { use: name => Promise.resolve(NS[name] || null) };
  window.CP_AUTH = { login: promptLogin, logout, mountButton, get me() { return auth; }, get ready() { return gisReady; } };
})();
