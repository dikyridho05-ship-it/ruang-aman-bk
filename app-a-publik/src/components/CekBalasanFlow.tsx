"use client";

import { useState } from "react";
import Link from "next/link";
import { verifyCurhatAccessAction } from "@/actions/cek-balasan";
import TiketTersimpan from "@/components/TiketTersimpan";
import { ingatTiket } from "@/lib/ingatan-tiket";
import { getMessagesForSiswaAction, sendSiswaMessageAction } from "@/actions/chat";
import ChatThread from "@/components/ChatThread";
import SiswaPushSubscribeButton from "@/components/SiswaPushSubscribeButton";

export default function CekBalasanFlow() {
  const [verified, setVerified] = useState(false);
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
    ingatTiket(kode.trim().toUpperCase());
    setVerified(true);
  }

  if (verified) {
    // Sengaja FULL-BLEED satu layar penuh (h-dvh, TANPA max-width/padding
    // sisi yang bikin gutter putih di kiri-kanan) — user eksplisit
    // membandingkan dengan screenshot Telegram asli & menolak versi
    // "kartu" sebelumnya (ada bingkai + margin di sekeliling). Di layar
    // lebar (desktop) baru dibatasi lg:max-w-2xl lg:mx-auto biar tidak
    // absurd melebar, tapi di HP (target utama app ini) benar-benar
    // tepi-ke-tepi kayak aplikasi chat native. Judul "Balasan Guru BK"
    // dihilangkan karena sudah terwakili header ChatThread sendiri. `pb-20`
    // di bawah menyisakan ruang supaya tombol darurat mengambang (fixed,
    // lihat EmergencyButton) tidak menutupi tombol kirim chat.
    return (
      <div className="flex h-dvh flex-col pb-20 lg:mx-auto lg:max-w-2xl">
        <div className="shrink-0 px-3 pt-3 sm:px-4">
          <SiswaPushSubscribeButton />
        </div>
        <div className="mt-2 min-h-0 flex-1">
          <ChatThread
            initialMessages={[]}
            myRole="siswa"
            onSend={sendSiswaMessageAction}
            onPoll={getMessagesForSiswaAction}
          />
        </div>
      </div>
    );
  }

  return (
    // flex + min-h-dvh + justify-center di sini (bukan cuma mx-auto seperti
    // sebelumnya) supaya kartu form ini berada di TENGAH layar secara
    // vertikal juga, tidak nempel ke atas dengan sisa ruang kosong besar di
    // bawah — terutama kelihatan di HP tinggi. Dibungkus terpisah dari
    // cabang "verified" full-bleed di atas (yang sengaja TIDAK ikut
    // di-center, itu memang harus satu layar penuh).
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-4">
        <TiketTersimpan onPilih={(k) => setKode(k)} />

        <form
          onSubmit={handleVerify}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
        <div>
          <h1 className="text-xl font-bold text-slate-900">Cek Balasan</h1>
          <p className="text-sm text-slate-500">
            Masukkan Kode Konseling &amp; password yang kamu buat waktu curhat.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <div>
          <label htmlFor="kode" className="block text-sm font-medium text-slate-700">
            Kode Konseling
          </label>
          <input
            id="kode"
            required
            value={kode}
            onChange={(e) => setKode(e.target.value)}
            placeholder="BK-2026-7K3M9Q"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand-600 py-2.5 font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Memeriksa..." : "Buka Percakapan"}
        </button>

          <div className="flex items-center justify-center gap-3 text-sm font-medium text-brand-700">
            <Link
              href="/lupa-kode"
              className="hover:underline"
            >
              Lupa Kode Konseling?
            </Link>
            <span className="text-slate-300" aria-hidden>&middot;</span>
            <Link
              href={kode.trim() ? `/lupa-password?kode=${encodeURIComponent(kode.trim().toUpperCase())}` : "/lupa-password"}
              className="hover:underline"
            >
              Lupa Password?
            </Link>
          </div>

          <div className="pt-2 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-brand-700"
            >
              ← Kembali ke Halaman Utama
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
