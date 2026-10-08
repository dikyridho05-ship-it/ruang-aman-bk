import type { Metadata, Viewport } from "next";
import "./globals.css";
import { WARNA_BRAND } from "@/lib/constants/warna";
import { punyaAksesSekolah } from "@/lib/akses/akses-sekolah";
import { getSekolahSettings } from "@/lib/firestore/settings";
import GerbangKodeAkses from "@/components/GerbangKodeAkses";
import EmergencyButton from "@/components/EmergencyButton";
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

/**
 * Kode Akses Sekolah: perangkat yang belum memasukkan kode yang berlaku
 * melihat layar kode, bukan halaman apa pun — termasuk login Guru BK.
 * Tombol darurat tetap tampil. Aksi server penting (kirim curhat, cek
 * balasan, lupa kode/password, login Guru BK) memeriksa ulang sendiri,
 * jadi gerbang ini tidak bisa dilewati dengan memanggil aksinya langsung.
 */
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const boleh = await punyaAksesSekolah();
  const sekolah = boleh ? null : await getSekolahSettings();

  return (
    <html lang="id">
      <body className="flex min-h-dvh flex-col">
        {sekolah ? (
          <>
            <GerbangKodeAkses namaSekolah={sekolah.namaSekolah} logoBase64={sekolah.logoBase64} />
            <EmergencyButton />
          </>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
