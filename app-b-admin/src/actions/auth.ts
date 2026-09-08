"use server";

import { redirect } from "next/navigation";
import { createAdminSession, clearAdminSession } from "@/lib/session/admin-session";

/**
 * Dipanggil dari halaman login SETELAH sign-in Firebase Auth berhasil di
 * client — sama polanya dengan loginGuruAction di App A.
 */
export async function loginAdminAction(
  idToken: string
): Promise<{ success: true } | { success: false; error: string }> {
  return createAdminSession(idToken);
}

export async function logoutAdminAction(): Promise<void> {
  await clearAdminSession();
  redirect("/login");
}
