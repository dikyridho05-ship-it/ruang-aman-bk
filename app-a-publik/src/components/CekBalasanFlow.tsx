"use client";

import { useState } from "react";
import { verifyCurhatAccessAction } from "@/actions/cek-balasan";
import { getMessagesForSiswaAction, sendSiswaMessageAction } from "@/actions/chat";
import ChatThread from "@/components/ChatThread";
import SiswaPushSubscribeButton from "@/components/SiswaPushSubscribeButton";

export default function CekBalasanFlow() {
  const [verified, setVerified] = useState(false);
  const [kode, setKode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await verifyCurhatAccessAction(kode, password);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    setVerified(true);
  }

  if (verified) {
    return (
      <div className="mx-auto max-w-md px-4 py-8">
        <h1 className="mb-3 text-xl font-bold text-slate-900">Balasan Guru BK</h1>
        <div className="mb-3">
          <SiswaPushSubscribeButton />
        </div>
        <ChatThread
          initialMessages={[]}
          myRole="siswa"
          onSend={sendSiswaMessageAction}
          onPoll={getMessagesForSiswaAction}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <form
        onSubmit={handleVerify}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <h1 className="text-xl font-bold text-slate-900">Cek Balasan</h1>
          <p className="text-sm text-slate-500">
            Masukkan Kode Konseling &amp; password yang kamu buat waktu curhat.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="kode" className="block text-sm font-medium text-slate-700">
            Kode Konseling
          </label>
          <input
            id="kode"
            required
            value={kode}
            onChange={(e) => setKode(e.target.value)}
            placeholder="BK-2026-0187"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand-600 py-2.5 font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Memeriksa..." : "Buka Percakapan"}
        </button>
      </form>
    </div>
  );
}
