"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { curhatFormAction } from "@/actions/curhat";
import { ingatTiket, unduhKartuKode } from "@/lib/ingatan-tiket";
import KategoriPicker from "@/components/KategoriPicker";
import MoodPicker from "@/components/MoodPicker";
import PasswordField from "@/components/PasswordField";

const HOLD_DURATION_MS = 2000;

/**
 * Halaman persetujuan sebelum siswa boleh curhat — harus TAHAN tombol 2 detik
 * (bukan cuma sekali klik) supaya benar-benar sadar & sengaja, bukan kepencet
 * tidak sengaja. Pola ini yang sebelumnya sudah dipakai di prototipe HTML.
 */
function ConsentGate({ onConfirm }: { onConfirm: () => void }) {
  const [holding, setHolding] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startHold = () => {
    setHolding(true);
    timeoutRef.current = setTimeout(onConfirm, HOLD_DURATION_MS);
  };

  const cancelHold = () => {
    setHolding(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold text-slate-900">Sebelum mulai curhat</h1>
      <ul className="mt-3 space-y-2 text-sm text-slate-600">
        <li>✓ Kamu TIDAK perlu login dan TIDAK perlu pakai nama asli.</li>
        <li>✓ Kami tidak merekam alamat IP atau perangkat kamu.</li>
        <li>✓ Guru BK yang membaca curhatanmu tidak tahu identitas aslimu.</li>
        <li>✓ Simpan baik-baik Kode Konseling & password yang nanti muncul — itu
          satu-satunya cara membuka kembali percakapan ini.</li>
        <li>⚠ Kalau situasinya darurat, pakai tombol &quot;Butuh Bantuan Segera&quot;
          di pojok layar, jangan tunggu balasan di sini.</li>
      </ul>

      <p className="mt-4 text-xs text-slate-500">
        Tekan &amp; tahan tombol di bawah selama 2 detik untuk melanjutkan.
      </p>

      <button
        type="button"
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        className="relative mt-2 w-full overflow-hidden rounded-xl bg-brand-600 py-3 font-semibold text-white select-none"
      >
        <span
          className="absolute inset-y-0 left-0 bg-brand-800/50"
          style={{
            width: holding ? "100%" : "0%",
            transition: holding ? `width ${HOLD_DURATION_MS}ms linear` : "width 150ms ease-out",
          }}
        />
        <span className="relative">Tahan untuk Lanjut</span>
      </button>
    </div>
  );
}

function SuccessScreen({ kode }: { kode: string }) {
  const [copied, setCopied] = useState(false);

  // Begitu kode terbit, browser siswa langsung mengingatnya. Ini penambal
  // utama keluhan "kode hilang": siswa tidak perlu melakukan apa pun dulu.
  useEffect(() => {
    ingatTiket(kode);
  }, [kode]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(kode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API bisa gagal di beberapa browser/HP lama — tidak fatal,
      // kode tetap terlihat jelas di layar untuk dicatat manual.
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto max-w-md rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center shadow-sm"
    >
      <p className="text-3xl" aria-hidden>
        ✅
      </p>
      <h1 className="mt-2 text-xl font-bold text-slate-900">Curhatanmu terkirim</h1>
      <p className="mt-1 text-sm text-slate-600">
        Ini Kode Konseling kamu — <strong>simpan baik-baik</strong>, dipakai
        bersama password tadi untuk cek balasan Guru BK nanti.
      </p>

      <div className="mt-4 rounded-xl border-2 border-dashed border-emerald-400 bg-white py-4">
        <p className="text-2xl font-mono font-bold tracking-wider text-emerald-700">
          {kode}
        </p>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleCopy}
          className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white"
        >
          {copied ? "Tersalin ✓" : "Salin Kode"}
        </button>
        <button
          type="button"
          onClick={() => unduhKartuKode(kode, "Ruang Aman BK")}
          className="w-full rounded-xl border border-emerald-600 py-2.5 text-sm font-semibold text-emerald-700"
        >
          Simpan Gambar
        </button>
      </div>

      <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs text-slate-600">
        Kode ini sudah diingat otomatis di HP ini. Kalau nanti lupa, buka
        &quot;Cek Balasan&quot; dari HP yang sama — kodenya sudah menunggu di sana.
      </p>

      <p className="mt-3 text-xs text-amber-700">
        Passwordmu tidak disimpan di mana pun. Kalau password lupa, percakapan
        ini tidak bisa dibuka lagi — jadi ingat baik-baik.
      </p>

      <a
        href="/"
        className="mt-4 inline-block text-sm font-medium text-brand-700 underline"
      >
        Kembali ke Beranda
      </a>
    </div>
  );
}

export default function CurhatFlow() {
  const [confirmed, setConfirmed] = useState(false);

  return (
    // pb-20 (bukan cuma py-8) supaya elemen paling bawah — tombol "Kirim
    // Curhatan", atau tombol "Tahan untuk Lanjut" di ConsentGate — selalu
    // punya jarak aman dari tombol "Butuh Bantuan Segera?" yang fixed di
    // pojok layar (lihat EmergencyButton.tsx). py-8 saja (32px) masih
    // ketutupan tombol itu saat halaman di-scroll sampai bawah; pb-20 (80px)
    // ini pola yang sama dipakai di CekBalasanFlow.tsx.
    <div className="px-4 pt-8 pb-20">
      {!confirmed ? (
        <ConsentGate onConfirm={() => setConfirmed(true)} />
      ) : (
        <CurhatFormOrSuccess />
      )}
    </div>
  );
}

/**
 * Dipisah dari CurhatForm supaya useActionState-nya baru mulai "hidup"
 * setelah consent — dan supaya SuccessScreen bisa dibaca dari state action
 * yang sama tanpa bikin state terpisah yang gampang tidak sinkron.
 */
function CurhatFormOrSuccess() {
  const [state, formAction, isPending] = useActionState(curhatFormAction, null);

  if (state?.success && state.kode) {
    return <SuccessScreen kode={state.kode} />;
  }

  return (
    <form action={formAction} className="mx-auto max-w-md space-y-5">
      <CurhatFormFields error={state?.error} isPending={isPending} />
    </form>
  );
}

function CurhatFormFields({
  error,
  isPending,
}: {
  error?: string;
  isPending: boolean;
}) {
  const [isiLength, setIsiLength] = useState(0);

  return (
    <>
      <div>
        <h1 className="text-xl font-bold text-slate-900">Ceritakan yang kamu rasakan</h1>
        <p className="text-sm text-slate-500">
          Tulis sejujur-jujurnya. Tidak ada jawaban yang salah.
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

      {/* Honeypot anti-spam — sengaja disembunyikan dari siswa sungguhan lewat CSS
          (bukan diberi type="hidden", supaya bot pengisi form otomatis yang menyisir
          semua <input> tetap "melihat" & mengisinya). Dicek di server, lihat actions/curhat.ts. */}
      <div className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="website">Situs web</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />
      </div>

      <div>
        <span className="block text-sm font-medium text-slate-700">Kategori masalah</span>
        <div className="mt-1">
          <KategoriPicker />
        </div>
      </div>

      <div>
        <span className="block text-sm font-medium text-slate-700">Mood kamu sekarang</span>
        <div className="mt-1">
          <MoodPicker />
        </div>
      </div>

      <div>
        <label htmlFor="judul" className="block text-sm font-medium text-slate-700">
          Judul singkat
        </label>
        <input
          id="judul"
          name="judul"
          type="text"
          required
          minLength={3}
          maxLength={100}
          placeholder="Mis. Bingung soal nilai ujian"
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div>
        <label htmlFor="namaSamaran" className="block text-sm font-medium text-slate-700">
          Nama samaran
        </label>
        <input
          id="namaSamaran"
          name="namaSamaran"
          type="text"
          required
          minLength={2}
          maxLength={30}
          placeholder="Boleh nama apa saja, bukan nama asli"
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div>
        <label htmlFor="isiCurhatan" className="block text-sm font-medium text-slate-700">
          Ceritanya
        </label>
        <textarea
          id="isiCurhatan"
          name="isiCurhatan"
          required
          minLength={10}
          maxLength={3000}
          rows={6}
          onChange={(e) => setIsiLength(e.target.value.length)}
          placeholder="Ceritakan apa yang terjadi dan apa yang kamu rasakan..."
          // pb ekstra di bawah supaya sudut kanan-bawah textarea (tempat
          // penghitung karakter berada) punya jarak aman dari tombol
          // "Butuh Bantuan Segera?" yang fixed di pojok layar — sebelumnya
          // tombol itu menimpa langsung area ini, ganggu saat menulis
          // curhat panjang di HP. Lihat juga EmergencyButton.tsx.
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 pb-16 text-sm outline-none focus:ring-2 focus:ring-brand-500 sm:pb-2"
        />
        <p className="mt-1 text-right text-xs text-slate-400">{isiLength}/3000</p>
      </div>

      <PasswordField
        name="password"
        label="Buat password"
        helperText="Dipakai nanti untuk cek balasan bersama Kode Konseling. Jangan pakai password akun lain."
      />

      <label className="flex items-start gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          name="siapBertemuGuruBk"
          className="mt-1 h-4 w-4 rounded border-slate-300"
        />
        Saya siap kalau suatu saat diajak bertemu langsung dengan Guru BK.
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white disabled:opacity-60"
      >
        {isPending ? "Mengirim..." : "Kirim Curhatan"}
      </button>
    </>
  );
}
