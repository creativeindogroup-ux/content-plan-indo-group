/**
 * CONTENT PLAN INDO GROUP — server Google Apps Script
 * ---------------------------------------------------
 * Spreadsheet ini menjadi database dashboard di GitHub Pages.
 *  - Tab DATA  : isi dashboard (jangan diedit manual). Satu baris = satu dokumen (pengaturan, atau 1 minggu konten 1 brand).
 *  - Tab AKSES : daftar email yang boleh MENGUBAH dashboard (Peran: Editor). Orang lain yang punya link hanya bisa melihat.
 *  - Folder Google Drive "Content Plan Indo Group - Upload" : logo & screenshot yang diupload dari dashboard.
 *
 * Langkah pakai ada di PANDUAN.md. Ringkasnya:
 *  1. Isi CLIENT_ID di bawah (dari Google Cloud Console).
 *  2. Jalankan fungsi `siapkan` sekali (menu Content Plan → Siapkan).
 *  3. Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).
 */

// >>> ISI INI: OAuth Client ID (Web application) dari Google Cloud Console
const CLIENT_ID = 'ISI_CLIENT_ID_ANDA.apps.googleusercontent.com';

const DATA_SHEET = 'DATA';
const AKSES_SHEET = 'AKSES';
const FOLDER_NAME = 'Content Plan Indo Group - Upload';
const CHUNK = 45000;          // batas aman 1 sel Google Sheets (maks 50.000 karakter)
const FIRST_CHUNK_COL = 5;    // kolom E dst. berisi JSON
const MAX_UPLOAD = 10 * 1024 * 1024;

/* ================= menu di spreadsheet ================= */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Content Plan')
    .addItem('1. Siapkan (sekali saja)', 'siapkan')
    .addItem('2. Impor data lama (data-export.json)', 'imporDataLama')
    .addSeparator()
    .addItem('Buka folder upload', 'bukaFolder')
    .addToUi();
}

/** Membuat tab DATA & AKSES dan folder upload. Aman dijalankan berulang. */
function siapkan() {
  const ss = SpreadsheetApp.getActive();
  let data = ss.getSheetByName(DATA_SHEET);
  if (!data) {
    data = ss.insertSheet(DATA_SHEET);
    data.getRange(1, 1, 1, 5).setValues([['path', 'rev', 'diubah', 'oleh', 'json (lanjut ke kanan bila panjang)']]).setFontWeight('bold');
    data.setFrozenRows(1);
    data.setColumnWidth(1, 260);
  }
  let akses = ss.getSheetByName(AKSES_SHEET);
  if (!akses) {
    akses = ss.insertSheet(AKSES_SHEET);
    akses.getRange(1, 1, 1, 3).setValues([['Email', 'Peran', 'Catatan']]).setFontWeight('bold').setBackground('#2F6B4F').setFontColor('#ffffff');
    akses.getRange(2, 1, 1, 3).setValues([[ownerEmail_(), 'Pemilik', 'Pemilik spreadsheet (otomatis)']]);
    akses.getRange('B2:B200').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Pemilik', 'Editor', 'Viewer'], true).build());
    akses.setFrozenRows(1);
    akses.setColumnWidth(1, 280);
    akses.setColumnWidth(3, 260);
  }
  const props = PropertiesService.getScriptProperties();
  let folderId = props.getProperty('FOLDER_ID');
  let folder = null;
  if (folderId) { try { folder = DriveApp.getFolderById(folderId); } catch (e) { folder = null; } }
  if (!folder) {
    const it = DriveApp.getFoldersByName(FOLDER_NAME);
    folder = it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
    props.setProperty('FOLDER_ID', folder.getId());
  }
  if (!props.getProperty('REV')) props.setProperty('REV', '0');
  CacheService.getScriptCache().remove('idx');
  const msg = 'Siap.\n\nTab DATA dan AKSES sudah ada.\nFolder upload: ' + folder.getName() +
    '\n\nLangkah berikutnya: Deploy → New deployment → Web app.';
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) { Logger.log(msg); }
  return { folderId: folder.getId() };
}

function bukaFolder() {
  const id = PropertiesService.getScriptProperties().getProperty('FOLDER_ID');
  const url = id ? 'https://drive.google.com/drive/folders/' + id : '(jalankan Siapkan dulu)';
  try { SpreadsheetApp.getUi().alert('Folder upload:\n' + url); } catch (e) { Logger.log(url); }
}

