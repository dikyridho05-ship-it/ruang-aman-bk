# Ruang Aman BK

Platform konseling anonim untuk siswa sekolah (studi kasus: SMKN 1 Ciruas).
Arsitektur Multi-App (Micro-frontend) dengan satu backend Firebase terpusat.

## Struktur Proyek

```
ruang-aman-bk/
├── app-a-publik/        # Next.js App Router — Siswa (anonim) & Guru BK
│   └── src/
│       ├── app/          # halaman & Server Actions (ditambah di TAHAP 2-4)
│       └── lib/firebase/
│           ├── client.ts # Firebase Client SDK — HANYA untuk Auth di browser
│           └── admin.ts  # Firebase Admin SDK — HANYA dipakai di server
├── app-b-admin/         # Next.js App Router — Super Admin (internal)
│   └── src/              # struktur sama seperti app-a-publik
├── firebase/
│   ├── firestore.rules   # rules terpusat untuk SATU project Firebase
│   └── storage.rules
├── firebase.json         # config untuk `firebase deploy`
└── .firebaserc.example   # salin jadi .firebaserc, isi project ID asli
```

Kedua app adalah proyek Next.js yang **sepenuhnya independen** (package.json,
node_modules, deploy masing-masing terpisah — cocok untuk dua target
Vercel project atau dua subdomain berbeda). Yang menyatukan keduanya
hanyalah satu project Firebase yang sama sebagai backend.

## Kenapa ada `client.ts` DAN `admin.ts`?

- **`client.ts`** (Firebase Client SDK) — jalan di browser. Di proyek ini
  sengaja **hanya dipakai untuk Firebase Authentication** (login Guru BK di
  App A, login Super Admin di App B). Tidak mengekspor Firestore/Storage.
- **`admin.ts`** (Firebase Admin SDK) — jalan di server (Next.js Server
  Actions / Route Handlers), pakai kredensial Service Account. Admin SDK
  **bypass Security Rules**, jadi semua baca/tulis data (curhatan siswa,
  balasan, identitas sekolah, akun Guru BK) HARUS lewat sini.

Efeknya: `firebase/firestore.rules` & `firebase/storage.rules` bisa dikunci
total (`allow read, write: if false`) karena client tidak pernah akses
data langsung — persis requirement keamanan App A yang kamu minta, dan
diterapkan konsisten juga di App B.

## Setup Awal (sekali untuk kedua app)

### 1. Buat Firebase Project

