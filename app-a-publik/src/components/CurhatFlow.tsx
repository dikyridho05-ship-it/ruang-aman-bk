"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { curhatFormAction } from "@/actions/curhat";
import { ingatTiket, unduhKartuKode } from "@/lib/ingatan-tiket";
import KategoriPicker from "@/components/KategoriPicker";
import MoodPicker from "@/components/MoodPicker";
import PasswordField from "@/components/PasswordField";
import TurnstileWidget from "@/components/TurnstileWidget";
import JamLayananBadge from "@/components/JamLayananBadge";

/**
 * Persetujuan sebelum bercerita — diselesaikan lewat Cloudflare Turnstile,
 * tokennya diverifikasi ulang di server (actions/curhat.ts).
 *
 * `visible={false}` menyembunyikan bagian ini lewat CSS, BUKAN meng-unmount:
 * Turnstile harus tetap hidup di belakang layar supaya tokennya otomatis
 * diperbarui sebelum kedaluwarsa (~5 menit). Siswa yang butuh waktu lama
 * menulis — justru yang paling butuh layanan ini — tidak boleh gagal kirim.
 */
function ConsentGate({
  visible,
  onConfirm,
}: {
  visible: boolean;
  onConfirm: (turnstileToken: string) => void;
}) {
  return (
    <section className={visible ? "" : "hidden"} aria-labelledby="judul-persetujuan">
      <h1 id="judul-persetujuan" className="text-[28px] font-extrabold leading-tight tracking-tight text-tinta">
        Sebelum mulai bercerita
      </h1>

      <dl className="mt-6 space-y-5">
        <div>
          <dt className="text-[15px] font-bold text-tinta">Kamu tidak perlu menyebut nama</dt>
          <dd className="mt-1 text-[15px] leading-relaxed text-slate-600">
            Tidak ada nama, NIS, kelas, atau nomor HP yang ditanyakan. Kamu cukup membuat nama
            samaran dan password.
          </dd>
        </div>
        <div>
          <dt className="text-[15px] font-bold text-tinta">Simpan kode yang kamu terima</dt>
          <dd className="mt-1 text-[15px] leading-relaxed text-slate-600">
            Setelah mengirim, kamu mendapat Kode Konseling. Kode itu dan password-mu adalah kunci
            untuk membaca balasan Guru BK.
          </dd>
        </div>
        <div>
          <dt className="text-[15px] font-bold text-red-700">Kalau kamu dalam bahaya sekarang</dt>
          <dd className="mt-1 text-[15px] leading-relaxed text-slate-600">
            Jangan menunggu balasan. Tekan tombol bantuan darurat di pojok kanan bawah untuk
            menghubungi orang yang bisa menolong saat ini juga.
          </dd>
        </div>
      </dl>

      <div className="mt-8 border-t border-slate-200 pt-6">
        <p className="mb-3 text-sm text-slate-600">Centang kotak di bawah untuk lanjut.</p>
        <TurnstileWidget onVerify={onConfirm} />
      </div>
    </section>
  );
}

function SuccessScreen({ kode }: { kode: string }) {
  const [copied, setCopied] = useState(false);

  // Begitu kode terbit, browser siswa langsung mengingatnya — penambal utama
  // keluhan "kode hilang": siswa tidak perlu melakukan apa pun dulu.
  useEffect(() => {
    ingatTiket(kode);
  }, [kode]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(kode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard bisa gagal di HP lama — kode tetap terlihat untuk dicatat.
    }
  };

  return (
    <section role="status" aria-live="polite">
      <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-tinta">
        Ceritamu sudah sampai
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
        Guru BK akan membacanya. Ini kode untuk membuka balasannya nanti.
      </p>

      <div className="mt-6 rounded-2xl bg-tinta px-6 py-5 text-white">
        <p className="text-sm text-brand-200">Kode Konseling</p>
        <p className="mt-1.5 select-all break-all font-mono text-[30px] font-bold tracking-[0.05em]">{kode}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg bg-white py-2.5 text-sm font-bold text-tinta hover:bg-brand-50"
          >
            {copied ? "Tersalin" : "Salin kode"}
          </button>
          <button
            type="button"
            onClick={() => unduhKartuKode(kode, "Ruang Aman")}
            className="rounded-lg bg-white/10 py-2.5 text-sm font-bold text-white ring-1 ring-white/30 hover:bg-white/15"
          >
            Simpan gambar
          </button>
        </div>
      </div>

      <ul className="mt-6 space-y-3 text-[15px] leading-relaxed text-slate-600">
        <li>HP ini sudah mengingat kodenya. Buka “Buka balasan” dari HP yang sama, kodenya sudah terisi.</li>
        <li>
          Password tidak disimpan dalam bentuk aslinya. Kalau lupa, kamu bisa memulihkannya dengan kode
          ini dan nama samaranmu.
        </li>
      </ul>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/cek-balasan"
          className="rounded-xl bg-brand-600 px-6 py-3.5 text-center text-[15px] font-bold text-white hover:bg-brand-700"
        >
          Buka percakapan
        </Link>
        <Link href="/" className="rounded-xl px-6 py-3.5 text-center text-[15px] font-semibold text-tinta hover:bg-white">
          Kembali ke beranda
        </Link>
      </div>
    </section>
  );
}