/* ================= web app ================= */
function doGet() {
  return json_({ ok: true, app: 'content-plan-indo-group', rev: rev_() });
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (err) { return json_({ ok: false, code: 'bad_request', message: 'Permintaan tidak terbaca' }); }
  try {
    const out = handle_(body);
    out.ok = true;
    return json_(out);
  } catch (err) {
    if (err && err.code) return json_({ ok: false, code: err.code, message: err.message });
    return json_({ ok: false, code: 'server_error', message: String(err && err.message || err).slice(0, 300) });
  }
}

function handle_(b) {
  switch (b.action) {
    case 'ping': return { rev: rev_() };
    case 'me': { const email = verify_(b.token); const role = roleOf_(email); return { email: email, role: role, canEdit: role === 'Pemilik' || role === 'Editor' }; }
    case 'list': return list_(b.queries || []);
    case 'set': { const who = editor_(b.token); checkPath_(b.path); return { rev: write_(b.path, b.data, who) }; }
    case 'delete': { const who = editor_(b.token); checkPath_(b.path); return { rev: remove_(b.path, who) }; }
    case 'upload': { const who = editor_(b.token); return upload_(b, who); }
    case 'gs': { editor_(b.token); return { payload: sheetsTool_(b.tool, b.input || {}) }; }
  }
  throw err_('bad_request', 'Aksi tidak dikenal');
}

/* ================= login & akses ================= */
function err_(code, message) { const e = new Error(message); e.code = code; return e; }
function ownerEmail_() { return String(Session.getEffectiveUser().getEmail() || '').toLowerCase(); }

/** Memeriksa ID token Google (login di dashboard). Hasil disimpan 30 menit agar cepat. */
function verify_(token) {
  if (!token) throw err_('auth_required', 'Masuk dengan akun Google dulu.');
  if (!CLIENT_ID || CLIENT_ID.indexOf('ISI_CLIENT_ID') === 0) throw err_('not_configured', 'CLIENT_ID di Apps Script belum diisi.');
  const cache = CacheService.getScriptCache();
  const key = 'tok_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token)).slice(0, 43);
  let info = cache.get(key);
  if (info) info = JSON.parse(info);
  else {
    const r = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token), { muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) throw err_('auth_expired', 'Sesi login berakhir. Silakan masuk lagi.');
    const t = JSON.parse(r.getContentText());
    if (t.aud !== CLIENT_ID) throw err_('auth_invalid', 'Login ini bukan untuk dashboard Content Plan.');
    if (String(t.email_verified) !== 'true') throw err_('auth_invalid', 'Email Google belum terverifikasi.');
    info = { email: String(t.email).toLowerCase(), exp: Number(t.exp) };
    const ttl = Math.min(1800, info.exp - Math.floor(Date.now() / 1000));
    if (ttl > 5) cache.put(key, JSON.stringify(info), ttl);
  }
  if (info.exp * 1000 < Date.now()) throw err_('auth_expired', 'Sesi login berakhir. Silakan masuk lagi.');
  return info.email;
}

/** Peran dari tab AKSES: Pemilik / Editor / Viewer. Email yang tidak terdaftar = Viewer. */
function roleOf_(email) {
  email = String(email || '').toLowerCase().trim();
  if (email && email === ownerEmail_()) return 'Pemilik';
  const sh = SpreadsheetApp.getActive().getSheetByName(AKSES_SHEET);
  if (!sh || sh.getLastRow() < 2) return 'Viewer';
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues();
  for (const r of rows) {
    if (String(r[0]).toLowerCase().trim() === email) {
      const p = String(r[1]).trim().toLowerCase();
      return p === 'pemilik' ? 'Pemilik' : p === 'editor' ? 'Editor' : 'Viewer';
    }
  }
  return 'Viewer';
}

function editor_(token) {
  const email = verify_(token);
  const role = roleOf_(email);
  if (role !== 'Pemilik' && role !== 'Editor') throw err_('not_editor', 'Email ' + email + ' belum terdaftar sebagai Editor di tab AKSES.');
  return email;
}

