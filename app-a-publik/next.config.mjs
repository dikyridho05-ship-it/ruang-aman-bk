/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server Actions aktif secara default di Next.js App Router.
  // Semua operasi baca/tulis data siswa WAJIB lewat Server Actions (lihat src/actions/),
  // bukan lewat Firestore client SDK, supaya security rules bisa dikunci rapat.
  reactStrictMode: true,
};

export default nextConfig;
