"use server";

import { redirect } from "next/navigation";
import { createGuruSession, clearGuruSession } from "@/lib/session/guru-session";

/**
 * Dipanggil dari halaman login Guru BK SETELAH sign-in Firebase Auth
 * berhasil di client (client cuma dipakai untuk proses login itu sendiri —
 * begitu dapat idToken, sisanya lewat sini, di server).
 */
export async function loginGuruAction(
  idToken: string
): Promise<{ success: true } | { success: false; error: string }> {
  return createGuruSession(idToken);
}

export async function logoutGuruAction(): Promise<void> {
  await clearGuruSession();
  redirect("/guru/login");
}