function checkPath_(p) {
  if (typeof p !== 'string' || !/^[A-Za-z0-9_\-.~:@+]+(\/[A-Za-z0-9_\-.~:@+]+)*$/.test(p) || p.split('/').length % 2 !== 0)
    throw err_('invalid_argument', 'Alamat dokumen tidak valid');
}

/* ================= database (tab DATA) ================= */
function sheet_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(DATA_SHEET);
  if (!sh) throw err_('not_configured', 'Tab DATA belum ada. Jalankan menu Content Plan → Siapkan.');
  return sh;
}
function rev_() { return Number(PropertiesService.getScriptProperties().getProperty('REV') || 0); }

/** Index path → [baris, rev], disimpan di cache agar membaca cepat. */
function index_(force) {
  const cache = CacheService.getScriptCache();
  if (!force) { const c = cache.get('idx'); if (c) { try { return JSON.parse(c); } catch (e) {} } }
  const sh = sheet_(), n = sh.getLastRow() - 1, idx = {};
  if (n > 0) sh.getRange(2, 1, n, 2).getValues().forEach((r, i) => { if (r[0]) idx[r[0]] = [i + 2, Number(r[1]) || 0]; });
  const s = JSON.stringify(idx);
  if (s.length < 95000) cache.put('idx', s, 21600);
  return idx;
}

function readDoc_(sh, row) {
  const last = sh.getLastColumn();
  if (last < FIRST_CHUNK_COL) return null;
  const vals = sh.getRange(row, FIRST_CHUNK_COL, 1, last - FIRST_CHUNK_COL + 1).getValues()[0];
  let s = '';
  for (const v of vals) { if (v === '' || v === null) break; s += String(v).slice(1); }  // tiap potongan diawali '~'
  try { return JSON.parse(s); } catch (e) { return null; }
}

function match_(path, prefix) {
  if (prefix.slice(-1) !== '/') return path === prefix;               // satu dokumen
  if (path.indexOf(prefix) !== 0) return false;                      // koleksi: anak langsung saja
  return path.slice(prefix.length).indexOf('/') < 0;
}

/** queries: [{prefix, since}] → dokumen yang berubah sejak `since`, plus semua path di prefix itu. */
function list_(queries) {
  const rev = rev_();
  if (queries.length && queries.every(q => Number(q.since) === rev)) return { rev: rev, same: true };
  const idx = index_(), sh = sheet_(), res = [];
  for (const q of queries) {
    const prefix = String(q.prefix || ''), since = Number(q.since);
    const paths = [], docs = [];
    for (const p in idx) {
      if (!match_(p, prefix)) continue;
      paths.push(p);
      if (!(idx[p][1] <= since)) { const d = readDoc_(sh, idx[p][0]); if (d !== null) docs.push({ path: p, data: d }); }
    }
    res.push({ prefix: prefix, paths: paths, docs: docs });
  }
  return { rev: rev, res: res };
}

function write_(path, data, who) {
  const s = JSON.stringify(data == null ? {} : data);
  const parts = [];
  for (let i = 0; i < s.length; i += CHUNK) parts.push('~' + s.slice(i, i + CHUNK));  // '~' mencegah Sheets membaca teks sebagai rumus/angka
  if (!parts.length) parts.push('~{}');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = sheet_(), props = PropertiesService.getScriptProperties();
    const rev = rev_() + 1;
    let idx = index_(), row = idx[path] ? idx[path][0] : 0;
    if (row && sh.getRange(row, 1).getValue() !== path) { idx = index_(true); row = idx[path] ? idx[path][0] : 0; }
    if (!row) row = sh.getLastRow() + 1;
    const last = Math.max(sh.getLastColumn(), FIRST_CHUNK_COL + parts.length - 1);
    const vals = [path, rev, Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm'), who || ''].concat(parts);
    while (vals.length < last) vals.push('');
    sh.getRange(row, 1, 1, vals.length).setValues([vals]);
    props.setProperty('REV', String(rev));
    idx[path] = [row, rev];
    CacheService.getScriptCache().put('idx', JSON.stringify(idx), 21600);
    return rev;
  } finally { lock.releaseLock(); }
}

