import type { Metadata } from "next";
import LupaKodeFlow from "@/components/LupaKodeFlow";

export const metadata: Metadata = {
  title: "Lupa Kode Konseling",
  description: "Temukan kembali Kode Konseling dengan nama samaran dan password kamu.",
};

export default function HalamanLupaKode() {
  return <LupaKodeFlow />;
}
