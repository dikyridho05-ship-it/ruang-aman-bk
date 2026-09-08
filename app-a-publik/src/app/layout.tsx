import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ruang Aman BK — Konseling Anonim Siswa",
  description:
    "Platform konseling anonim untuk siswa SMKN 1 Ciruas. Curhat aman, identitas terlindungi.",
  applicationName: "Ruang Aman BK",
  // Bukan "webAppCapable" iOS-only lagi di sini — manifest.ts (TAHAP 8) yang
  // jadi sumber utama metadata PWA, ini cuma pelengkap untuk Safari lama.
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ruang Aman BK",
  },
};

export const viewport: Viewport = {
  themeColor: "#0284c7",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