1. Buka [Firebase Console](https://console.firebase.google.com) → **Add project**.
2. Setelah project jadi, tambahkan **Web App** (ikon `</>`) — lakukan ini
   dua kali kalau mau app terpisah di Firebase Console (opsional, tidak wajib;
   satu Web App config bisa dipakai kedua app Next.js karena sama-sama
   cuma butuh `firebaseConfig` yang sama).

### 2. Aktifkan layanan yang dipakai

Di sidebar Firebase Console:

- **Authentication** → tab *Sign-in method* → aktifkan **Email/Password**
  (dipakai login Guru BK & Super Admin).
- **Firestore Database** → *Create database* → pilih mode **production**
  (rules akan kita kunci manual, bukan lewat mode "test").
- **Storage** → *Get started* → pilih mode **production** juga.

### 3. Ambil Firebase Client Config

*Project Settings* (ikon gerigi) → *General* → scroll ke **Your apps** →
pilih Web App → *SDK setup and configuration* → salin nilai-nilai
`apiKey`, `authDomain`, `projectId`, dst.

### 4. Generate Service Account Key (untuk Admin SDK)

*Project Settings* → tab **Service accounts** → *Generate new private key*
→ akan terunduh file `.json`. Dari file itu kamu butuh 3 nilai:
`project_id`, `client_email`, `private_key`.

**Jaga file ini baik-baik** — siapa pun yang punya file ini punya akses
admin penuh ke Firestore/Storage/Auth project kamu, tanpa terikat security
rules.

### 5. Isi Environment Variables

Untuk **masing-masing** app (`app-a-publik/` dan `app-b-admin/`):

```bash
cp .env.local.example .env.local
```

Lalu isi `.env.local` dengan nilai dari langkah 3 & 4. **Kedua app harus
diisi dengan project Firebase yang SAMA** — itu yang membuat keduanya
berbagi satu backend terpusat.

> Untuk `FIREBASE_ADMIN_PRIVATE_KEY`, salin isi field `private_key` dari
> file JSON apa adanya (termasuk karakter `\n` literal di dalamnya), lalu
> bungkus dengan tanda kutip ganda seperti contoh di file `.env.local.example`.

### 6. Install dependencies & jalankan

Di masing-masing folder app (dua terminal terpisah):

```bash
cd app-a-publik && npm install && npm run dev   # → http://localhost:3000
cd app-b-admin  && npm install && npm run dev   # → http://localhost:3001
```

### 7. (Nanti, setelah rules disesuaikan lebih lanjut) Deploy rules

```bash
npm install -g firebase-tools   # sekali saja
firebase login
cp .firebaserc.example .firebaserc   # lalu isi project ID asli
firebase deploy --only firestore:rules,storage:rules
```

## TAHAP 2 — Server Action pembuatan tiket curhat

File baru di `app-a-publik/src/`:

```
actions/curhat.ts             # Server Action createCurhatTicket(formData) — satu-satunya
                               # jalan untuk menulis data curhat ke Firestore
lib/validation/curhat.ts      # skema zod — validasi di server, tidak bisa dilewati client
lib/crypto/password.ts        # hash/verify password (bcrypt, tidak pernah plaintext)
lib/firestore/kode-konseling.ts  # generator BK-{tahun}-{0000} — transaction-safe
types/ticket.ts                # tipe & enum: kategori, mood, status tiket
```

Struktur data di Firestore:
- `curhatan/{kode}` — dokumen tiket (kategori, mood, judul, namaSamaran, passwordHash,
  status, siapBertemuGuruBk). Kode Konseling dipakai langsung sebagai Document ID.
- `curhatan/{kode}/pesan/{id}` — subcollection chat (pengirim: "siswa" | "guru", isi, createdAt)
- `counters/{tahun}` — dokumen internal buat generate nomor urut kode konseling

Sudah diverifikasi: `npx tsc --noEmit` bersih dan `npm run build` sukses.

Dependency baru: `zod` (validasi input) dan `bcryptjs` (hash password) — sudah ada di
`package.json`, tinggal `npm install` ulang untuk menariknya.

## TAHAP 3 — Beranda dinamis + Form Curhat (UI)

File baru/berubah di `app-a-publik/src/`:

```
app/page.tsx                  # UBAH: Beranda dinamis, baca settings/sekolah dari Firestore
app/curhat/page.tsx           # BARU: halaman alur curhat
components/CurhatFlow.tsx     # BARU: consent (tahan 2 detik) → form → layar sukses+kode
components/KategoriPicker.tsx # BARU: pemilih kategori masalah
components/MoodPicker.tsx     # BARU: mood meter (emoji)
components/PasswordField.tsx  # BARU: input password dengan show/hide
components/EmergencyButton.tsx# BARU: tombol darurat (Sejiwa 119 ext 8, SAPA 129)
lib/firestore/settings.ts     # BARU: getSekolahSettings() — nama & logo sekolah, dengan fallback aman
lib/constants/emergency.ts    # BARU: daftar kontak darurat resmi
actions/curhat.ts             # UBAH: tambah curhatFormAction (wrapper untuk useActionState)
```

Sudah dibuatkan juga dokumen awal `settings/sekolah` di Firestore (`namaSekolah: "SMKN 1 Ciruas"`)
lewat Firestore Console, supaya Beranda langsung tampil isi yang benar — nanti tinggal
diedit dari App B (TAHAP 5) begitu ada, termasuk upload logo (disimpan sebagai `logoBase64`,
bukan Firebase Storage — lihat catatan di percakapan soal kenapa).

Diverifikasi: `npx tsc --noEmit` bersih dan `npm run build` sukses (route `/` jadi dynamic
karena baca Firestore tiap request, `/curhat` statis). Cek langsung ke Firestore tidak bisa
dites dari sandbox cloud ini (jaringannya diblokir kebijakan organisasi ke `firestore.googleapis.com`) —
jalankan `npm run dev` di komputer kamu sendiri untuk lihat hasilnya sungguhan.

## TAHAP 4 — Portal chat Siswa ↔ Guru BK

File baru/berubah di `app-a-publik/src/`:

```
lib/session/guru-session.ts    # BARU: session cookie Guru BK (Firebase Auth session cookie,
                                # + wajib terdaftar & aktif di collection `guru`)
lib/session/siswa-session.ts   # BARU: sesi "cek balasan" siswa — TANPA Firebase Auth, token
                                # disimpan langsung di dokumen tiket (bukan JWT/secret baru)
actions/auth.ts                # BARU: loginGuruAction / logoutGuruAction
actions/cek-balasan.ts         # BARU: verifyCurhatAccessAction (verifikasi kode+password)
actions/chat.ts                # BARU: kirim/ambil pesan (siswa & Guru BK), tandai selesai —
                                # SEMUA lewat Admin SDK, kode siswa diambil dari sesi (tidak
                                # bisa "mengaku-ngaku" akses tiket kode lain)
components/ChatThread.tsx      # BARU: UI chat ala WhatsApp, dipakai bersama siswa & Guru BK,
                                # update via POLLING tiap 4 detik (bukan Firestore onSnapshot —
                                # browser tetap tidak pernah sentuh Firestore langsung)
components/LogoutButton.tsx    # BARU: tombol keluar Guru BK
components/MarkSelesaiButton.tsx # BARU: tombol tandai tiket selesai
components/CekBalasanFlow.tsx  # BARU: form kode+password → percakapan (siswa)
app/cek-balasan/page.tsx       # BARU: halaman cek balasan siswa
app/guru/login/page.tsx        # BARU: login Guru BK (sign-in Firebase Auth di client,
                                # sisanya diverifikasi ulang di server)
app/guru/page.tsx              # BARU: dashboard daftar curhatan masuk (Guru BK)
app/guru/[kode]/page.tsx       # BARU: detail tiket + percakapan (Guru BK)
types/ticket.ts                # UBAH: tambah SerializedMessage, GuruProfile, MOOD_LABEL/EMOJI
                                # (dipindah dari MoodPicker.tsx supaya tidak duplikat)
components/MoodPicker.tsx      # UBAH: import MOOD_LABEL/EMOJI dari types/ticket.ts
app/page.tsx                   # UBAH: tambah link "Cek Balasan" & "Login Guru BK"
```

Alur status tiket: `baru` → (Guru BK buka tiket) → `dibaca` → (Guru BK balas) → `dibalas` →
(Guru BK tandai selesai) → `selesai`.

Sudah dibuatkan juga 1 akun **Guru BK contoh** untuk testing langsung (lewat Firebase Console):
- Firebase Authentication: `gurubk.test@ruangamanbk.local` / `(sudah diganti, cek Firebase Console)`
- Dokumen Firestore `guru/{uid}`: `{ nama: "Guru BK Test", email: "gurubk.test@ruangamanbk.local", aktif: true }`

**Ganti/hapus akun ini nanti** setelah TAHAP 5 (App B) selesai dan kamu bisa kelola akun Guru BK
sungguhan dari Super Admin dashboard.

Diverifikasi: `npx tsc --noEmit` bersih dan `npm run build` sukses (route `/guru` dan
`/guru/[kode]` jadi dynamic karena butuh sesi login tiap request; `/guru/login` dan
`/cek-balasan` statis). Cek end-to-end langsung ke Firestore tidak bisa dites dari sandbox
cloud ini (jaringan ke `firestore.googleapis.com` diblokir kebijakan organisasi) — jalankan
`npm run dev` di komputer kamu sendiri untuk coba alur chat sungguhan.

## TAHAP 5 — Dashboard Super Admin (App B)

File baru/berubah di `app-b-admin/src/` (+ `zod` ditambah ke `package.json`, sudah `npm install`):

```
types/admin.ts                 # BARU: AdminProfile, GuruAccount, SekolahSettings
lib/session/admin-session.ts   # BARU: session cookie Super Admin — pola sama dengan sesi
                                # Guru BK di App A (login client, verifikasi + cek
                                # `admins/{uid}.aktif` di server, session cookie httpOnly)
actions/auth.ts                # BARU: loginAdminAction / logoutAdminAction
lib/firestore/settings.ts      # BARU: getSekolahSettings() (nilai awal form Pengaturan)
actions/settings.ts            # BARU: updateSekolahSettingsAction — ganti nama sekolah +
                                # upload logo (diterima sebagai File lewat FormData, dikonversi
                                # ke base64 DI SERVER, disimpan ke settings/sekolah; validasi
                                # tipe PNG/JPEG/WebP & maks 300 KB)
actions/guru.ts                # BARU: listGuruAction, createGuruAction (Auth user + dokumen
                                # guru/{uid}, dengan rollback akun Auth kalau tulis Firestore-nya
                                # gagal), setGuruAktifAction (nonaktifkan langsung mencabut sesi
                                # Guru BK yang sedang aktif via revokeRefreshTokens), deleteGuruAction
components/LogoutButton.tsx    # BARU: tombol keluar Super Admin
components/PengaturanForm.tsx  # BARU: form nama sekolah + upload logo dengan preview
components/AddGuruForm.tsx     # BARU: form tambah akun Guru BK baru
components/GuruList.tsx        # BARU: daftar akun Guru BK — aktifkan/nonaktifkan/hapus
app/login/page.tsx             # BARU: login Super Admin
app/page.tsx                   # UBAH: dashboard home (guard sesi) — nav ke Pengaturan & Guru BK
app/pengaturan/page.tsx        # BARU: halaman ganti identitas sekolah
app/guru-bk/page.tsx           # BARU: halaman kelola akun Guru BK
```

Semua operasi tetap lewat Server Actions + Admin SDK (pola yang sama sejak TAHAP 1) — App B
juga tidak pernah menyentuh Firestore langsung dari browser, jadi `firestore.rules` yang
deny-all tidak perlu diubah sama sekali. Logo tetap disimpan base64 di dokumen Firestore
(bukan Firebase Storage), konsisten dengan keputusan di TAHAP 3.

Sudah dibuatkan juga akun **Super Admin** sungguhan untuk kamu pakai (lewat Firebase Console):
- Firebase Authentication: `dikyridho05@gmail.com` / `(sudah diganti, cek Firebase Console)`
- Dokumen Firestore `admins/{uid}`: `{ nama: "Super Admin", email: "dikyridho05@gmail.com", aktif: true }`

**Segera login lalu ganti password ini** (lewat Firebase Console → Authentication → klik akunnya
→ Reset password, atau tambahkan fitur ganti password nanti) — password di atas dibuat otomatis
dan sudah pernah tertulis di percakapan ini.

Diverifikasi: `npx tsc --noEmit` bersih dan `npm run build` sukses (`/` , `/guru-bk`, `/pengaturan`
jadi dynamic karena butuh sesi login tiap request; `/login` statis). Sama seperti app lain, cek
end-to-end ke Firestore sungguhan tidak bisa dites dari sandbox cloud ini — jalankan
`npm run dev` (port 3001) di komputer kamu sendiri.

## TAHAP 6 — Respons Cepat & Prioritas

Tahap lanjutan pertama setelah tinjauan pasca-TAHAP 5 (lihat artefak "Peta Jalan Ruang Aman
BK" yang dibuat waktu itu) — tiga perbaikan yang paling langsung menyangkut keselamatan siswa.

File baru/berubah di `app-a-publik/` (+ `web-push` & `@types/web-push` ditambah ke
`package.json`, sudah `npm install`):

```
types/ticket.ts                # UBAH: tambah KATEGORI_PRIORITAS, isKategoriPrioritas(),
                                # PushSubscriptionRecord, GuruProfile.pushSubscriptions
app/guru/page.tsx              # UBAH: tiket kategori kekerasan/kesehatan_mental (belum
                                # selesai) otomatis naik ke atas daftar + badge merah
                                # "Perlu Perhatian Segera"; tambah <PushSubscribeButton />
lib/security/rate-limit.ts     # BARU: cooldown 45 detik per browser (cookie httpOnly,
                                # BUKAN berbasis IP/fingerprint — tetap sesuai prinsip privasi)
actions/curhat.ts              # UBAH: cek honeypot & rate limit sebelum simpan tiket;
                                # trigger notifyGuruOnNewTicket() setelah tiket tersimpan
components/CurhatFlow.tsx      # UBAH: tambah field honeypot tersembunyi (anti bot form)
lib/push/webpush-client.ts     # BARU: konfigurasi VAPID (skip diam-diam kalau env belum diisi)
lib/push/send-push.ts          # BARU: notifyGuruOnNewTicket() — kirim push ke semua Guru BK
                                # aktif yang berlangganan, otomatis buang langganan yang
                                # sudah tidak valid (404/410)
actions/push.ts                # BARU: savePushSubscriptionAction / removePushSubscriptionAction
components/PushSubscribeButton.tsx # BARU: tombol aktifkan/matikan notifikasi di dashboard Guru BK
public/sw.js                   # BARU: service worker — terima & tampilkan push notification
```

**Kenapa Web Push, bukan email/WhatsApp seperti di draf awal roadmap?** Web Push bawaan
browser tidak butuh daftar akun/layanan pihak ketiga apa pun (tidak seperti email transaksional
atau WhatsApp Business API) — cukup sepasang kunci VAPID yang sudah dibuatkan otomatis, jadi
tetap konsisten dengan cara kerja proyek ini sejak awal (kamu tidak perlu setup apa-apa sendiri).
Konsekuensinya: notifikasi hanya sampai ke perangkat yang browsernya menyala & sudah pernah
klik "Aktifkan Notifikasi" — bukan SMS/WhatsApp/email. Upgrade ke saluran itu tetap bisa
dikerjakan belakangan (ada di draf roadmap sebagai opsi), tinggal bilang kalau mau.

**Satu langkah manual tersisa:** salin 3 baris dari `app-a-publik/TAHAP6-ENV-TAMBAHAN.txt` ke
akhir file `app-a-publik/.env.local`, lalu restart `npm run dev`. Kunci VAPID di dalamnya sudah
dibuatkan otomatis, sengaja tidak bisa ditulis langsung ke `.env.local` oleh alat remote (rem
keamanan platform). File instruksinya boleh dihapus setelah selesai.

Cara coba: buka `/guru` (login dulu), klik "Aktifkan Notifikasi Curhatan Baru" (browser akan
minta izin notifikasi), lalu dari tab/perangkat lain kirim curhatan baru lewat `/curhat` — Guru
BK seharusnya dapat notifikasi walau tab dashboard tidak sedang aktif dilihat. Kirim curhatan
dengan kategori "Kekerasan" atau "Kesehatan Mental" untuk lihat badge prioritas & notifikasi
versi 🔴.

Diverifikasi: `npx tsc --noEmit` bersih dan `npm run build` sukses. Pengiriman push sungguhan
tidak bisa dites dari sandbox cloud ini (jaringan ke layanan push browser diblokir kebijakan
organisasi) — coba langsung di komputer kamu setelah env ditambahkan.

## TAHAP 7 — Pelaporan untuk Kepala Sekolah

Menuntaskan janji "statistik jenis masalah tanpa identitas" dari spesifikasi awal — dashboard
statistik anonim untuk Kepala Sekolah, plus export laporan.

File baru/berubah di `app-b-admin/` (+ `exceljs`, `pdfkit`, `@types/pdfkit` ditambah ke
`package.json`, sudah `npm install`):

```
types/statistik.ts               # BARU: KATEGORI_CURHAT/MOOD_OPTIONS/dll — sengaja diduplikasi
                                  # persis dari app-a-publik/src/types/ticket.ts (App A & App B
                                  # tetap dua aplikasi terpisah, lihat lib/firebase/admin.ts)
lib/firestore/statistik.ts       # BARU: getStatistikCurhatan() — baca collection `curhatan`
                                  # pakai .select("kategori","mood","status","createdAt") SAJA
                                  # (judul/namaSamaran/passwordHash/isi pesan TIDAK PERNAH
                                  # ikut terbaca), lalu agregasi total, per kategori, per mood,
                                  # per status, tren 6 bulan terakhir, dan "prioritas aktif"
components/StatistikView.tsx     # BARU: tampilan kartu ringkasan + bar chart kategori/mood +
                                  # badge status + grafik batang tren bulanan (SVG/CSS murni,
                                  # tanpa library chart tambahan)
app/statistik/page.tsx           # BARU: halaman /statistik (guard sesi sama seperti /pengaturan
                                  # & /guru-bk) + tombol unduh Excel/PDF
app/statistik/export/excel/route.ts # BARU: Route Handler GET — generate .xlsx pakai exceljs
                                  # (5 sheet: Ringkasan, Per Kategori, Per Mood, Status Tiket,
                                  # Tren Bulanan), sesi dicek ulang di sini juga
app/statistik/export/pdf/route.ts   # BARU: Route Handler GET — generate .pdf pakai pdfkit,
                                  # data sama persis dengan yang di layar & Excel
app/page.tsx                     # UBAH: tambah kartu nav "Statistik & Laporan"
```

**Kenapa Route Handler, bukan Server Action, untuk export?** Server Action tidak bisa
langsung memicu download file di browser (harus lewat base64 + Blob URL di client, lebih
ribet & +33% ukuran data). Route Handler `GET` bisa langsung dipasang sebagai `href` link
biasa — browser otomatis men-download karena header `Content-Disposition: attachment`, tanpa
JavaScript tambahan. Sesi Super Admin diverifikasi ulang di route handler-nya sendiri (bukan
cuma di halaman `/statistik`), karena URL route bisa saja diakses langsung.

**Kenapa scan seluruh collection, bukan query bertingkat?** Untuk skala satu sekolah (ratusan–
ribuan tiket), baca semua dokumen sekali per buka halaman sudah cukup cepat & sudah otomatis
konsisten antara tampilan layar dan file export (satu fungsi agregasi dipakai keduanya). Kalau
nanti datanya jauh lebih besar, pertimbangkan agregat precomputed lewat Cloud Function trigger
alih-alih scan penuh tiap load.

Cara coba: buka `/statistik` (login dulu) — kartu ringkasan, grafik kategori/mood, badge
status, dan tren 6 bulan langsung terisi dari data curhatan yang ada. Tombol "Unduh Excel" /
"Unduh PDF" di pojok kanan atas men-download laporan yang angkanya sama persis dengan yang
tampil di layar.

Diverifikasi: `npx tsc --noEmit` bersih dan `npm run build` sukses; guard sesi route export
sudah dites langsung (akses tanpa login → 401, bukan Firestore call yang jalan duluan). Baca
data curhatan sungguhan tidak bisa dites dari sandbox cloud ini (jaringan ke
`firestore.googleapis.com` diblokir kebijakan organisasi) — coba langsung di komputer kamu.

## TAHAP 8 — Pengalaman & Keberlanjutan

Tahap terakhir dari roadmap awal (lihat artefak "Peta Jalan Ruang Aman BK") — lima
perbaikan yang tidak menyentuh alur inti, tapi menentukan apakah aplikasi ini bisa dipakai
dan dirawat jangka panjang, bukan cuma sekali demo.

### Fitur 1 — Notifikasi push untuk siswa saat Guru BK membalas

File baru/berubah di `app-a-publik/`:

```
types/ticket.ts                # UBAH: tambah siswaPushSubscriptions? di CurhatTicket
actions/push.ts                # UBAH: tambah saveSiswaPushSubscriptionAction /
                                # removeSiswaPushSubscriptionAction — langganan disimpan DI
                                # DALAM dokumen tiket itu sendiri (curhatan/{kode}), bukan di
                                # profil siswa (siswa memang tidak punya akun/profil)
lib/push/send-push.ts          # UBAH: tambah notifySiswaOnBalasan(kode) — helper kirim-push
                                # dipisah jadi kirimKeSubscriptions() dan dipakai bersama oleh
                                # notifyGuruOnNewTicket() (TAHAP 6) & fungsi baru ini
actions/chat.ts                # UBAH: sendGuruReplyAction memanggil notifySiswaOnBalasan(kode)
                                # setelah status tiket berubah jadi "dibalas"
components/PushToggleButton.tsx    # BARU: tombol aktif/nonaktifkan notifikasi generik, ditarik
                                    # keluar dari PushSubscribeButton biar bisa dipakai ulang
components/PushSubscribeButton.tsx # UBAH: sekarang cuma pembungkus tipis di atas PushToggleButton
components/SiswaPushSubscribeButton.tsx # BARU: pembungkus PushToggleButton versi siswa
components/CekBalasanFlow.tsx  # UBAH: render <SiswaPushSubscribeButton /> di halaman /cek-balasan
                                # (setelah siswa verifikasi kode+password)
```

Langganan notifikasi siswa **khusus per tiket** (endpoint push disimpan di dokumen
`curhatan/{kode}` itu sendiri) — konsekuensinya, kalau siswa buka tiket lain nanti harus
aktifkan notifikasi lagi di situ juga. Ini konsisten dengan prinsip privasi proyek: tidak ada
identitas siswa yang bertahan lintas tiket.

Cara coba: buka `/cek-balasan`, masuk pakai kode+password tiket yang sudah ada, klik "Aktifkan
Notifikasi Balasan". Dari `/guru/{kode}` (Guru BK), kirim balasan — siswa seharusnya dapat
notifikasi walau tab `/cek-balasan` tidak sedang aktif dilihat.

### Fitur 2 — PWA (bisa di-"install" ke Home Screen)

File baru/berubah di `app-a-publik/`:

```
src/app/manifest.ts        # BARU: konvensi Next.js — auto ter-link ke <head>, nama & warna
                            # tema aplikasi (#0284c7), referensi ke ikon 192px & 512px
src/app/icon.png           # BARU: favicon (konvensi Next.js, auto ter-link)
src/app/apple-icon.png     # BARU: ikon Apple touch (konvensi Next.js, auto ter-link)
public/icons/icon-192.png  # BARU: ikon PWA 192×192
public/icons/icon-512.png  # BARU: ikon PWA 512×512
src/app/layout.tsx         # UBAH: tambah metadata applicationName & appleWebApp, tambah
                            # export viewport (themeColor #0284c7)
```

Service worker `public/sw.js` yang sudah ada sejak TAHAP 6 (buat terima push notification)
sekaligus jadi syarat wajib PWA installable — tidak perlu file tambahan untuk itu.

Cara coba: buka `/curhat` atau `/cek-balasan` di Chrome (desktop atau Android) — akan muncul
ikon "Install" di address bar / menu browser. Setelah di-install, aplikasi terbuka tanpa
address bar seperti app biasa, dengan ikon perisai+hati biru yang sudah dibuat.

### Fitur 3 — Retensi & pengarsipan data otomatis

File baru/berubah di **kedua app** (logika inti sengaja diduplikasi, konsisten dengan
keputusan App A & App B tetap dua aplikasi terpisah):

```
# app-a-publik/src/ & app-b-admin/src/ (identik di kedua app)
lib/firestore/settings.ts   # UBAH: tambah RetensiSettings { aktif, tutupOtomatisHari,
                             # hapusOtomatisHari }, default MATI (aktif: false)
lib/retensi/jalankan.ts     # BARU: jalankanRetensi(db, settings) — scan collection `curhatan`
                             # pakai .select("status","updatedAt") saja, tutup otomatis tiket
                             # yang tidak disentuh > N hari (status → "selesai", ditandai
                             # ditutupOtomatis: true), hapus permanen (docs + subcollection
                             # pesan, pakai recursiveDelete) tiket "selesai" yang sudah > M hari

# khusus app-a-publik/src/
app/api/retensi/route.ts    # BARU: Route Handler POST, dipicu dari LUAR aplikasi (cron
                             # eksternal) — dijaga header `Authorization: Bearer
                             # <RETENSI_CRON_SECRET>`, bukan sesi Guru BK/Admin biasa

# khusus app-b-admin/src/
actions/retensi.ts          # BARU: updateRetensiSettingsAction (ubah pengaturan lewat form),
                             # jalankanRetensiSekarangAction (tombol "Jalankan Sekarang" manual,
                             # tanpa nunggu cron)
components/RetensiForm.tsx  # BARU: form aktifkan/nonaktifkan + atur jumlah hari, ditaruh di
                             # /pengaturan
app/pengaturan/page.tsx     # UBAH: render <RetensiForm>
```

**Kenapa defaultnya MATI?** Menghapus data curhatan itu tindakan permanen & langsung
menyangkut keselamatan siswa (riwayat konseling bisa jadi penting suatu saat) — bukan sesuatu
yang boleh menyala sendiri tanpa Kepala Sekolah/Guru BK Koordinator sadar dan sengaja
mengaktifkannya dari `/pengaturan`.

**Kenapa perlu cron EKSTERNAL, bukan otomatis di dalam aplikasi?** Next.js (App Router) tidak
punya scheduler bawaan — server hanya jalan saat ada request masuk. Route
`app-a-publik/…/api/retensi` harus dipanggil dari luar secara berkala (mis. layanan cron
gratis seperti [cron-job.org](https://cron-job.org), atau Vercel Cron kalau nanti di-deploy ke
Vercel) dengan method `POST` dan header `Authorization: Bearer <RETENSI_CRON_SECRET>`. Sampai
itu di-setup, cara paling gampang adalah klik tombol **"Jalankan Sekarang"** di `/pengaturan`
(App B) secara manual dari waktu ke waktu.

**Satu langkah manual tersisa:** salin isi `app-a-publik/TAHAP8-ENV-TAMBAHAN.txt` ke akhir
file `app-a-publik/.env.local`, lalu restart `npm run dev`. Sama seperti TAHAP 6, kunci ini
sengaja tidak bisa ditulis langsung ke `.env.local` oleh alat remote (rem keamanan platform).
File instruksinya boleh dihapus setelah selesai.

### Fitur 4 — Audit log Super Admin

File baru/berubah di `app-b-admin/src/`:

```
types/admin.ts        # UBAH: tambah AuditLogEntry { id, waktuMs, aktor, aksi, detail }
lib/audit/log.ts      # BARU: catatAudit() (tulis 1 baris, tidak pernah melempar error —
                       # gagal mencatat TIDAK BOLEH membuat aksi aslinya tampak gagal) &
                       # getAuditLog() (baca N terbaru, urut waktu — single-field orderBy,
                       # tidak butuh composite index)
actions/guru.ts        # UBAH: createGuruAction, setGuruAktifAction, deleteGuruAction masing-
                       # masing catatAudit() setelah berhasil
actions/settings.ts    # UBAH: updateSekolahSettingsAction catatAudit() setelah berhasil
actions/retensi.ts     # (baru dari Fitur 3) — updateRetensiSettingsAction &
                       # jalankanRetensiSekarangAction juga catatAudit()
app/audit-log/page.tsx # BARU: halaman /audit-log, daftar 100 aktivitas terbaru
app/page.tsx           # UBAH: tambah kartu nav "Audit Log"
```

Yang tercatat: tambah/nonaktifkan/hapus akun Guru BK, ubah identitas sekolah, ubah pengaturan
retensi, dan menjalankan retensi manual — semua aksi yang mengubah sesuatu di App B. Isi
tiket/percakapan siswa (App A) **tidak** ikut dicatat di sini, tetap konsisten dengan prinsip
anonimitas — audit log ini soal akuntabilitas Super Admin, bukan pengawasan siswa.

Cara coba: buka `/audit-log` (login dulu), lalu coba ubah sesuatu di `/pengaturan` atau
`/guru-bk` — entri baru langsung muncul di daftar.

### Fitur 5 — Penugasan tiket ke Guru BK tertentu

File baru/berubah di `app-a-publik/src/`:

```
types/ticket.ts               # UBAH: tambah GuruTugas { uid, nama }, dan di CurhatTicket:
                               # guruDitugaskan?, ditutupOtomatis? (dipakai Fitur 3)
actions/penugasan.ts          # BARU: listGuruAktifAction() (isi dropdown, urut nama di JS —
                               # hindari composite index), tugaskanTiketAction(kode, guruUid)
                               # — guruUid null berarti lepas tugas
components/PenugasanTiket.tsx # BARU: dropdown "Ditugaskan ke" — siapa pun Guru BK aktif yang
                               # login boleh menugaskan/melepas tugas tiket mana pun (belum ada
                               # peran "koordinator" terpisah di proyek ini)
app/guru/[kode]/page.tsx      # UBAH: render <PenugasanTiket> di kartu header tiket
app/guru/page.tsx             # UBAH: tiap baris tampilkan siapa yang ditugaskan ("→ Nama" /
                               # "Belum ditugaskan"); tambah filter "Semua" / "Tugas Saya"
                               # (lewat query param ?filter=saya)
```

Penugasan murni informasi tampilan (semua Guru BK tetap bisa lihat & balas tiket mana pun) —
gunanya supaya tim BK bisa koordinasi siapa pegang tiket apa, bukan pembatasan akses.

Cara coba: buka tiket mana pun di `/guru/{kode}`, pilih nama Guru BK di dropdown "Ditugaskan
ke" pada kartu header. Kembali ke `/guru`, klik "Tugas Saya" untuk lihat cuma tiket yang
ditugaskan ke akun yang sedang login.

### Verifikasi TAHAP 8

Diverifikasi: `npx tsc --noEmit` bersih dan `npm run build` sukses untuk **kedua** app.
Pengiriman push sungguhan, instalasi PWA, dan operasi Firestore (retensi, audit log,
penugasan) tidak bisa dites dari sandbox cloud ini (jaringan ke `firestore.googleapis.com` dan
layanan push browser diblokir kebijakan organisasi) — coba langsung di komputer kamu setelah
env ditambahkan.

## TAHAP 9 — Kolaborasi Tim BK & Pemantauan Sistem

Di luar 8 tahap roadmap awal — tiga fitur yang diminta langsung setelah melihat mockup
dashboard Super Admin, dipilih dari daftar rekomendasi karena paling langsung berguna
untuk keseharian tim BK.

### Fitur 1 — Jadwal Piket Guru BK

File baru/berubah di `app-b-admin/src/`:

```
types/admin.ts             # UBAH: tambah HariPiket, HARI_PIKET, HARI_PIKET_LABEL,
                            # JadwalPiket, JADWAL_PIKET_KOSONG
lib/firestore/piket.ts     # BARU: getJadwalPiket() — baca dokumen settings/piket
actions/piket.ts           # BARU: updatePiketAction(formData) — simpan checkbox per hari
                            # (formData.getAll per nama hari), catatAudit() setelah berhasil
components/PiketForm.tsx   # BARU: form 7 baris (Senin—Minggu), checkbox per Guru BK aktif
app/piket/page.tsx         # BARU: halaman /piket
app/page.tsx               # UBAH: tambah kartu nav "Jadwal Piket Guru BK"
```

File baru/berubah di `app-a-publik/src/`:

```
lib/firestore/piket.ts     # BARU: getPiketHariIni() — READ-ONLY, resolve UID→nama Guru BK
                            # yang piket HARI INI (berdasar hari dalam minggu di server)
app/guru/page.tsx          # UBAH: tampilkan banner "🗓️ Piket hari ini: ..." kalau ada yang
                            # bertugas — terutama berguna menjelang musim ujian (Asesmen
                            # Sumatif), yang biasanya lebih rawan lonjakan stres siswa
```

Cara coba: buka `/piket` (App B), centang beberapa Guru BK untuk hari ini, simpan. Login
sebagai salah satu Guru BK yang dicentang di `/guru` (App A) — banner piket langsung muncul
di atas daftar curhatan.

### Fitur 2 — Template Balasan Cepat

File baru/berubah di `app-b-admin/src/`:

```
types/admin.ts                        # UBAH: tambah TemplateBalasan { id, judul, isi }
lib/firestore/template.ts             # BARU: getTemplateBalasan() — baca collection
                                       # templateBalasan, urut judul
actions/template.ts                   # BARU: createTemplateAction, updateTemplateAction,
                                       # deleteTemplateAction — masing-masing catatAudit()
components/TemplateBalasanManager.tsx # BARU: form tambah/edit + daftar dengan tombol
                                       # Edit/Hapus (pola sama seperti GuruList)
app/template-balasan/page.tsx         # BARU: halaman /template-balasan
app/page.tsx                          # UBAH: tambah kartu nav "Template Balasan Cepat"
```

File baru/berubah di `app-a-publik/src/`:

```
lib/firestore/template.ts  # BARU: getTemplateBalasan() — READ-ONLY, sama seperti App B
components/ChatThread.tsx  # UBAH: prop `templates?` baru — dropdown "⚡ Pakai template
                            # balasan cepat..." tampil khusus kalau myRole==="guru"; memilih
                            # template mengisi draft balasan (siswa tidak pernah melihat ini,
                            # dan pesan belum terkirim sampai Guru BK klik Kirim sendiri)
app/guru/[kode]/page.tsx   # UBAH: fetch getTemplateBalasan(), oper ke <ChatThread>
```

Cara coba: buka `/template-balasan` (App B), tambah beberapa template. Buka tiket mana pun di
`/guru/{kode}` (App A) — dropdown template muncul di atas kotak ketik; pilih satu untuk mengisi
draft balasan, masih bisa diedit sebelum dikirim.

### Fitur 3 — Indikator Kesehatan Sistem

File baru/berubah di **kedua app** (logika inti sengaja diduplikasi, konsisten dengan
keputusan App A & App B tetap dua aplikasi terpisah):

```
# app-a-publik/src/ & app-b-admin/src/ (identik di kedua app)
lib/retensi/jalankan.ts   # UBAH: jalankanRetensi() sekarang dibungkus try/catch, memanggil
                           # catatStatusRetensi() di akhir (sukses MAUPUN gagal) — tulis hasil
                           # run TERAKHIR ke settings/sistemStatus, tidak pernah melempar error
                           # sendiri (pola sama seperti catatAudit — gagal mencatat status
                           # TIDAK BOLEH membuat hasil retensi yang sudah berjalan tampak gagal)

# khusus app-b-admin/src/
types/admin.ts              # UBAH: tambah RetensiTerakhir, SistemStatus
lib/status/sistem.ts        # BARU: getSistemStatus() — retensiTerakhir + totalTiket (query
                             # agregasi .count() collection curhatan) + totalAuditLog (.count()
                             # collection auditLog), tidak menarik dokumen ke memori
components/StatusSistem.tsx # BARU: kartu "Kesehatan Sistem" — status sukses/gagal run
                             # terakhir + waktunya, jumlah tiket ditutup/dihapus otomatis,
                             # total curhatan & baris audit log tersimpan
app/page.tsx                 # UBAH: render <StatusSistem> di atas grid kartu nav
```

Cara coba: klik "Jalankan Sekarang" di `/pengaturan` (App B), lalu buka dashboard Super Admin
(`/`) — kartu "Kesehatan Sistem" langsung menampilkan hasil run barusan.

### Fitur 4 — Redesain Tampilan Dashboard (App B)

Diminta setelah lihat mockup awal (gambar referensi dashboard admin gaya platform kursus) —
kali ini diterapkan sebagai KODE PRODUKSI ke seluruh App B, bukan cuma mockup. File
baru/berubah di `app-b-admin/src/`:

```
components/AdminSidebar.tsx  # BARU: sidebar ikon tetap (Dashboard, Akun Guru BK, Jadwal
                              # Piket, Template Balasan, Statistik, Audit Log, Pengaturan) —
                              # penanda menu aktif pakai usePathname()
components/AdminTopbar.tsx   # BARU: header "Selamat datang kembali" + tanggal hari ini +
                              # avatar inisial Super Admin + <LogoutButton> — gantikan "←
                              # Kembali ke dashboard" yang tadinya diulang manual tiap halaman
components/AdminShell.tsx    # BARU: bungkus sidebar+topbar, dirender sekali di layout.tsx;
                              # dilewati khusus untuk /login (belum ada admin yang login)
components/DashboardCalendar.tsx # BARU: kalender bulanan interaktif (navigasi ‹ ›) yang
                              # menggabungkan DUA sumber: jadwal piket Guru BK (berulang tiap
                              # minggu, dari Firestore) & kalender pendidikan nasional (data
                              # statis terverifikasi, lihat lib/kalender/data-nasional.ts) —
                              # plus daftar "Agenda Mendatang"
lib/kalender/data-nasional.ts # BARU: data statis hari libur nasional & cuti bersama 2026
                              # (SKB 3 Menteri, dicek silang setneg.go.id & blog.itera.ac.id)
                              # + milestone kalender pendidikan Provinsi Banten TA 2026/2027
                              # (komunitasbelajar.id) — PERLU DIPERBARUI MANUAL tiap tahun
lib/firestore/piket.ts       # UBAH: tambah getJadwalPiketDenganNama() — sama seperti
                              # getJadwalPiket() tapi UID Guru BK sudah di-resolve jadi nama,
                              # dipakai kalender yang butuh jadwal SEMUA hari sekaligus
components/StatusSistem.tsx  # UBAH: restyle jadi 3 kotak angka pastel (mengikuti gaya
                              # referensi "Learning progress") — data & logikanya sama persis
app/layout.tsx                # UBAH: fetch admin sekali, bungkus children dengan <AdminShell>
app/page.tsx                  # UBAH TOTAL: bukan lagi grid kartu navigasi (sekarang di
                              # sidebar) — jadi dashboard 2 kolom: "Aktivitas Hari Ini" (kartu
                              # Piket Hari Ini + Template Balasan, data asli) & Kesehatan
                              # Sistem di kiri, <DashboardCalendar> di kanan
app/piket/page.tsx, app/template-balasan/page.tsx, app/guru-bk/page.tsx,
app/pengaturan/page.tsx, app/statistik/page.tsx, app/audit-log/page.tsx
                              # UBAH: hapus link "← Kembali ke dashboard" dan <LogoutButton>
                              # yang berdiri sendiri (sekarang jadi bagian AdminShell, tampil
                              # konsisten di semua halaman)
```

Kalender menampilkan hari piket (lingkaran ungu muda) dan hari libur/agenda akademik
(lingkaran ungu tua, arahkan kursor untuk lihat namanya) dalam satu tampilan — awalnya diminta
supaya jadwal piket lebih kelihatan menjelang musim ujian, sekarang digabung dengan kalender
pendidikan nasional yang juga sempat diminta di awal sesi ini. Data hari libur & kalender
akademik ini statis (bukan API live) — kalau ada revisi resmi atau sudah ganti tahun, edit
langsung `lib/kalender/data-nasional.ts`.

### Verifikasi TAHAP 9

Diverifikasi: `npx tsc --noEmit` bersih dan `npm run build` sukses untuk **kedua** app. Operasi
Firestore sungguhan (simpan jadwal piket, kelola template, jalankan retensi) tidak bisa dites
dari sandbox cloud ini (jaringan ke `firestore.googleapis.com` diblokir kebijakan organisasi) —
coba langsung di komputer kamu.


## TAHAP 10 — Perbaikan "Kode Konseling hilang"

Dipicu laporan pengguna sungguhan: seorang siswa kehilangan Kode Konseling dan
tidak bisa membuka kembali percakapannya. Saat ditelusuri, akar masalahnya
ternyata bukan cuma soal lupa mencatat.

**Temuan saat menelaah kode lama:**

- Sesi siswa hanya berumur **1 jam**, dan token sesinya disimpan di satu field
  yang saling menimpa — membuka dari HP lain langsung mematikan sesi
  sebelumnya. Siswa merasa "kodenya hilang" padahal sebenarnya terlempar keluar
  berulang kali dan tidak pernah sempat menyimpan kodenya.
- `verifyCurhatAccessAction` **tidak punya pembatas percobaan sama sekali**.
- Pesan galat membedakan "Kode tidak ditemukan" dan "Kode atau password salah",
  yang membocorkan kode mana yang benar-benar berisi curhatan.
- Kode Konseling **berurutan** (BK-2026-0187), jadi bisa ditebak seluruhnya
  dari luar.

**Yang diperbaiki:**

```
lib/session/sesi-util.ts        # BARU: logika murni peta sesi (bisa diuji tanpa Firestore)
lib/session/siswa-session.ts    # UBAH: sesi 30 hari, multi-perangkat (maks 5),
                                 # token disimpan sebagai HASH, pesan galat seragam
lib/ingatan-tiket.ts            # BARU: browser mengingat KODE-nya sendiri (localStorage,
                                 # tanpa password) + unduh "kartu kode" sebagai gambar
components/TiketTersimpan.tsx   # BARU: panel "Tiket di perangkat ini" + tombol Lupakan
components/CekBalasanFlow.tsx   # UBAH: panel tiket tersimpan, kode diingat setelah
                                 # berhasil masuk, tautan ke Lupa Kode
components/CurhatFlow.tsx       # UBAH: layar sukses mengingat kode otomatis +
                                 # tombol "Simpan Gambar"
actions/lupa-kode.ts            # BARU: pulihkan kode dengan nama samaran + password
components/LupaKodeFlow.tsx     # BARU: halaman pemulihan
app/lupa-kode/page.tsx          # BARU
actions/cek-balasan.ts          # UBAH: pembatas percobaan (5x, jeda 5 menit)
lib/security/rate-limit.ts      # UBAH: pembatas percobaan umum berbasis cookie
lib/firestore/kode-konseling.ts # UBAH: kode ACAK (BK-2026-7K3M9Q), tidak lagi berurutan
lib/validation/curhat.ts        # UBAH: password minimal 8 karakter (dari 6)
scripts/uji-sesi.ts             # BARU: 15 uji logika sesi
```

**Kenapa lapisannya banyak?** Karena penyebabnya memang lebih dari satu, dan
masing-masing menangkap kasus yang berbeda: sesi panjang menghapus sebagian
besar keluhan tanpa siswa melakukan apa pun; browser yang mengingat kode
menolong siswa yang memakai HP sama; kartu gambar menolong yang ganti HP;
halaman Lupa Kode menolong yang benar-benar lupa. Yang tidak bisa ditolong
hanyalah siswa yang lupa passwordnya juga — dan itu memang konsekuensi jujur
dari tidak menyimpan identitas siapa pun.

**Yang SENGAJA tidak dipakai:** mengganti kode dengan NISN siswa. NISN tercetak
di kartu pelajar dan ada di daftar kelas, jadi bukan rahasia — memakainya
justru mematikan anonimitas sekaligus menurunkan keamanan.

Diverifikasi: `npx tsc --noEmit` bersih, `npm run build` sukses, 15 uji logika
sesi lulus (`npx tsx scripts/uji-sesi.ts`), dan 13 uji browser untuk alur
ingatan perangkat & halaman Lupa Kode lulus. Uji terhadap Firestore sungguhan
tetap harus dijalankan di komputermu sendiri (jaringan sandbox ini diblokir ke
`firestore.googleapis.com`).

## Revisi — Kategori masalah boleh lebih dari satu (maks 3)

Sebelumnya siswa hanya bisa memilih SATU kategori masalah. Dalam praktiknya satu
masalah sering menyentuh beberapa hal sekaligus (bullying yang berujung ke
kesehatan mental dan nilai akademik), dan memaksa memilih satu membuat Guru BK
kehilangan konteks. Sekarang boleh memilih **1–3 kategori**.

**Di form curhat (App A):** label berubah jadi `Kategori masalah` + penanda
`maks 3`. Kategori yang belum dipilih meredup begitu kuota penuh; kalau siswa
tetap menekannya, penanda `maks 3` **bergetar sebentar dan berubah merah**,
disertai kalimat "Sudah 3 kategori. Lepas salah satu dulu kalau mau ganti."
Peringatannya padam sendiri setelah ~1,6 detik atau begitu siswa melepas salah
satu pilihan. Untuk perangkat yang disetel "kurangi animasi", penanda hanya
berubah merah tanpa bergetar (lihat `@media (prefers-reduced-motion)` di
`src/app/globals.css`).

**Batas 3 divalidasi dua kali.** Di browser (KategoriPicker) supaya siswa dapat
respons langsung, DAN di server lewat zod (`src/lib/validation/curhat.ts`)
supaya form yang dikirim tanpa JavaScript — atau dipalsukan — tetap ditolak.

**Tiket lama tidak perlu dimigrasi.** Dokumen `curhatan` yang dibuat sebelum
revisi ini menyimpan `kategori` sebagai string tunggal. Semua pembacaan sekarang
lewat `normalizeKategori()` (`src/types/ticket.ts`, disalin juga ke
`app-b-admin/src/types/statistik.ts`) yang menerima string maupun array dan
selalu mengembalikan array bersih — jadi tiket lama tetap tampil benar tanpa
menyentuh data yang sudah ada di Firestore.

**Efek ke prioritas & statistik.** Tiket dihitung prioritas kalau *salah satu*
kategorinya berisiko tinggi (kekerasan / kesehatan mental), dan tetap dihitung
sekali saja. Di grafik "Per Kategori" tiap kategori dihitung satu kali per tiket,
jadi **jumlah seluruh baris bisa melebihi total curhatan** — ini benar, dan
dijelaskan langsung di halaman statistik serta di export Excel & PDF supaya
pembaca laporan tidak mengira angkanya salah hitung.

Berkas yang berubah — App A: `src/types/ticket.ts`, `src/lib/validation/curhat.ts`,
`src/actions/curhat.ts`, `src/components/KategoriPicker.tsx`,
`src/components/CurhatFlow.tsx`, `src/lib/push/send-push.ts`,
`src/app/guru/page.tsx`, `src/app/guru/[kode]/page.tsx`, `tailwind.config.ts`,
`src/app/globals.css`. App B: `src/types/statistik.ts`,
`src/lib/firestore/statistik.ts`, `src/components/StatistikView.tsx`,
`src/app/statistik/export/excel/route.ts`, `src/app/statistik/export/pdf/route.ts`.

Diverifikasi: `npx tsc --noEmit` + `next build` bersih untuk App A & App B, plus
uji browser (Playwright) untuk alur pilih 3 → tekan ke-4 → getar/merah → tukar
pilihan → peringatan padam.

## Foto latar Beranda (bisa diganti dari App B)

Beranda App A bisa menampilkan foto gedung sekolah samar di belakang isinya,
dengan **opasitas 25%**. Fotonya bukan berkas di dalam kode: Super Admin
mengunggahnya sendiri lewat **App B → Pengaturan → Foto Latar Beranda**, sama
seperti logo sekolah — jadi sekolah lain yang memakai aplikasi ini tinggal
unggah fotonya masing-masing tanpa mengubah kode atau deploy ulang.

**Di mana disimpan.** Dokumen Firestore tersendiri, `settings/latar-beranda`,
field `fotoBase64` (data URL). Sengaja TIDAK digabung ke `settings/sekolah`:
dokumen Firestore dibatasi 1 MiB, dan `settings/sekolah` sudah menampung logo
serta dibaca di banyak tempat (Beranda, Pengaturan, retensi) yang tidak
membutuhkan foto — kalau digabung, setiap pembacaan nama sekolah ikut menyeret
ratusan KB yang tidak dipakai. Tetap base64 di Firestore, bukan Firebase
Storage, dengan alasan yang sama seperti logo & gambar chat: supaya proyek ini
tidak perlu upgrade ke plan Blaze.

**Ukuran dijaga di dua sisi.** Di browser App B foto diperkecil ke maksimal
1600px dan dikompres ulang jadi JPEG sampai ±400 KB
(`app-b-admin/src/lib/image/kompres-foto.ts`, pola sama dengan kompresi gambar
chat di App A) — jadi foto 4 MB dari HP boleh langsung dipilih. Di server,
Server Action menolak apa pun yang bukan data URL gambar atau melebihi
`MAKS_PANJANG_DATA_URL_LATAR` (700.000 karakter ≈ 512 KB biner). Menggambar
ulang lewat `<canvas>` juga otomatis membuang metadata EXIF, termasuk koordinat
GPS kalau fotonya diambil dari HP.

**Kenapa 25%, dan kenapa tampilannya beda di HP.** Angka opasitasnya ada di
satu tempat, `OPASITAS_LATAR` di `app-a-publik/src/app/page.tsx`, dan
dicerminkan di pratinjau form App B — pratinjaunya sengaja meniru tampilan asli
(foto 25% + teks contoh) supaya Super Admin bisa menilai keterbacaan SEBELUM
menyimpan. Di layar lebar foto dipasang `object-cover` memenuhi layar. Di HP
justru `object-contain`: foto gedung sekolah hampir selalu mendatar (±16:9),
sementara layar HP tinggi memanjang — dengan `object-cover`, foto ikut
diperbesar ~2,5x dan yang tersisa cuma potongan tengah huruf papan nama.
Sebagai pita di tengah layar, gedungnya tetap dikenali; tepi atas-bawahnya
dilembutkan dengan gradasi `.latar-beranda-foto` di `globals.css` supaya tidak
terlihat seperti kotak yang ditempel.

Lapisan fotonya `aria-hidden` + `pointer-events-none`: murni dekorasi, tidak
dibacakan pembaca layar dan tidak pernah menghalangi tombol. Kalau pembacaan
Firestore gagal atau fotonya belum pernah diunggah, Beranda tampil polos
seperti sebelum ada fitur ini.

Berkas yang berubah — App A: `src/app/page.tsx`,
`src/lib/firestore/settings.ts`, `src/app/globals.css`. App B (baru):
`src/actions/latar-beranda.ts`, `src/components/LatarBerandaForm.tsx`,
`src/lib/image/kompres-foto.ts`; (diubah) `src/types/admin.ts`,
`src/lib/firestore/settings.ts`, `src/app/pengaturan/page.tsx`.

Diverifikasi: `npx tsc --noEmit` + `next build` bersih untuk App A & App B, dan
tampilan Beranda dicek lewat screenshot Playwright di dua ukuran layar (HP
390px & laptop 1280px) memakai foto sungguhan.

## Status Tahapan

- [x] **TAHAP 1** — Struktur proyek + `firebaseClient.ts` + `firebaseAdmin.ts` (App A & App B)
- [x] **TAHAP 2** — Server Action App A untuk pembuatan tiket curhat siswa
- [x] **TAHAP 3** — UI Beranda dinamis + Form Curhat App A
- [x] **TAHAP 4** — Portal chat Siswa ↔ Guru BK
- [x] **TAHAP 5** — Dashboard Super Admin (App B)
- [x] **TAHAP 6** — Respons Cepat & Prioritas (notifikasi push, penanda prioritas, rate limiting)
- [x] **TAHAP 7** — Pelaporan untuk Kepala Sekolah (statistik anonim, export Excel/PDF)
- [x] **TAHAP 8** — Pengalaman & Keberlanjutan (notifikasi balasan siswa, PWA, retensi data,
      audit log, penugasan tiket)
- [x] **TAHAP 9** — Kolaborasi Tim BK & Pemantauan Sistem (jadwal piket, template balasan
      cepat, indikator kesehatan sistem, redesain dashboard App B dengan sidebar & kalender)
- [x] **TAHAP 10** — Perbaikan "Kode Konseling hilang" (sesi 30 hari multi-perangkat,
      browser mengingat kode, kartu kode, halaman Lupa Kode, pembatas percobaan,
      kode acak, password minimal 8)

Semua 8 tahap dari roadmap awal (artefak "Peta Jalan Ruang Aman BK") sudah selesai dibangun,
ditambah TAHAP 9 di luar roadmap awal. Langkah besar berikutnya yang belum diputuskan:
**deploy publik** (mis. ke Vercel) dan/atau **publikasi ke Google Play Store** lewat TWA —
lihat artefak "Ruang Aman BK ke Play Store" untuk peta jalannya kalau/waktu kamu siap.
