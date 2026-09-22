"use client";

import { useEffect, useRef, useState } from "react";
import type { SerializedMessage } from "@/types/ticket";
import { kompresGambarKeDataUrl } from "@/lib/image/kompres-gambar";
import { jamSekolah, labelHari } from "@/lib/waktu";

const POLL_INTERVAL_MS = 4000;

// TAHAP 13 — restyle tampilan chat meniru pola tata letak Telegram
// (wallpaper doodle, bubble tanpa "ekor", bar input bulat) sesuai contoh
// screenshot yang diberikan pengguna. SAMA seperti restyle WhatsApp
// sebelumnya: POLA/TATA LETAK yang ditiru dari Telegram, tapi WARNA tetap
// dari palet brand aplikasi ini (biru "sky", lihat tailwind.config.ts) —
// versi gelap/pekat dari palet yang sama, BUKAN abu-abu/biru gelap generik
// ala Telegram asli.
//
// Revisi setelah masukan user ("kerasa AI slop"): ikon emoji diganti SVG
// ikon asli, bubble beruntun dapat sudut yang mengecil di sisi yang
// menyambung (bukan rounded seragam), wallpaper doodle dibuat relevan ke
// tema aplikasi (curhat/keamanan/sekolah, bukan bintang/lingkaran acak),
// dan warna dibuat berlapis per bagian (bukan 1-2 nilai diulang rata).
//
// Revisi TAHAP 14: temanya dibalik dari GELAP ke TERANG, menyusul panel
// Guru BK tiga kolom yang seluruhnya terang — ruang chat gelap di tengah
// panel putih terbaca sebagai lubang, bukan bagian dari halaman yang sama.
// Pola tata letaknya tidak berubah, cuma nilai warnanya yang dibalik.
const WARNA_BG = "#f1f5f9"; // slate-100 — wallpaper, sedikit lebih tua dari kartu putih di sekelilingnya
const WARNA_HEADER = "#ffffff";
const WARNA_INPUT_BAR_BG = "#ffffff";
const WARNA_BORDER = "#e2e8f0"; // slate-200
const WARNA_BUBBLE_LAWAN = "#ffffff";
const WARNA_BUBBLE_SAYA = "#0284c7"; // brand-600 — bubble "aku" tetap warna brand
const WARNA_TEKS_BUBBLE_SAYA = "#ffffff";
const WARNA_TEKS_BUBBLE_LAWAN = "#0f172a"; // slate-900
const WARNA_TEKS_REDUP = "#64748b"; // slate-500 — jam, nama peran, teks pelengkap
const WARNA_INPUT_PILL = "#f1f5f9";
const WARNA_KIRIM_BG = "#0284c7"; // brand-600
const WARNA_KIRIM_ICON = "#ffffff";

const RADIUS_BESAR = 18;
const RADIUS_KECIL = 6;

// Tekstur wallpaper ala "doodle" Telegram, tapi ikonnya dipilih supaya
// nyambung ke tema aplikasi (curhat, rasa aman, sekolah) — bukan
// bintang/lingkaran generik: hati (peduli), gelembung chat (curhat),
// perisai (privasi & keamanan), lambang topi akademik (sekolah). Warna
// hampir menyatu dengan latar supaya cuma terasa sebagai tekstur halus.
const WALLPAPER_DOODLE_URL = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'>
    <g fill='none' stroke='#dbe4ee' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'>
      <path d='M34 30c0-3.3 2.7-6 6-6 2 0 3.8 1 5 2.5 1.2-1.5 3-2.5 5-2.5 3.3 0 6 2.7 6 6 0 5.5-11 12-11 12S34 35.5 34 30Z'/>
      <rect x='120' y='22' width='34' height='24' rx='7'/>
      <polygon points='130,46 130,54 139,46'/>
      <path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' transform='translate(48,108) scale(1.5)'/>
      <polygon points='150,150 167,158 150,166 133,158'/>
      <line x1='150' y1='166' x2='150' y2='176'/>
    </g>
  </svg>`
)}`;

type PollResult =
  | { success: true; messages: SerializedMessage[] }
  | { success: false; error: string };

