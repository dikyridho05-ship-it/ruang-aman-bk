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

  if (status === "checking") return null;

  if (status === "unsupported" || status === "not-configured") {
    return (
      <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
        Notifikasi push belum aktif di proyek ini.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "on" ? (
        <>
          <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            🔔 {activeLabel}
          </span>
          <button
            type="button"
            onClick={handleDisable}
            className="text-xs font-medium text-slate-500 underline"
          >
            Matikan
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={handleEnable}
          disabled={status === "busy"}
          className="rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          {status === "busy" ? "Memproses..." : `🔔 ${enableLabel}`}
        </button>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
