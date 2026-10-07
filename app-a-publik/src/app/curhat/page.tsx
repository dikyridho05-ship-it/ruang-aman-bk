import type { Metadata } from "next";
import Link from "next/link";
import CurhatFlow from "@/components/CurhatFlow";
import EmergencyButton from "@/components/EmergencyButton";

export const metadata: Metadata = {
  title: "Mulai bercerita — Ruang Aman",
};

export default function CurhatPage() {
  return (
    <div className="min-h-dvh">
      <header className="px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-tinta hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
            <path d="M15 5l-7 7 7 7" />
          </svg>
          Ruang Aman
        </Link>
      </header>
      <main>
        <CurhatFlow />
      </main>
      <EmergencyButton posisi="atas" />
    </div>
  );
}
