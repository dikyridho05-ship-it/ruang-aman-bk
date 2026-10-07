"use client";

import { useEffect, useState } from "react";

type Status = "checking" | "unsupported" | "not-configured" | "off" | "on" | "busy";
type MutateResult = { success: boolean; error?: string };

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

interface PushToggleButtonProps {
  /** Teks tombol saat notifikasi belum aktif. */
  enableLabel: string;
  /** Teks badge saat notifikasi sudah aktif di perangkat ini. */
  activeLabel: string;
  subscribeAction: (subscription: unknown) => Promise<MutateResult>;
  unsubscribeAction: (endpoint: string) => Promise<MutateResult>;
}

/**
 * Tombol aktifkan/matikan Web Push, generik — dipakai Guru BK (dashboard
 * /guru, TAHAP 6) & siswa (halaman /cek-balasan, TAHAP 8). Bedanya cuma di
 * Server Action mana yang dipanggil (lewat props) dan label teksnya; logika
 * subscribe/unsubscribe browser-nya identik, jadi sengaja satu komponen.
 * Tidak butuh akun pihak ketiga apa pun — cukup Web Push API bawaan browser
 * + kunci VAPID yang sudah dibuatkan (lihat .env.local).
 */
export default function PushToggleButton({
  enableLabel,
  activeLabel,
  subscribeAction,
  unsubscribeAction,
}: PushToggleButtonProps) {
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!VAPID_PUBLIC_KEY) {
      setStatus("not-configured");
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }

    navigator.serviceWorker
      .getRegistration()
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => setStatus(sub ? "on" : "off"))
      .catch(() => setStatus("off"));
  }, []);

  async function handleEnable() {
    setError(null);
    setStatus("busy");
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("off");
        setError("Izin notifikasi ditolak. Aktifkan lewat pengaturan browser kalau berubah pikiran.");
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY as string) as BufferSource,
      });

      const result = await subscribeAction(subscription.toJSON());
      if (!result.success) {
        setError(result.error ?? "Gagal menyimpan langganan notifikasi.");
        setStatus("off");
        return;
      }

      setStatus("on");
    } catch (err) {
      console.error("[PushToggleButton] gagal aktifkan notifikasi:", err);
      setError("Gagal mengaktifkan notifikasi di perangkat ini.");
      setStatus("off");
    }
  }

  async function handleDisable() {
    setError(null);
    setStatus("busy");
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await unsubscribeAction(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("off");
    } catch (err) {
      console.error("[PushToggleButton] gagal matikan notifikasi:", err);
      setError("Gagal mematikan notifikasi di perangkat ini.");
      setStatus("on");
    }
  }

  if (status === "checking" || status === "not-configured") return null;

  if (status === "unsupported") {
    return (
      <p className="text-xs leading-snug text-slate-500">
        Browser ini belum bisa menerima notifikasi. Di iPhone, tambahkan Ruang Aman ke Layar Utama
        dulu lewat tombol Bagikan.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {status === "on" ? (
        <>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <IkonLonceng className="h-4 w-4" />
            {activeLabel}
          </span>
          <button
            type="button"
            onClick={handleDisable}
            className="rounded text-xs font-medium text-slate-500 underline-offset-2 hover:underline"
          >
            Matikan
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={handleEnable}
          disabled={status === "busy"}
          className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-60"
        >
          <IkonLonceng className="h-4 w-4" />
          {status === "busy" ? "Memproses…" : enableLabel}
        </button>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

function IkonLonceng({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M6 9.5a6 6 0 1 1 12 0c0 4.5 1.5 6 2 6.5H4c.5-.5 2-2 2-6.5Z" />
      <path d="M10 19.5a2 2 0 0 0 4 0" />
    </svg>
  );
}
