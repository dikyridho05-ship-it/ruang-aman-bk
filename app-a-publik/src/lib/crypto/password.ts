import "server-only";
import bcrypt from "bcryptjs";

// 12 rounds — keseimbangan aman vs kecepatan untuk beban kerja server action.
const SALT_ROUNDS = 12;

/** Hash password siswa sebelum disimpan. Password asli TIDAK PERNAH disimpan. */
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/** Dipakai nanti di TAHAP 3/4 saat siswa cek balasan pakai Kode + Password. */
export async function verifyPassword(
  plainPassword: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hash);
}
