"use server";

import { verifyAndCreateSiswaSession } from "@/lib/session/siswa-session";

export async function verifyCurhatAccessAction(
  kode: string,
  password: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!kode?.trim() || !password) {
    return { success: false, error: "Kode dan password wajib diisi." };
  }
  return verifyAndCreateSiswaSession(kode, password);
}
