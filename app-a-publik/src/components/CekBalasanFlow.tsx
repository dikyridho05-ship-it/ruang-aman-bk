"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { verifyCurhatAccessAction } from "@/actions/cek-balasan";
import TiketTersimpan from "@/components/TiketTersimpan";
import { ingatTiket } from "@/lib/ingatan-tiket";
import { simpanKodeHandoff } from "@/lib/handoff-kode";
import {
  getMessagesForSiswaAction,
  sendSiswaMessageAction,
  tandaiSiswaMengetikAction,
} from "@/actions/chat";
import ChatThread from "@/components/ChatThread";
import SiswaPushSubscribeButton from "@/components/SiswaPushSubscribeButton";
import JanjiSiswa from "@/components/janji/JanjiSiswa";
import BingkaiFormSiswa from "@/components/BingkaiFormSiswa";
import type { SerializedMessage } from "@/types/ticket";
import type { JanjiTemu } from "@/types/janji";

interface CekBalasanFlowProps {
  /** Sesi siswa sudah dicek di server (lihat app/cek-balasan/page.tsx). */
  initialVerified?: boolean;
  initialMessages?: SerializedMessage[];
  kodeAwal?: string | null;
  janjiAwal?: JanjiTemu | null;
}

export default function CekBalasanFlow({
  initialVerified = false,
  initialMessages = [],
  kodeAwal = null,
  janjiAwal = null,
}: CekBalasanFlowProps) {
  const router = useRouter();
  const [verified, setVerified] = useState(initialVerified);
  const [kodeAktif, setKodeAktif] = useState<string | null>(kodeAwal);
  const [kode, setKode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await verifyCurhatAccessAction(kode, password);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    // Berhasil masuk = kode ini terbukti milik dia, jadi langsung diingat
    // browsernya supaya tidak perlu dihafal lagi lain kali.
    const bersih = kode.trim().toUpperCase();
    ingatTiket(bersih);
    setKodeAktif(bersih);
    setVerified(true);
  }

  if (verified) {
    // Satu layar penuh tepi-ke-tepi seperti aplikasi chat native (dibatasi
    // lebarnya hanya di layar besar). `pb-20` menyisakan ruang untuk tombol
    // darurat mengambang supaya tidak menutupi tombol kirim.
    return (
      <div className="flex h-dvh flex-col bg-white pb-20 lg:mx-auto lg:max-w-2xl lg:border-x lg:border-slate-200">
        <div className="min-h-0 flex-1">
          <ChatThread
            initialMessages={initialMessages}
            myRole="siswa"
            onSend={sendSiswaMessageAction}
            onPoll={getMessagesForSiswaAction}
            onKetik={tandaiSiswaMengetikAction}
            slotAtas={
              <>
                <div className="shrink-0 border-b border-slate-100 bg-white px-4 py-2">
                  <SiswaPushSubscribeButton />
                </div>
                <JanjiSiswa kode={kodeAktif} janjiAwal={janjiAwal} />
              </>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <BingkaiFormSiswa>
      <TiketTersimpan onPilih={(k) => setKode(k)} />

      <form onSubmit={handleVerify} className="mt-5 space-y-5">
        <div>
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-tinta">
            Buka balasan Guru BK
          </h1>
          <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">
            Masukkan Kode Konseling dan password yang kamu buat waktu bercerita.
          </p>
        </div>

        {error && (
          <p role="alert" className="rounded-lg border-l-4 border-red-500 bg-red-50 px-3.5 py-3 text-sm text-red-800">
            {error}
          </p>
        )}

        <div>
          <label htmlFor="kode" className="block text-sm font-semibold text-slate-700">
            Kode Konseling
          </label>
          <input
            id="kode"
            required
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={kode}
            onChange={(e) => setKode(e.target.value)}
            placeholder="BK-2026-7K3M9Q"
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 font-mono text-[15px] uppercase tracking-wide outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
              Password
            </label>
            <button
              type="button"
              onClick={() => {
                if (kode.trim()) simpanKodeHandoff(kode.trim().toUpperCase());
                router.push("/lupa-password");
              }}
              className="rounded text-xs font-semibold text-brand-700 hover:underline"
            >
              Lupa password?
            </button>
          </div>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-[15px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand-600 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {loading ? "Memeriksa…" : "Buka percakapan"}
        </button>

        <p className="text-center text-sm text-slate-600">
          Kodenya hilang?{" "}
          <Link href="/lupa-kode" className="font-semibold text-brand-700 hover:underline">
            Cari dengan nama samaran
          </Link>
        </p>
      </form>
    </BingkaiFormSiswa>
  );
}
