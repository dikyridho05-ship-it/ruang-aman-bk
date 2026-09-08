"use client";

import PushToggleButton from "@/components/PushToggleButton";
import { savePushSubscriptionAction, removePushSubscriptionAction } from "@/actions/push";

/** Notifikasi curhatan baru untuk Guru BK (TAHAP 6) — dashboard /guru. */
export default function PushSubscribeButton() {
  return (
    <PushToggleButton
      enableLabel="Aktifkan Notifikasi Curhatan Baru"
      activeLabel="Notifikasi aktif di perangkat ini"
      subscribeAction={savePushSubscriptionAction}
      unsubscribeAction={removePushSubscriptionAction}
    />
  );
}
