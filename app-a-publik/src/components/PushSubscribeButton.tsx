"use client";

import PushToggleButton from "@/components/PushToggleButton";
import { savePushSubscriptionAction, removePushSubscriptionAction } from "@/actions/push";

/** Notifikasi curhatan baru untuk Guru BK (TAHAP 6) — dashboard /guru. */
export default function PushSubscribeButton() {
  return (
    <PushToggleButton
      enableLabel="Kabari saya kalau ada curhatan baru"
      activeLabel="Notifikasi curhatan baru aktif"
      subscribeAction={savePushSubscriptionAction}
      unsubscribeAction={removePushSubscriptionAction}
    />
  );
}
