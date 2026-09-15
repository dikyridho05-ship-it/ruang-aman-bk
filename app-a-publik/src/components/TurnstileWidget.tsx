"use client";

import Script from "next/script";
import { useEffect, useId, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        }
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
    };
  }
}

/**
 * Widget CAPTCHA Cloudflare Turnstile — menggantikan pola "tahan tombol 2
 * detik" yang sebelumnya dipakai di ConsentGate. Bedanya: ini benar-benar
 * memverifikasi bahwa yang mengisi form adalah manusia (bukan cuma niat),
 * dan tokennya diverifikasi ULANG di server (lihat lib/security/turnstile.ts)
 * sebelum curhatan disimpan — jadi tidak bisa dilewati dari client.
 */
export default function TurnstileWidget({
  onVerify,
}: {
  onVerify: (token: string) => void;
}) {
  const containerId = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);
  const onVerifyRef = useRef(onVerify);
  onVerifyRef.current = onVerify;

  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // Dipanggil dari Script onReady (fires di setiap mount, termasuk saat
  // React StrictMode sengaja mount-unmount-mount komponen ini di dev) supaya
  // widget selalu ter-render ulang ke container yang aktif saat itu — kalau
  // pakai onLoad biasa, remount kedua tidak akan pernah dapat callback-nya
  // karena skrip cuma "onload" sekali seumur halaman.
  const renderWidget = () => {
    if (!window.turnstile || !containerRef.current || !sitekey) return;
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey,
      callback: (token) => onVerifyRef.current(token),
      "expired-callback": () => window.turnstile?.reset(widgetIdRef.current),
    });
  };

  useEffect(() => {
    return () => {
      if (widgetIdRef.current) {
        window.turnstile?.remove(widgetIdRef.current);
        widgetIdRef.current = undefined;
      }
    };
  }, []);

  if (!sitekey) {
    return (
      <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
        Verifikasi belum bisa ditampilkan: NEXT_PUBLIC_TURNSTILE_SITE_KEY belum
        diisi di .env.local.
      </p>
    );
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onReady={renderWidget}
      />
      <div id={containerId} ref={containerRef} />
    </>
  );
}
