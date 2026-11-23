# Panduan publikasi Content Plan Indo Group (GitHub manual + Google Sheets)

Panduan ini untuk upload **manual lewat website GitHub**: tanpa Git, tanpa Codex, tanpa install apa pun.

Urutannya sengaja dimulai dari GitHub, karena alamat GitHub Pages dibutuhkan untuk mengisi **App domain** di Google Auth Platform.

Hasil akhirnya:

| Bagian | Tempat |
|---|---|
| Dashboard | `https://USERNAME.github.io/content-plan-indo-group/` |
| Database | 1 Google Spreadsheet (tab `DATA` + tab `AKSES`) |
| Logo & screenshot | 1 folder Google Drive |
| Login | Akun Google. Editor = email di tab `AKSES`, selain itu hanya melihat |

Waktu yang dibutuhkan sekitar 60 menit, sekali saja. Di semua langkah, **ganti `USERNAME` dengan username GitHub Anda** (huruf kecil semua).

---

## Daftar file

Semua ada di folder `D:\MONIK\MONIK DISINI\content-planner\github`.

| File | Fungsi | Upload ke GitHub? |
|---|---|---|
| `index.html` | Dashboard | ✅ |
| `config.js` | Alamat server + Client ID (diisi di langkah 7) | ✅ |
| `cp-backend.js` | Penghubung dashboard ↔ server Apps Script | ✅ |
| `privacy.html` | Kebijakan Privasi (untuk Google Auth Platform) | ✅ |
| `terms.html` | Ketentuan Penggunaan (untuk Google Auth Platform) | ✅ |
| `README.md`, `PANDUAN.md` | Keterangan | ✅ |
| `apps-script/Code.gs`, `apps-script/appsscript.json` | Kode server (ditempel di Apps Script; di GitHub hanya sebagai arsip) | ✅ |
| `build-github.ps1`, `.gitignore` | Alat bantu di komputer | ❌ tidak perlu |
| `..\migrasi\data-export.json` | Data & logo dari dashboard Claude | ❌ **jangan**, berisi data internal |

> Repo GitHub Pages gratis harus **publik**, jadi file-file di atas bisa dilihat orang. Ini aman: tidak ada kata sandi di dalamnya, dan data content plan tetap tersimpan di spreadsheet Anda.

---

## Langkah 0 — Email kontak di halaman privasi

Google mewajibkan Kebijakan Privasi punya kontak. `privacy.html` dan `terms.html` sudah berisi kontak **creative.indogroup@gmail.com**, jadi langkah ini tidak perlu dikerjakan.

> Jangan buka lalu simpan kedua file ini dengan aplikasi pengolah kata (Word, WordPad). Kode HTML-nya akan hilang dan halaman tampil berantakan. Jika perlu mengedit, gunakan Notepad.

---

## Langkah 1 — Buat akun & repository GitHub

1. Jika belum punya akun, daftar di <https://github.com/signup> lalu verifikasi email.
2. Buka <https://github.com/new>, lalu isi:
   - **Repository name**: `content-plan-indo-group`
   - **Description** (opsional): `Dashboard content plan Indo Group`
   - Pilih **Public**
   - Centang **Add a README file**. Ini membuat repo langsung siap diisi.
   - Klik **Create repository**.

## Langkah 2 — Upload file ke GitHub

1. Di halaman repo, klik **Add file → Upload files**.
2. Buka folder `D:\MONIK\MONIK DISINI\content-planner\github` di File Explorer.
3. Seret ke kotak upload di browser:
   - `index.html`
   - `config.js`
   - `cp-backend.js`
   - `privacy.html`
   - `terms.html`
   - `README.md` (menimpa README bawaan)
   - `PANDUAN.md`
   - folder **`apps-script`** (seret foldernya langsung; isinya ikut terupload)
4. Di bawah, **Commit changes** → isi pesan `Upload dashboard` → **Commit changes**.
5. Periksa daftar file di repo: harus ada `index.html` di halaman utama repo, bukan di dalam subfolder.

