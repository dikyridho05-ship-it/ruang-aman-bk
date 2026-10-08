import type { Metadata } from "next";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { getAuthenticatedAdmin } from "@/lib/session/admin-session";
import { getSekolahSettings } from "@/lib/firestore/settings";
import { hitungPermintaanMenunggu } from "@/actions/akun-admin";
import AdminShell from "@/components/AdminShell";
import AuthBingkai from "@/components/auth/AuthBingkai";
import GerbangKodeAkses from "@/components/auth/GerbangKodeAkses";
import { punyaAksesSekolah } from "@/lib/akses/akses-sekolah";

export const metadata: Metadata = {
  title: "Ruang Aman BK — Super Admin",
  description:
    "Dashboard internal untuk mengelola identitas sekolah dan akun Guru BK di Ruang Aman BK.",
  robots: {
    // Halaman internal — jangan sampai terindeks mesin pencari.
    index: false,
    follow: false,
  },
};

/**
 * `admin`, nama sekolah & jumlah permintaan akses di-fetch di sini cuma
 * untuk tampilan sidebar/header. Ini TIDAK menggantikan proteksi
 * per-halaman: tiap page.tsx tetap memanggil getAuthenticatedAdmin() sendiri
 * dan redirect ke /login kalau belum masuk. Nama sekolah & hitungan hanya
 * dibaca kalau memang ada admin yang masuk — halaman login tidak memicu
 * baca Firestore tambahan dari sini.
 */
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const admin = await getAuthenticatedAdmin();

  // Kode Akses Sekolah: Super Admin yang sudah masuk tidak ditanya lagi
  // (dia yang mengatur kodenya). Yang belum masuk harus memasukkan kode
  // dulu sebelum melihat halaman Masuk/Daftar.
  if (!admin && !(await punyaAksesSekolah())) {
    const s = await getSekolahSettings();
    return (
      <html lang="id">
        <body>
          <AuthBingkai namaSekolah={s.namaSekolah} logoBase64={s.logoBase64}>
            <GerbangKodeAkses />
          </AuthBingkai>
        </body>
      </html>
    );
  }

  const [sekolah, permintaanMenunggu] = admin
    ? await Promise.all([getSekolahSettings(), hitungPermintaanMenunggu()])
    : [null, 0];

  return (
    <html lang="id">
      <body>
        <AdminShell
          admin={admin}
          sekolah={sekolah?.namaSekolah ?? ""}
          permintaanMenunggu={permintaanMenunggu}
        >
          {children}
        </AdminShell>
      </body>
    </html>
  );
}
