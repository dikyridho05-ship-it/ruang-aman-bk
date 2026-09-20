import type { Metadata } from "next";
import { Suspense } from "react";
import LupaPasswordFlow from "@/components/LupaPasswordFlow";
import EmergencyButton from "@/components/EmergencyButton";

export const metadata: Metadata = {
  title: "Lupa Password Konseling — Ruang Aman",
  description: "Buat password baru untuk Kode Konseling kamu dengan nama samaran.",
};

export default function HalamanLupaPassword() {
  return (
    <main className="min-h-screen">
      <Suspense
        fallback={
          <div className="flex min-h-dvh items-center justify-center text-sm text-slate-500">
            Memuat...
          </div>
        }
      >
        <LupaPasswordFlow />
      </Suspense>
      <EmergencyButton />
    </main>
  );
}