export default function CurhatFlow() {
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  return (
    <div className="mx-auto w-full max-w-xl px-5 pb-16 pt-4 sm:pt-10">
      <ConsentGate visible={!turnstileToken} onConfirm={setTurnstileToken} />
      {turnstileToken && <CurhatFormOrSuccess turnstileToken={turnstileToken} />}
    </div>
  );
}

const LANGKAH = [
  { id: "rasa", label: "Perasaanmu" },
  { id: "cerita", label: "Ceritamu" },
  { id: "kunci", label: "Kunci akses" },
] as const;

/**
 * Formulir dibagi tiga langkah (perasaan → cerita → kunci akses). Satu
 * halaman panjang berisi delapan isian membuat siswa yang sedang berat
 * pikirannya harus menggulir jauh sebelum sempat mulai menulis; di sini
 * yang pertama ditanya cuma "bagaimana perasaanmu".
 *
 * Ketiga langkah tetap SATU <form> (langkah yang tidak aktif disembunyikan
 * lewat CSS), jadi pengiriman tetap satu Server Action seperti sebelumnya.
 */
function CurhatFormOrSuccess({ turnstileToken }: { turnstileToken: string }) {
  const [state, formAction, isPending] = useActionState(curhatFormAction, null);
  const [langkah, setLangkah] = useState(0);
  const [galatLangkah, setGalatLangkah] = useState<string | null>(null);
  const [isiLength, setIsiLength] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const judulRef = useRef<HTMLHeadingElement>(null);

  // Pindah langkah → fokus ke judul langkah, supaya pembaca layar tahu
  // bagian baru sudah tampil dan HP menggulir ke atas.
  useEffect(() => {
    judulRef.current?.focus();
  }, [langkah]);

  if (state?.success && state.kode) {
    return <SuccessScreen kode={state.kode} />;
  }

  function periksaLangkah(): boolean {
    const form = formRef.current;
    if (!form) return false;
    setGalatLangkah(null);

    if (langkah === 0) {
      const mood = (form.querySelector('input[name="mood"]') as HTMLInputElement | null)?.value;
      const jumlahKategori = form.querySelectorAll('input[name="kategori"]').length;
      if (!mood) {
        setGalatLangkah("Pilih dulu perasaanmu sekarang.");
        return false;
      }
      if (jumlahKategori === 0) {
        setGalatLangkah("Pilih minimal satu hal yang ingin kamu ceritakan.");
        return false;
      }
      return true;
    }

    const bagian = form.querySelector<HTMLElement>(`[data-langkah="${langkah}"]`);
    const isian = bagian?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea") ?? [];
    for (const el of isian) {
      if (!el.checkValidity()) {
        el.reportValidity();
        return false;
      }
    }
    return true;
  }

  function lanjut() {
    if (periksaLangkah()) setLangkah((l) => Math.min(l + 1, LANGKAH.length - 1));
  }

  return (
    // onSubmit + startTransition, BUKAN `action={formAction}`: React mengosongkan
    // isian <form action> setelah aksi selesai, termasuk saat server menolak
    // (mis. verifikasi kedaluwarsa). Cerita panjang yang sudah ditulis siswa
    // tidak boleh hilang hanya karena satu kegagalan kirim.
    <form
      ref={formRef}
      noValidate={langkah < 2}
      onClickCapture={() => galatLangkah && setGalatLangkah(null)}
      onSubmit={(e) => {
        e.preventDefault();
        if (!e.currentTarget.checkValidity()) {
          e.currentTarget.reportValidity();
          return;
        }
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
    >
      <input type="hidden" name="turnstileToken" value={turnstileToken} />

      <ol className="flex gap-2" aria-label="Langkah">
        {LANGKAH.map((l, i) => (
          <li key={l.id} className="flex-1" aria-current={i === langkah ? "step" : undefined}>
            <span className={`block h-1 rounded-full ${i <= langkah ? "bg-brand-600" : "bg-slate-200"}`} />
            <span
              className={`mt-2 block text-xs ${i === langkah ? "font-bold text-tinta" : "text-slate-500"}`}
            >
              {l.label}
            </span>
          </li>
        ))}
      </ol>

      {/* Honeypot anti-spam — tersembunyi dari siswa lewat CSS (bukan
          type="hidden"), supaya bot pengisi form otomatis tetap mengisinya.
          Dicek di server, lihat actions/curhat.ts. */}
      <div className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="website">Situs web</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      </div>

      {(state?.error || galatLangkah) && (
        <p role="alert" className="mt-6 rounded-lg border-l-4 border-red-500 bg-red-50 px-3.5 py-3 text-sm text-red-800">
          {galatLangkah ?? state?.error}
        </p>
      )}

      {/* Langkah 1 — perasaan */}
      <div data-langkah="0" className={langkah === 0 ? "mt-8 space-y-8" : "hidden"}>
        <h2 ref={langkah === 0 ? judulRef : undefined} tabIndex={-1} className="text-[26px] font-extrabold leading-tight tracking-tight text-tinta outline-none">
          Bagaimana perasaanmu sekarang?
        </h2>
        <MoodPicker />
        <KategoriPicker />
      </div>

      {/* Langkah 2 — cerita */}
      <div data-langkah="1" className={langkah === 1 ? "mt-8 space-y-6" : "hidden"}>
        <div>
          <h2 ref={langkah === 1 ? judulRef : undefined} tabIndex={-1} className="text-[26px] font-extrabold leading-tight tracking-tight text-tinta outline-none">
            Ceritakan yang terjadi
          </h2>
          <p className="mt-1.5 text-[15px] text-slate-600">Tulis seperti kamu bicara ke orang yang kamu percaya.</p>
        </div>

        <div>
          <label htmlFor="judul" className="block text-sm font-semibold text-slate-700">
            Judul singkat
          </label>
          <input
            id="judul"
            name="judul"
            type="text"
            required
            minLength={3}
            maxLength={100}
            placeholder="Misalnya: Bingung soal nilai ujian"
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-[15px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          />
        </div>

        <div>
          <label htmlFor="isiCurhatan" className="block text-sm font-semibold text-slate-700">
            Ceritanya
          </label>
          <textarea
            id="isiCurhatan"
            name="isiCurhatan"
            required
            minLength={10}
            maxLength={3000}
            rows={9}
            onChange={(e) => setIsiLength(e.target.value.length)}
            placeholder="Apa yang terjadi, sejak kapan, dan apa yang kamu rasakan…"
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-[15px] leading-relaxed outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          />
          <p className="mt-1 text-right text-xs tabular-nums text-slate-500">{isiLength}/3000</p>
        </div>
      </div>

      {/* Langkah 3 — kunci akses */}
      <div data-langkah="2" className={langkah === 2 ? "mt-8 space-y-6" : "hidden"}>
        <div>
          <h2 ref={langkah === 2 ? judulRef : undefined} tabIndex={-1} className="text-[26px] font-extrabold leading-tight tracking-tight text-tinta outline-none">
            Buat kunci untuk membuka balasan
          </h2>
          <p className="mt-1.5 text-[15px] text-slate-600">
            Hanya kamu yang tahu. Guru BK tidak melihat nama samaran maupun password-mu.
          </p>
        </div>

        <div>
          <label htmlFor="namaSamaran" className="block text-sm font-semibold text-slate-700">
            Nama samaran
          </label>
          <input
            id="namaSamaran"
            name="namaSamaran"
            type="text"
            required
            minLength={2}
            maxLength={30}
            autoComplete="off"
            placeholder="Bukan nama asli, misalnya LangitBiru27"
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-[15px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          />
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
            Dipakai untuk memulihkan akses kalau kamu lupa. Jangan pakai nama yang pernah kamu ceritakan ke orang lain.
          </p>
        </div>

        <PasswordField
          name="password"
          label="Password"
          helperText="Minimal 8 karakter. Jangan pakai password akun lain."
        />

        <label className="flex items-start gap-3 rounded-xl bg-white p-4 text-[15px] leading-snug text-slate-700 ring-1 ring-slate-200">
          <input type="checkbox" name="siapBertemuGuruBk" className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 accent-brand-600" />
          <span>
            Saya bersedia kalau nanti diajak bertemu langsung dengan Guru BK.
            <span className="mt-0.5 block text-sm text-slate-500">Boleh dikosongkan. Kamu juga bisa mengatur janji temu sendiri nanti.</span>
          </span>
        </label>

        <JamLayananBadge />
      </div>

      <div className="mt-8 flex items-center gap-3">
        {langkah > 0 && (
          <button
            type="button"
            onClick={() => {
              setGalatLangkah(null);
              setLangkah((l) => l - 1);
            }}
            className="rounded-xl px-5 py-3.5 text-[15px] font-semibold text-tinta hover:bg-white"
          >
            Kembali
          </button>
        )}
        {langkah < LANGKAH.length - 1 ? (
          <button
            type="button"
            onClick={lanjut}
            className="ml-auto rounded-xl bg-brand-600 px-7 py-3.5 text-[15px] font-bold text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            Lanjut
          </button>
        ) : (
          <button
            type="submit"
            disabled={isPending}
            className="ml-auto rounded-xl bg-brand-600 px-7 py-3.5 text-[15px] font-bold text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {isPending ? "Mengirim…" : "Kirim cerita"}
          </button>
        )}
      </div>
    </form>
  );
}