interface ChatThreadProps {
  initialMessages: SerializedMessage[];
  /** Sisi mana yang dianggap "aku" untuk penempatan bubble kanan/kiri. */
  myRole: "siswa" | "guru";
  /** `gambar` — data URL base64 hasil kompresi (lihat lib/image/kompres-gambar.ts), opsional. */
  onSend: (isi: string, gambar?: string) => Promise<{ success: boolean; error?: string }>;
  onPoll: () => Promise<PollResult>;
  /**
   * Template balasan cepat (TAHAP 9) — hanya dipakai kalau `myRole==="guru"`,
   * ditampilkan sebagai dropdown di atas kotak ketik untuk mengisi draft
   * balasan dengan sekali pilih. Siswa tidak pernah melihat ini.
   */
  templates?: { id: string; judul: string; isi: string }[];
  /**
   * Tampilkan bilah judul lawan bicara di dalam komponen ini. Dimatikan
   * di panel Guru BK: di sana sudah ada bilah info tiket persis di atas
   * ruang chat, dan dua bilah judul bertumpuk cuma memakan tinggi layar
   * yang seharusnya jadi milik percakapan.
   */
  tampilkanHeader?: boolean;
}

// Jam & pembatas tanggal memakai pemformat berzona tetap dari lib/waktu.ts:
// daftar pesan ini dirender lebih dulu di server (jam UTC) lalu dihidrasi
// di perangkat (WIB), jadi format yang mengikuti zona masing-masing bikin
// teks jamnya berbeda antara keduanya.
const formatJam = jamSekolah;
const labelTanggal = labelHari;

/**
 * Sudut bubble mengecil di sisi yang "menyambung" ke pesan beruntun
 * berikutnya/sebelumnya dari pengirim yang sama — persis pola bubble
 * WhatsApp/Telegram asli, supaya pesan beruntun terasa jadi satu grup
 * visual (bukan cuma rounded-2xl seragam ditempel di setiap bubble).
 */
function radiusBubble(
  mine: boolean,
  firstInGroup: boolean,
  lastInGroup: boolean
): React.CSSProperties {
  if (mine) {
    return {
      borderTopLeftRadius: RADIUS_BESAR,
      borderBottomLeftRadius: RADIUS_BESAR,
      borderTopRightRadius: firstInGroup ? RADIUS_BESAR : RADIUS_KECIL,
      borderBottomRightRadius: lastInGroup ? RADIUS_BESAR : RADIUS_KECIL,
    };
  }
  return {
    borderTopRightRadius: RADIUS_BESAR,
    borderBottomRightRadius: RADIUS_BESAR,
    borderTopLeftRadius: firstInGroup ? RADIUS_BESAR : RADIUS_KECIL,
    borderBottomLeftRadius: lastInGroup ? RADIUS_BESAR : RADIUS_KECIL,
  };
}

