import { z } from "zod";
import { KATEGORI_CURHAT, MOOD_OPTIONS } from "@/types/ticket";

/**
 * Validasi input form curhat siswa. Dijalankan di SERVER (dalam Server Action),
 * jadi tidak bisa dilewati walau validasi di sisi client (TAHAP 3 nanti) dimatikan.
 */
export const createCurhatSchema = z.object({
  kategori: z.enum(KATEGORI_CURHAT, {
    errorMap: () => ({ message: "Pilih kategori masalah terlebih dahulu." }),
  }),
  mood: z.enum(MOOD_OPTIONS, {
    errorMap: () => ({ message: "Pilih mood kamu terlebih dahulu." }),
  }),
  judul: z
    .string()
    .trim()
    .min(3, "Judul minimal 3 karakter.")
    .max(100, "Judul maksimal 100 karakter."),
  namaSamaran: z
    .string()
    .trim()
    .min(2, "Nama samaran minimal 2 karakter.")
    .max(30, "Nama samaran maksimal 30 karakter."),
  isiCurhatan: z
    .string()
    .trim()
    .min(10, "Ceritakan lebih detail ya (minimal 10 karakter).")
    .max(3000, "Isi curhatan maksimal 3000 karakter."),
  // bcrypt cuma memproses 72 byte pertama — dibatasi di sini juga biar konsisten.
  password: z
    .string()
    .min(8, "Password minimal 8 karakter — jangan pakai tanggal lahir.")
    .max(72, "Password maksimal 72 karakter."),
  siapBertemuGuruBk: z.boolean().optional().default(false),
});

export type CreateCurhatInput = z.infer<typeof createCurhatSchema>;