function remove_(path, who) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = sheet_(), idx = index_(true);
    if (!idx[path]) return rev_();
    sh.deleteRow(idx[path][0]);
    const rev = rev_() + 1;
    PropertiesService.getScriptProperties().setProperty('REV', String(rev));
    CacheService.getScriptCache().remove('idx');
    return rev;
  } finally { lock.releaseLock(); }
}

/* ================= upload ke Google Drive ================= */
function folder_() {
  const id = PropertiesService.getScriptProperties().getProperty('FOLDER_ID');
  if (!id) throw err_('not_configured', 'Folder upload belum dibuat. Jalankan menu Content Plan → Siapkan.');
  return DriveApp.getFolderById(id);
}

function upload_(b, who) {
  const mime = String(b.mime || '');
  if (!/^image\/(png|jpeg|webp|gif|svg\+xml)$/.test(mime)) throw err_('unsupported_type', 'Format harus PNG, JPG, WEBP, GIF atau SVG');
  const bytes = Utilities.base64Decode(String(b.b64 || ''));
  if (bytes.length > MAX_UPLOAD) throw err_('too_large', 'File terlalu besar (maks. 10 MB)');
  const name = String(b.name || 'upload').replace(/[\\/:*?"<>|]/g, '_').slice(0, 120);
  const file = folder_().createFile(Utilities.newBlob(bytes, mime, name));
  file.setDescription('Diupload dari dashboard oleh ' + who);
  shareForViewing_(file);
  return { id: file.getId() };
}

/** Gambar harus bisa dilihat semua pembuka link dashboard. Jika domain kantor melarang, cukup untuk 1 domain. */
function shareForViewing_(file) {
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }
  catch (e) { try { file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW); } catch (e2) {} }
}

/* ================= backup / impor Google Sheets (tombol di Pengaturan) ================= */
/* Butuh layanan lanjutan "Google Sheets API" (sudah diatur di appsscript.json). */
function sheetsTool_(tool, input) {
  try {
    switch (tool) {
      case 'get_values': return { values: (Sheets.Spreadsheets.Values.get(input.spreadsheetId, input.range).values) || [] };
      case 'get_spreadsheet': return { sheets: (Sheets.Spreadsheets.get(input.spreadsheetId, { fields: (input.fields || ['sheets.properties']).join(',') }).sheets) || [] };
      case 'update_values': Sheets.Spreadsheets.Values.update({ values: input.values }, input.spreadsheetId, input.range, { valueInputOption: 'USER_ENTERED' }); return { done: true };
      case 'update_spreadsheet': Sheets.Spreadsheets.batchUpdate({ requests: input.requests || [] }, input.spreadsheetId); return { done: true };
    }
  } catch (e) { throw err_('tool_error', String(e && e.message || e)); }
  throw err_('tool_error', 'Perintah Google Sheets tidak dikenal: ' + tool);
}

/* ================= pindahan dari dashboard Claude ================= */
/**
 * Upload file data-export.json ke folder upload (atau di mana saja di Drive Anda),
 * lalu jalankan fungsi ini sekali. Logo lama ikut dipindah ke folder upload.
 */
function imporDataLama() {
  const it = DriveApp.getFilesByName('data-export.json');
  if (!it.hasNext()) { const m = 'File data-export.json tidak ditemukan di Google Drive. Upload dulu filenya.'; try { SpreadsheetApp.getUi().alert(m); } catch (e) {} throw new Error(m); }
  const exp = JSON.parse(it.next().getBlob().getDataAsString('UTF-8'));
  const folder = folder_(), map = {};
  Object.keys(exp.assets || {}).forEach(oldId => {
    const a = exp.assets[oldId];
    const f = folder.createFile(Utilities.newBlob(Utilities.base64Decode(a.b64), a.mime, a.name || oldId));
    shareForViewing_(f);
    map[oldId] = f.getId();
  });
  let n = 0;
  (exp.docs || []).forEach(d => {
    let s = JSON.stringify(d.data);
    Object.keys(map).forEach(o => { s = s.split(o).join(map[o]); });
    write_(d.path, JSON.parse(s), 'impor');
    n++;
  });
  const msg = 'Impor selesai: ' + n + ' dokumen, ' + Object.keys(map).length + ' gambar dipindah ke folder upload.';
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) { Logger.log(msg); }
  return { docs: n, assets: Object.keys(map).length };
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
