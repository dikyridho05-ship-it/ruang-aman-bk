"use client";

import PushToggleButton from "@/components/PushToggleButton";
import { saveSiswaPushSubscriptionAction, removeSiswaPushSubscriptionAction } from "@/actions/push";

/** Notifikasi balasan Guru BK untuk siswa (TAHAP 8) — halaman /cek-balasan, scoped per tiket. */
export default function SiswaPushSubscribeButton() {
  return (
    <PushToggleButton
      enableLabel="Kabari saya kalau dibalas"
      activeLabel="Kamu akan dikabari saat dibalas"
      subscribeAction={saveSiswaPushSubscriptionAction}
      unsubscribeAction={removeSiswaPushSubscriptionAction}
    />
  );
}
