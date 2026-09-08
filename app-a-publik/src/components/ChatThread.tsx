"use client";

import { useEffect, useRef, useState } from "react";
import type { SerializedMessage } from "@/types/ticket";

const POLL_INTERVAL_MS = 4000;

type PollResult =
  | { success: true; messages: SerializedMessage[] }
  | { success: false; error: string };

interface ChatThreadProps {
  initialMessages: SerializedMessage[];
  /** Sisi mana yang dianggap "aku" untuk penempatan bubble kanan/kiri. */
  myRole: "siswa" | "guru";
  onSend: (isi: string) => Promise<{ success: boolean; error?: string }>;
  onPoll: () => Promise<PollResult>;
  /**
   * Template balasan cepat (TAHAP 9) — hanya dipakai kalau `myRole==="guru"`,
   * ditampilkan sebagai dropdown di atas kotak ketik untuk mengisi draft
   * balasan dengan sekali pilih. Siswa tidak pernah melihat ini.
   */
  templates?: { id: string; judul: string; isi: string }[];
}

/**
 * Komponen chat WA-style yang dipakai BERSAMA oleh siswa (halaman
 * /cek-balasan) dan Guru BK (halaman /guru/[kode]) — perilaku spesifik
 * per-peran (siapa yang boleh akses tiket mana, dsb) sudah ditangani di
 * Server Action yang di-passing lewat props onSend/onPoll, jadi komponen
 * ini sendiri tidak perlu tahu apa-apa soal otentikasi.
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
}: ChatThreadProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    async function poll() {
      const result = await onPoll();
      if (active && result.success) setMessages(result.messages);
    }

    poll(); // ambil data terbaru segera, tidak nunggu interval pertama
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const isi = draft.trim();
    if (!isi) return;

    setSending(true);
    setError(null);
    const result = await onSend(isi);
    setSending(false);

    if (!result.success) {
      setError(result.error ?? "Gagal mengirim pesan.");
      return;
    }

    setDraft("");
    const refreshed = await onPoll();
    if (refreshed.success) setMessages(refreshed.messages);
  }

  function handlePilihTemplate(e: React.ChangeEvent<HTMLSelectElement>) {
    const tpl = templates?.find((t) => t.id === e.target.value);
    if (tpl) setDraft(tpl.isi);
    e.target.value = ""; // balik ke placeholder — ini aksi "isi draft", bukan pilihan menetap
  }

  return (
    <div className="flex h-[65vh] flex-col rounded-2xl border border-slate-200 bg-slate-50">
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-slate-400">Belum ada pesan.</p>
        )}
        {messages.map((m, i) => {
          const mine = m.pengirim === myRole;
          return (
            <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                  mine
                    ? "bg-brand-600 text-white"
                    : "border border-slate-200 bg-white text-slate-800"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.isi}</p>
                <p className={`mt-1 text-[10px] ${mine ? "text-brand-100" : "text-slate-400"}`}>
                  {new Date(m.createdAtMs).toLocaleString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">{error}</p>
      )}

      <form onSubmit={handleSend} className="space-y-2 border-t border-slate-200 p-3">
        {myRole === "guru" && templates && templates.length > 0 && (
          <select
            defaultValue=""
            onChange={handlePilihTemplate}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 outline-none focus:ring-2 focus:ring-brand-500"
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
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={2000}
            placeholder="Tulis pesan..."
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="submit"
            disabled={sending || draft.trim().length === 0}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Kirim
          </button>
        </div>
      </form>
    </div>
  );
}
