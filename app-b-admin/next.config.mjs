/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pdfkit membaca file font bawaan (Helvetica .afm) dari foldernya sendiri
  // saat runtime, dan exceljs memakai modul Node bawaan — dua-duanya
  // harus dimuat apa adanya dari node_modules, tidak di-bundle Turbopack.
  serverExternalPackages: ["pdfkit", "exceljs"],
};

export default nextConfig;