## Langkah 3 — Nyalakan GitHub Pages

1. Di repo: **Settings** (tab paling kanan) → menu kiri **Pages**.
2. Atur sumbernya:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main`, folder `/ (root)`
   - **Save**
3. Tunggu 1–3 menit, lalu muat ulang halaman Settings → Pages. Muncul tulisan seperti
   **"Your site is live at `https://USERNAME.github.io/content-plan-indo-group/`"**.
4. Buka 3 alamat ini dan pastikan semuanya bisa terbuka:
   - `https://USERNAME.github.io/content-plan-indo-group/` → dashboard (masih bertuliskan "Server belum tersambung", ini normal)
   - `https://USERNAME.github.io/content-plan-indo-group/privacy.html`
   - `https://USERNAME.github.io/content-plan-indo-group/terms.html`

Simpan ketiga alamat ini untuk langkah 5.

---

## Langkah 4 — Buat spreadsheet database + Apps Script

1. Buka <https://sheets.new> dengan akun Google utama Anda (akun ini menjadi **Pemilik**). Beri nama **Content Plan Indo Group – DATABASE**.
2. Menu **Extensions (Ekstensi) → Apps Script**.
3. Di editor Apps Script:
   1. Klik ⚙️ **Project Settings** → centang **Show "appsscript.json" manifest file in editor**.
   2. Kembali ke **Editor** (ikon `< >`).
   3. Buka `appsscript.json`, hapus semua isinya, lalu tempel isi file `apps-script/appsscript.json`.
   4. Buka `Code.gs`, hapus semua isinya, lalu tempel isi file `apps-script/Code.gs`.
   5. Klik 💾 **Save**.
4. Ganti nama proyek ("Untitled project", kiri atas) menjadi **Content Plan Server**.

---

## Langkah 5 — Google Auth Platform (login Google)

Buka <https://console.cloud.google.com/> dengan akun yang sama.

### 5a. Buat project
1. Klik pemilih project di atas → **New Project**.
2. **Project name**: `content-plan-indo-group` → **Create**.
3. Pastikan project itu yang terpilih di atas.

### 5b. Mulai Google Auth Platform
1. Menu ☰ → **Google Auth Platform** (atau **APIs & Services → OAuth consent screen**) → **Get started**.
2. **App Information**:
   - **App name**: `Content Plan Indo Group`
   - **User support email**: email Anda
3. **Audience**:
   - **Internal**: hanya bisa dipilih jika semua anggota tim memakai Google Workspace kantor yang sama.
   - **External**: pilih ini jika ada anggota tim yang memakai Gmail biasa.
4. **Contact Information**: email Anda.
5. Centang persetujuan → **Continue** → **Create**.

### 5c. Branding: App domain & Authorized domain
Menu kiri **Branding**, lalu isi:

| Kolom | Isi |
|---|---|
| App name | `Content Plan Indo Group` |
| User support email | email Anda |
| App logo | *kosongkan*. Jika diisi, Google meminta verifikasi yang lama. |
| **Application home page** | `https://USERNAME.github.io/content-plan-indo-group/` |
| **Application privacy policy link** | `https://USERNAME.github.io/content-plan-indo-group/privacy.html` |
| **Application terms of service link** | `https://USERNAME.github.io/content-plan-indo-group/terms.html` |
| **Authorized domains** → **Add domain** | `USERNAME.github.io` |
| Developer contact information | email Anda |

Klik **Save**.

Catatan untuk kolom **Authorized domains**:
- Isi **`USERNAME.github.io`**, bukan `github.io` saja, dan tanpa `https://` maupun garis miring.
- Google menerima `USERNAME.github.io` karena `github.io` termasuk daftar *public suffix*, sehingga setiap `USERNAME.github.io` dianggap domain sendiri.
- Ketiga link di atas harus berada di domain ini, dan memang sudah.
- Jika muncul peringatan bahwa domain harus diverifikasi, abaikan untuk sekarang. Verifikasi domain (Search Console) hanya wajib saat meminta *brand verification*. Aplikasi ini hanya memakai login dasar (nama & email), jadi bisa langsung dipakai tanpa verifikasi.

