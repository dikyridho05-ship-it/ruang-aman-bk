import type { Metadata } from "next";
import CurhatFlow from "@/components/CurhatFlow";
import EmergencyButton from "@/components/EmergencyButton";

export const metadata: Metadata = {
  title: "Mulai Curhat — Ruang Aman",
};

export default function CurhatPage() {
  return (
    <main className="min-h-screen">
      <CurhatFlow />
      <EmergencyButton />
    </main>
  );
}
