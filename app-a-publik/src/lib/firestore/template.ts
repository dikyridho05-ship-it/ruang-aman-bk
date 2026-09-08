import "server-only";
import { adminDb } from "@/lib/firebase/admin";

export interface TemplateBalasan {
  id: string;
  judul: string;
  isi: string;
}

/**
 * Baca daftar template balasan cepat (TAHAP 9) dari collection
 * `templateBalasan` — dikelola Super Admin lewat App B (lihat
 * app-b-admin/src/actions/template.ts untuk penulisannya). READ-ONLY di
 * sini, ditampilkan sebagai pilihan cepat di ChatThread saat Guru BK
 * membalas curhatan, supaya waktu respons lebih cepat untuk
 * pertanyaan/situasi yang umum terjadi.
 */
export async function getTemplateBalasan(): Promise<TemplateBalasan[]> {
  try {
    const snap = await adminDb.collection("templateBalasan").orderBy("judul", "asc").get();
    return snap.docs.map((d) => ({
      id: d.id,
      judul: (d.data().judul as string) ?? "",
      isi: (d.data().isi as string) ?? "",
    }));
  } catch (err) {
    console.error("[getTemplateBalasan] gagal baca template balasan, pakai kosong:", err);
    return [];
  }
}