### 5d. Audience: publikasikan
(Hanya jika memilih **External**.)
1. Menu kiri **Audience** → **Publishing status: Testing** → klik **Publish app** → **Confirm**.
2. Status berubah menjadi **In production**. Tanpa ini, hanya akun yang ditambahkan sebagai *Test users* yang bisa login.

### 5e. Data Access
Tidak perlu menambah scope apa pun. Login dasar (`openid`, `email`, `profile`) otomatis tersedia.

### 5f. Buat Client ID
1. Menu kiri **Clients** → **Create client**:
   - **Application type**: `Web application`
   - **Name**: `Dashboard GitHub`
   - **Authorized JavaScript origins** → **Add URI** → `https://USERNAME.github.io` (tanpa nama repo, tanpa garis miring di akhir)
   - **Authorized redirect URIs**: kosongkan
   - **Create**
2. Salin **Client ID** (berakhiran `.apps.googleusercontent.com`).

> Perubahan di Google Auth Platform kadang baru berlaku setelah 5–10 menit.

---

## Langkah 6 — Siapkan & online-kan server Apps Script

### 6a. Isi Client ID dan jalankan "siapkan"
1. Di editor Apps Script, baris paling atas `Code.gs`:
   ```js
   const CLIENT_ID = 'TEMPEL_CLIENT_ID_DI_SINI.apps.googleusercontent.com';
   ```
   **Save**.
2. Pilih fungsi **`siapkan`** di dropdown toolbar → **Run**.
3. Muncul **Authorization required** → **Review permissions** → pilih akun Anda.
   - Jika muncul "Google hasn't verified this app": klik **Advanced → Go to Content Plan Server (unsafe)**. Ini aman karena aplikasinya buatan Anda sendiri.
   - Klik **Allow**.
4. Muat ulang spreadsheet. Kini ada:
   - tab **DATA**
   - tab **AKSES** (email Anda sudah tercatat sebagai `Pemilik`)
   - menu **Content Plan**
   - folder Drive **Content Plan Indo Group - Upload**

### 6b. Daftarkan Editor
Di tab **AKSES**, satu email per baris:

| Email | Peran | Catatan |
|---|---|---|
| nama@gmail.com | Editor | Tim konten |

Email yang tidak terdaftar otomatis hanya bisa melihat (Viewer).

### 6c. Deploy sebagai Web app
1. **Deploy → New deployment** → ⚙️ di samping "Select type" → **Web app**.
2. Isi pengaturannya:
   - **Description**: `v1`
   - **Execute as**: **Me**
   - **Who has access**: **Anyone**
3. **Deploy**, lalu salin **Web app URL** (berakhiran `/exec`).
4. Uji: buka URL itu di browser. Harus muncul `{"ok":true,"app":"content-plan-indo-group",...}`.

### 6d. Pindahkan data dari dashboard Claude
1. Upload `D:\MONIK\MONIK DISINI\content-planner\migrasi\data-export.json` ke Google Drive (folder mana saja).
2. Di spreadsheet: menu **Content Plan → 2. Impor data lama (data-export.json)**.
3. Tunggu pesan *"Impor selesai: 5 dokumen, 9 gambar dipindah ke folder upload."*
4. Hapus `data-export.json` dari Google Drive.

---

## Langkah 7 — Isi `config.js` langsung di GitHub

1. Di repo GitHub, klik file **`config.js`** → ikon ✏️ **Edit this file**.
2. Ganti 2 nilainya:
   ```js
   window.CP_CONFIG = {
     API_URL: "https://script.google.com/macros/s/AKfycb.../exec",
     CLIENT_ID: "1234567890-abcdefg.apps.googleusercontent.com"
   };
   ```
