import type { Metadata } from "next";
import LupaKodeFlow from "@/components/LupaKodeFlow";
import EmergencyButton from "@/components/EmergencyButton";

export const metadata: Metadata = {
  title: "Lupa Kode Konseling",
  description: "Temukan kembali Kode Konseling dengan nama samaran dan password kamu.",
};

// Sebelumnya halaman ini satu-satunya di antara Beranda/Curhat/Cek Balasan
// yang TIDAK menampilkan tombol darurat — padahal siswa yang mendarat di
// sini (lupa kode/password) bisa saja sedang dalam situasi yang sama
// mendesaknya. Disamakan dengan tiga halaman publik lainnya.
export default function HalamanLupaKode() {
  return (
    <main className="min-h-screen">
      <LupaKodeFlow />
      <EmergencyButton />
    </main>
  );
}
