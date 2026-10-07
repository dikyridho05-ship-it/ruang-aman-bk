import type { Metadata } from "next";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { getAuthenticatedAdmin } from "@/lib/session/admin-session";
import { getSekolahSettings } from "@/lib/firestore/settings";
import { hitungPermintaanMenunggu } from "@/actions/akun-admin";
import AdminShell from "@/components/AdminShell";

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
