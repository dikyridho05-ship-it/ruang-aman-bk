import type { MetadataRoute } from "next";

/**
 * File konvensi khusus Next.js — otomatis disajikan di /manifest.webmanifest
 * dan otomatis ditautkan lewat <link rel="manifest"> di setiap halaman,
 * tidak perlu ditambahkan manual di layout.tsx (TAHAP 8, syarat PWA
 * sebelum App A bisa dibungkus jadi TWA untuk Play Store nanti).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ruang Aman BK",
    short_name: "Ruang Aman BK",
    description: "Platform konseling anonim untuk siswa — curhat aman, identitas terlindungi.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0284c7",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
