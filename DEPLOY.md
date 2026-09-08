# Deploy Ruang Aman BK ke Vercel (untuk demo)

Kode App A & App B sudah siap deploy TANPA perubahan (sudah dicek: tidak ada
`localhost` yang di-hardcode, cookie session otomatis `secure` di production,
tidak ada Edge Runtime yang bentrok dengan `firebase-admin`). Yang tersisa
murni langkah akun & konfigurasi di bawah ini — semuanya HARUS dilakukan dari
komputer kamu sendiri (bukan dari sini), karena menyangkut akun & kredensial
pribadi kamu.

## 1. Push ke GitHub

Repo GitHub-nya SUDAH dibuat (kosong, public, tanpa README/.gitignore/license):
**https://github.com/dikyridho05-ship-it/ruang-aman-bk**

Tinggal push kode kamu dari terminal:

```bash
cd ~/Proyek/ruang-aman-bk
git init
git add .
git commit -m "Deploy Ruang Aman BK untuk demo"
git branch -M main
git remote add origin https://github.com/dikyridho05-ship-it/ruang-aman-bk.git
git push -u origin main
```

Kalau nanti diminta login, pakai akun GitHub kamu (dikyridho05-ship-it) —
bisa lewat browser popup atau bikin Personal Access Token di
https://github.com/settings/tokens kalau HTTPS auth manual diminta.

`.gitignore` di tiap folder app sudah mengecualikan `.env.local`, `node_modules`,
dan `.next` — kredensial tidak akan ikut ter-push.

## 2. Import ke Vercel — DUA project terpisah, dari SATU repo yang sama

Vercel bisa mengimpor repo yang sama lebih dari sekali sebagai project
berbeda, asal "Root Directory"-nya beda. Ini pas untuk App A & App B yang
sengaja dua aplikasi independen.

### Project 1 — App A (portal siswa & Guru BK)

1. Vercel Dashboard → **Add New → Project** → pilih repo `ruang-aman-bk`.
2. **Root Directory** → `app-a-publik`.
3. Framework Preset: Next.js (otomatis terdeteksi).
4. **Environment Variables** — isi dari file `app-a-publik/.env.local` di
   komputer kamu (salin APA ADANYA):
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `FIREBASE_ADMIN_PROJECT_ID`
   - `FIREBASE_ADMIN_CLIENT_EMAIL`
   - `FIREBASE_ADMIN_PRIVATE_KEY` — tempel PERSIS termasuk `\n` literal dan
     tanda kutip dua di awal/akhir, sama seperti di `.env.local`. Jangan
     ubah jadi baris baru sungguhan.
5. Deploy. Dapat URL seperti `ruang-aman-bk-app-a.vercel.app`.

### Project 2 — App B (Super Admin)

1. **Add New → Project** lagi → pilih repo yang SAMA.
2. **Root Directory** → `app-b-admin`.
3. **Environment Variables** — SAMA PERSIS isinya dengan Project 1 (App B
   pakai project Firebase yang sama), diambil dari `app-b-admin/.env.local`.
4. Deploy. Dapat URL seperti `ruang-aman-bk-app-b.vercel.app`.

## 3. WAJIB: tambah domain Vercel ke Firebase Authorized Domains

Login (Guru BK maupun Super Admin) pakai Firebase Auth — domain baru dari
Vercel HARUS didaftarkan dulu, kalau tidak login akan gagal dengan error
`auth/unauthorized-domain`. Ini langkah paling gampang kelewat.

Firebase Console → project kamu → **Authentication → Settings → Authorized
domains → Add domain** → masukkan KEDUA domain Vercel (App A & App B) persis
seperti yang muncul di dashboard Vercel (tanpa `https://`, tanpa trailing
slash).

## 4. Cek sebelum demo

- `/curhat` (App A) → isi form → dapat Kode Konseling.
- `/guru/login` (App A) → login pakai akun Guru BK yang sudah ada → balas
  tiket yang baru dibuat.
- `/login` (App B) → login pakai akun Super Admin
  (dikyridho05@gmail.com) → dashboard baru (sidebar, kalender, dll) tampil.

## Yang SENGAJA dilewati untuk demo ini (tidak bikin app rusak, cuma nonaktif)

- **Notifikasi push** (butuh `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
  `VAPID_SUBJECT`) — kalau env ini kosong, fiturnya cuma diam-diam tidak
  aktif (sudah didesain begitu), TIDAK bikin build/app gagal. Guru BK tetap
  lihat tiket baru lewat polling otomatis tiap beberapa detik.
- **Retensi otomatis via cron eksternal** (butuh `RETENSI_CRON_SECRET`) —
  cuma endpoint `/api/retensi` yang tidak aktif tanpa ini. Tombol "Jalankan
  Sekarang" manual di `/pengaturan` (App B) tetap berfungsi normal karena dia
  lewat jalur berbeda (Server Action langsung, bukan endpoint cron).

Kalau nanti mau aktifkan dua fitur ini juga, tinggal generate key-nya (lihat
`app-a-publik/TAHAP6-ENV-TAMBAHAN.txt` untuk VAPID, atau minta dibuatkan
`RETENSI_CRON_SECRET` baru) dan tambahkan sebagai Environment Variable di
Vercel Project App A, lalu redeploy.
