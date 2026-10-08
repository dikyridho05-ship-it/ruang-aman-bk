import type { Metadata, Viewport } from "next";
import "./globals.css";
import { WARNA_BRAND } from "@/lib/constants/warna";
export const metadata: Metadata = {
  title: "Ruang Aman — Konseling Anonim Siswa",
  description:
    "Platform konseling anonim untuk siswa SMKN 1 Ciruas. Curhat aman, identitas terlindungi.",
  applicationName: "Ruang Aman",
  // appleWebApp: pelengkap untuk Safari lama — sumber utama metadata PWA
  // ada di manifest.ts (TAHAP 8).
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ruang Aman",
  },
};

export const viewport: Viewport = {
  themeColor: WARNA_BRAND[600],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className="flex min-h-dvh flex-col">
        {children}
      </body>
    </html>
  );
}