3. **Commit changes…** → **Commit changes**.
4. Tunggu 1–2 menit sampai GitHub Pages memperbarui halaman. Statusnya bisa dilihat di tab **Actions**: tanda ✅ hijau berarti selesai.

> Simpan juga perubahan yang sama di file `config.js` di komputer, supaya tidak tertimpa saat upload ulang nanti.

---

## Langkah 8 — Uji

1. Buka `https://USERNAME.github.io/content-plan-indo-group/` di **jendela Incognito** (`Ctrl+Shift+N`).
   - Konten November 2026 tampil, dengan banner **Mode baca saja**.
   - Menu **Pengaturan** tidak ada.
2. Klik **Sign in with Google** di kiri bawah dan masuk dengan email Editor.
   - Banner hilang, Pengaturan muncul, dan tabel bisa diedit.
3. Ubah satu sel, tunggu tulisan **Tersimpan** di kiri bawah.
   - Di spreadsheet, tab **DATA**, kolom `oleh` berisi email Anda.
4. Upload satu screenshot di kolom SCREENSHOT.
   - Filenya muncul di folder **Content Plan Indo Group - Upload**.
5. Bagikan link dashboard ke tim.

---

## Memperbarui di kemudian hari

**Dashboard berubah** (misalnya setelah revisi di Claude):

1. Jalankan perintah ini di PowerShell:
   ```powershell
   powershell -ExecutionPolicy Bypass -File "D:\MONIK\MONIK DISINI\content-planner\github\build-github.ps1"
   ```
2. Di repo GitHub: **Add file → Upload files** → seret `index.html` yang baru → **Commit changes**. File lama otomatis tertimpa.

**`Code.gs` berubah**:

1. Tempel ulang kodenya di Apps Script.
2. **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**.

URL `/exec` tetap sama.

**Menambah atau mencabut Editor**: cukup ubah tab **AKSES**. Berlaku tanpa deploy ulang.

---

## Masalah umum

| Gejala | Penyebab & solusi |
|---|---|
| Halaman GitHub 404 | Pages belum aktif atau `index.html` tidak berada di halaman utama repo (langkah 2.5 & 3). |
| "Server belum tersambung. Periksa config.js" | `API_URL` belum diisi atau salah. Gunakan Web app URL berakhiran `/exec`. |
| "Jawaban server tidak terbaca" | Web app tidak di-set **Who has access: Anyone**, atau belum deploy versi baru setelah mengubah kode. |
| Tombol login tidak muncul / `origin_mismatch` | `https://USERNAME.github.io` belum ada di **Authorized JavaScript origins** (5f). Tunggu 5–10 menit setelah menyimpan. |
| Branding menolak link privasi | Link harus berada di domain yang tercantum di **Authorized domains** (`USERNAME.github.io`) dan halamannya harus bisa dibuka (langkah 3.4). |
| Login berhasil tapi tetap "Mode baca saja" | Email belum ada di tab **AKSES**, salah ketik, atau peran bukan `Editor`. |
| "Login ini bukan untuk dashboard Content Plan" | `CLIENT_ID` di `Code.gs` berbeda dengan `config.js`. Samakan, lalu deploy versi baru. |
| Hanya beberapa orang yang bisa login | Status masih **Testing**. Klik **Publish app** (5d). |
| Logo/screenshot tidak tampil untuk orang luar kantor | Google Workspace kantor melarang berbagi file ke publik. Gambar hanya tampil untuk akun di domain kantor. |

## Batasan

- **Bukan real-time instan**: perubahan orang lain muncul dalam ±10 detik.
- **Siapa pun yang memegang link dashboard bisa membaca isi content plan**, seperti Google Sheets "Anyone with the link can view". Pengaturan tetap tersembunyi, dan hak ubah hanya untuk email di tab AKSES.
- **Login berlaku ±1 jam**, lalu Google meminta masuk lagi secara otomatis.
- **Dashboard di Claude tetap ada.** Datanya terpisah dari versi GitHub setelah pindahan, jadi pilih satu yang dipakai tim.
