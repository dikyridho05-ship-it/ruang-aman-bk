import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import type { TemplateBalasan } from "@/types/admin";

/** Baca semua template balasan cepat (TAHAP 9), urut judul — dipakai di halaman kelola (App B) dan dibaca ulang oleh App A saat Guru BK membalas. */
export async function getTemplateBalasan(): Promise<TemplateBalasan[]> {
  try {
    const snap = await adminDb.collection("templateBalasan").orderBy("judul", "asc").get();
    return snap.docs.map((d) => ({
      id: d.id,
      judul: (d.data().judul as string) ?? "",
      isi: (d.data().isi as string) ?? "",
    }));
  } catch (err) {
    console.error("[getTemplateBalasan] gagal baca template balasan:", err);
    return [];
  }
}
