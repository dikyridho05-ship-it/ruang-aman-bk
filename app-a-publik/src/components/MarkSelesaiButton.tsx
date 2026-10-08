"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MarkSelesaiButton({
  action,
}: {
  action: () => Promise<{ success: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const result = await action();
    setLoading(false);
    if (result.success) router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="shrink-0 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 disabled:opacity-60"
    >
      {loading ? "..." : "Tandai Selesai"}
    </button>
  );
}