// Ikon SVG asli (bukan emoji) — dipakai di avatar, tombol lampiran, tombol
// kirim, dan tanda "terkirim", supaya tampilannya terasa dirancang, bukan
// cuma tempel glyph emoji generik.
function IkonAvatar({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}

function IkonLampiran({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function IkonKirim({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function IkonCentang({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IkonUnduh({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IkonTutup({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/**
 * Komponen chat yang dipakai BERSAMA oleh siswa (halaman /cek-balasan) dan
 * Guru BK (halaman /guru/[kode]) — perilaku spesifik per-peran (siapa yang
 * boleh akses tiket mana, dsb) sudah ditangani di Server Action yang
 * di-passing lewat props onSend/onPoll, jadi komponen ini sendiri tidak
 * perlu tahu apa-apa soal otentikasi.
 *
 * Update pesan pakai POLLING tiap beberapa detik, bukan Firestore
 * onSnapshot — konsisten dengan keputusan arsitektur dari awal proyek:
 * browser tidak pernah punya akses Firestore langsung sama sekali.
 */
export default function ChatThread({
  initialMessages,
  myRole,
  onSend,
  onPoll,
  templates,
  tampilkanHeader = true,
}: ChatThreadProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Lampiran gambar (TAHAP 11) — `gambarSiap` sudah dalam bentuk data URL
  // hasil kompresi, siap dikirim apa adanya ke onSend. `memproses` menutupi
  // jeda kompresi (bisa ~1 detik di HP lama) supaya tombol kirim tidak
  // dipencet dengan gambar yang belum selesai diproses.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [gambarSiap, setGambarSiap] = useState<string | null>(null);
  const [memprosesGambar, setMemprosesGambar] = useState(false);
  const [gambarError, setGambarError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function poll() {
      // Lewati saat tab disembunyikan (pindah tab/aplikasi lain) — polling
      // sebelumnya jalan terus tiap 4 detik walau tab tidak terlihat sama
      // sekali, tiap kali mengunduh ULANG seluruh percakapan (termasuk
      // gambar base64, bisa ratusan KB per pesan). Untuk percakapan dengan
      // beberapa foto ini berarti puluhan MB kuota per menit yang terbuang
      // percuma di tab yang tidak sedang dilihat.
      if (document.hidden) return;
      const result = await onPoll();
      if (active && result.success) setMessages(result.messages);
    }

    poll(); // ambil data terbaru segera, tidak nunggu interval pertama
    const interval = setInterval(poll, POLL_INTERVAL_MS);

    // Begitu tab terlihat lagi, langsung ambil data terbaru — supaya
    // pesan yang masuk selagi tab tersembunyi tidak menunggu sampai
    // interval berikutnya.
    function handleVisibility() {
      if (!document.hidden) poll();
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      active = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const isi = draft.trim();
    if (!isi && !gambarSiap) return;

    setSending(true);
    setError(null);
    const result = await onSend(isi, gambarSiap ?? undefined);
    setSending(false);

    if (!result.success) {
      setError(result.error ?? "Gagal mengirim pesan.");
      return;
    }

    setDraft("");
    handleBatalkanGambar();
    const refreshed = await onPoll();
    if (refreshed.success) setMessages(refreshed.messages);
  }

  async function handlePilihGambar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset input SEGERA supaya memilih file yang sama persis dua kali
    // berturut-turut tetap memicu onChange.
    e.target.value = "";
    if (!file) return;

    setGambarError(null);
    setMemprosesGambar(true);
    try {
      const dataUrl = await kompresGambarKeDataUrl(file);
      setGambarSiap(dataUrl);
    } catch (err) {
      setGambarError(err instanceof Error ? err.message : "Gagal memproses gambar.");
    } finally {
      setMemprosesGambar(false);
    }
  }

  function handleBatalkanGambar() {
    setGambarSiap(null);
    setGambarError(null);
  }

  // Unduh gambar (data URL base64) langsung ke perangkat — dipicu dari
  // lightbox. Teknik <a download> ini jalan untuk data URL tanpa perlu
  // konversi Blob/fetch (tidak ada isu CORS karena bukan resource lintas
  // origin), dan didukung baik di browser desktop maupun mobile.
  function handleUnduhGambar(dataUrl: string) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `ruang-aman-bk-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function handlePilihTemplate(e: React.ChangeEvent<HTMLSelectElement>) {
    const tpl = templates?.find((t) => t.id === e.target.value);
    if (tpl) setDraft(tpl.isi);
    e.target.value = ""; // balik ke placeholder — ini aksi "isi draft", bukan pilihan menetap
  }

  const lawanBicara = myRole === "siswa" ? "Guru BK" : "Siswa (Anonim)";

  return (
    // Sengaja TIDAK rounded-2xl/border/shadow lagi — sebelumnya ini
    // dirender sebagai "kartu" di tengah halaman dengan gutter putih di
    // sekeliling & sudut membulat, user eksplisit menolak itu (dibanding
    // ke screenshot Telegram asli, yang layar chat-nya SATU BIDANG PENUH
    // dari tepi ke tepi, tanpa bingkai). Sekarang ChatThread mengisi
    // container-nya penuh, sudut lurus — halaman pemanggil yang atur mau
    // full-bleed (siswa) atau tetap di dalam kartu dashboard (guru).
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Header ala percakapan Telegram — latar putih, dipisahkan dari
          wallpaper oleh garis tipis di bawahnya. */}
      {tampilkanHeader && (
        <div
          className="flex items-center gap-3 border-b px-4 py-3"
          style={{ backgroundColor: WARNA_HEADER, borderColor: WARNA_BORDER }}
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: "#e0f2fe", color: "#0369a1" }}
          >
            <IkonAvatar className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{lawanBicara}</p>
            <p className="truncate text-[11px]" style={{ color: WARNA_TEKS_REDUP }}>
              Ruang Aman
            </p>
          </div>
        </div>
      )}

      {/* Wallpaper bertekstur + daftar pesan */}
      <div
        className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3"
        style={{
          backgroundColor: WARNA_BG,
          backgroundImage: `url("${WALLPAPER_DOODLE_URL}")`,
          backgroundSize: "200px 200px",
        }}
      >
        {messages.length === 0 && (
          <div className="flex justify-center pt-4">
            <p
              className="rounded-lg px-3 py-1.5 text-center text-xs shadow-sm"
              style={{ backgroundColor: WARNA_BUBBLE_LAWAN, color: WARNA_TEKS_REDUP, border: `1px solid ${WARNA_BORDER}` }}
            >
              Belum ada pesan. Mulai percakapan di bawah.
            </p>
          </div>
        )}
        {messages.map((m, i) => {
          const mine = m.pengirim === myRole;
          const prev = i > 0 ? messages[i - 1] : null;
          const next = i < messages.length - 1 ? messages[i + 1] : null;

          const tanggalIni = labelTanggal(m.createdAtMs);
          const tampilkanPembatasTanggal = !prev || labelTanggal(prev.createdAtMs) !== tanggalIni;

          const satuGrupDenganSebelumnya =
            !!prev && !tampilkanPembatasTanggal && prev.pengirim === m.pengirim;
          const satuGrupDenganSesudahnya =
            !!next && next.pengirim === m.pengirim && labelTanggal(next.createdAtMs) === tanggalIni;

          const warnaBubble = mine ? WARNA_BUBBLE_SAYA : WARNA_BUBBLE_LAWAN;

          return (
            <div key={i}>
              {tampilkanPembatasTanggal && (
                <div className="flex justify-center py-2">
                  <span
                    className="rounded-lg px-3 py-1 text-[11px] font-medium shadow-sm"
                    style={{ backgroundColor: WARNA_BUBBLE_LAWAN, color: WARNA_TEKS_REDUP, border: `1px solid ${WARNA_BORDER}` }}
                  >
                    {tanggalIni}
                  </span>
                </div>
              )}
              <div
                className={`flex ${mine ? "justify-end" : "justify-start"} ${
                  satuGrupDenganSebelumnya ? "mt-0.5" : "mt-2"
                }`}
              >
                <div
                  className="max-w-[75%] px-3 py-2 text-sm shadow-sm"
                  style={{
                    backgroundColor: warnaBubble,
                    color: mine ? WARNA_TEKS_BUBBLE_SAYA : WARNA_TEKS_BUBBLE_LAWAN,
                    ...radiusBubble(mine, !satuGrupDenganSebelumnya, !satuGrupDenganSesudahnya),
                  }}
                >
                  {m.gambar && (
                    // eslint-disable-next-line @next/next/no-img-element -- data URL base64, bukan aset statis
                    <img
                      src={m.gambar}
                      alt="Gambar terlampir"
                      onClick={() => setLightbox(m.gambar!)}
                      className={`max-h-60 w-full cursor-zoom-in rounded-md object-contain ${
                        m.isi ? "mb-1" : ""
                      }`}
                    />
                  )}
                  {m.isi && (
                    <p className="whitespace-pre-wrap break-words pr-12">{m.isi}</p>
                  )}
                  <p
                    className={`float-right -mb-0.5 ml-1.5 mt-0.5 flex items-center gap-1 text-[10px] ${
                      m.isi ? "" : "pt-0.5"
                    }`}
                    style={{ color: mine ? "rgba(255,255,255,0.85)" : WARNA_TEKS_REDUP }}
                  >
                    {formatJam(m.createdAtMs)}
                    {/* Centang tunggal = "terkirim" — sengaja BUKAN centang ganda
                        ala status "dibaca", karena data model chat ini tidak
                        melacak status baca per pesan. Cuma di pesan milikku. */}
                    {mine && <IkonCentang className="h-2.5 w-2.5" style={{ color: "#bae6fd" }} />}
                  </p>
                  <span className="clear-both block" />
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p
          className="border-t px-4 py-2 text-xs"
          style={{ borderColor: WARNA_BORDER, backgroundColor: "#fef2f2", color: "#b91c1c" }}
        >
          {error}
        </p>
      )}
      {gambarError && (
        <p
          className="border-t px-4 py-2 text-xs"
          style={{ borderColor: WARNA_BORDER, backgroundColor: "#fef2f2", color: "#b91c1c" }}
        >
          {gambarError}
        </p>
      )}

      {/* Bar input ala Telegram — kotak input gelap membulat, tombol
          lampirkan DI LUAR pil (di kanan), tombol kirim bundar terang
          paling kanan. */}
      <form
        onSubmit={handleSend}
        className="space-y-2 border-t p-2"
        style={{ backgroundColor: WARNA_INPUT_BAR_BG, borderColor: WARNA_BORDER }}
      >
        {myRole === "guru" && templates && templates.length > 0 && (
          <select
            defaultValue=""
            onChange={handlePilihTemplate}
            className="w-full rounded-xl px-3 py-1.5 text-xs outline-none"
            style={{
              backgroundColor: WARNA_INPUT_PILL,
              color: "#334155",
              border: `1px solid ${WARNA_BORDER}`,
            }}
          >
            <option value="" disabled>
              ⚡ Pakai template balasan cepat...
            </option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.judul}
              </option>
            ))}
          </select>
        )}

        {gambarSiap && (
          <div
            className="flex items-center gap-2 rounded-xl px-2 py-2 shadow-sm"
            style={{ backgroundColor: WARNA_INPUT_PILL }}
          >
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL base64, bukan aset statis */}
              <img
                src={gambarSiap}
                alt="Pratinjau gambar yang akan dikirim"
                className="h-14 w-14 rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={handleBatalkanGambar}
                aria-label="Batalkan gambar"
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-xs text-white shadow"
                style={{ backgroundColor: "#94a3b8" }}
              >
                ✕
              </button>
            </div>
            <p className="text-xs" style={{ color: WARNA_TEKS_REDUP }}>
              Gambar siap dikirim
            </p>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handlePilihGambar}
            className="hidden"
          />
          <div
            className="min-w-0 flex-1 rounded-3xl px-4 py-2.5"
            style={{ backgroundColor: WARNA_INPUT_PILL }}
          >
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={2000}
              placeholder="Ketik pesan"
              className="w-full bg-transparent text-sm outline-none"
              style={{ color: WARNA_TEKS_BUBBLE_LAWAN }}
            />
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={memprosesGambar || sending}
            title="Lampirkan gambar"
            aria-label="Lampirkan gambar"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full disabled:opacity-50"
            style={{ color: WARNA_TEKS_REDUP }}
          >
            {memprosesGambar ? (
              <span className="text-lg leading-none">…</span>
            ) : (
              <IkonLampiran className="h-5 w-5" />
            )}
          </button>
          <button
            type="submit"
            disabled={sending || memprosesGambar || (draft.trim().length === 0 && !gambarSiap)}
            aria-label="Kirim"
            title="Kirim"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-sm disabled:opacity-40"
            style={{ backgroundColor: WARNA_KIRIM_BG, color: WARNA_KIRIM_ICON }}
          >
            <IkonKirim className="h-5 w-5" />
          </button>
        </div>
      </form>

      {lightbox && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setLightbox(null)}
          onKeyDown={(e) => e.key === "Escape" && setLightbox(null)}
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/80 p-4"
        >
          <div className="absolute right-4 top-4 flex gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleUnduhGambar(lightbox);
              }}
              title="Unduh gambar"
              aria-label="Unduh gambar"
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm hover:bg-white/25"
            >
              <IkonUnduh className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightbox(null);
              }}
              title="Tutup"
              aria-label="Tutup"
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm hover:bg-white/25"
            >
              <IkonTutup className="h-5 w-5" />
            </button>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL base64, bukan aset statis */}
          <img
            src={lightbox}
            alt="Gambar diperbesar"
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full cursor-default rounded-lg object-contain"
          />
        </div>
      )}
    </div>
  );
}
