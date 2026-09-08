import type { Metadata } from "next";
import "./globals.css";
import { getAuthenticatedAdmin } from "@/lib/session/admin-session";
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
 * `admin` di-fetch di sini (bukan di AdminShell — Client Component tidak
 * boleh panggil kode server-only) cuma untuk tampilan sidebar/header (TAHAP
 * 9). Ini TIDAK menggantikan proteksi per-halaman: tiap page.tsx tetap
 * panggil getAuthenticatedAdmin() sendiri dan redirect ke /login kalau
 * belum login — kalau itu terjadi, Next.js membatalkan seluruh render
 * (termasuk layout ini) dan langsung redirect, jadi `admin: null` di sini
 * tidak pernah bocor menampilkan apa pun ke pengguna yang belum login.
 */
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const admin = await getAuthenticatedAdmin();

  return (
    <html lang="id">
      <body>
        <AdminShell admin={admin}>{children}</AdminShell>
      </body>
    </html>
  );
}
