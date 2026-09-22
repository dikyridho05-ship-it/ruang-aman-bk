import "server-only";
import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { getAuthenticatedAdmin } from "@/lib/session/admin-session";
import { getStatistikCurhatan } from "@/lib/firestore/statistik";
import { getSekolahSettings } from "@/lib/firestore/settings";
import { tanggalWaktu } from "@/lib/waktu";
import {
  KATEGORI_CURHAT,
  KATEGORI_CURHAT_LABEL,
  MOOD_OPTIONS,
  MOOD_LABEL,
  STATUS_LABEL,
  type TicketStatus,
} from "@/types/statistik";
import type { StatistikCurhatan } from "@/types/statistik";

const STATUS_ORDER: readonly TicketStatus[] = ["baru", "dibaca", "dibalas", "selesai"];

function tanggalFileIni(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function tulisBagian(doc: PDFKit.PDFDocument, judul: string, baris: [string, number][]) {
  doc.moveDown(1);
  doc.fontSize(13).font("Helvetica-Bold").text(judul);
  doc.moveDown(0.3);
  doc.fontSize(11).font("Helvetica");
  for (const [label, jumlah] of baris) {
    doc.text(`${label}`, { continued: true, width: 300 });
    doc.text(`${jumlah}`, { align: "right" });
  }
}

function generatePdfBuffer(namaSekolah: string, data: StatistikCurhatan): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 56, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).font("Helvetica-Bold").text("Laporan Statistik — Ruang Aman BK");
    doc.fontSize(11).font("Helvetica").fillColor("#555555").text(namaSekolah);
    doc
      .fontSize(9)
      .fillColor("#888888")
      .text(`Dibuat: ${tanggalWaktu(data.dibuatPada)} WIB`);
    doc.fillColor("#000000");
    doc
      .moveDown(0.5)
      .fontSize(9)
      .fillColor("#888888")
      .text(
        "Ringkasan anonim — tidak memuat judul, nama samaran, kode konseling, atau isi curhatan siswa mana pun.",
        { width: 480 }
      );
    doc.fillColor("#000000");

    const persenSelesai =
      data.totalKeseluruhan > 0
        ? Math.round((data.perStatus.selesai / data.totalKeseluruhan) * 100)
        : 0;

    tulisBagian(doc, "Ringkasan", [
      ["Total Curhatan (sepanjang waktu)", data.totalKeseluruhan],
      ["Curhatan 30 Hari Terakhir", data.total30HariTerakhir],
      ["Prioritas Aktif (belum selesai)", data.prioritasAktif],
    ]);
    doc.fontSize(11).text(`Tingkat Selesai: ${persenSelesai}%`);

    tulisBagian(
      doc,
      "Per Kategori",
      KATEGORI_CURHAT.map((k) => [KATEGORI_CURHAT_LABEL[k], data.perKategori[k]])
    );
    doc
      .fontSize(9)
      .fillColor("#666666")
      .text(
        "Satu curhatan boleh memilih sampai 3 kategori, jadi jumlah angka di atas bisa melebihi total curhatan."
      )
      .fillColor("#000000");

    tulisBagian(
      doc,
      "Per Mood",
      MOOD_OPTIONS.map((m) => [MOOD_LABEL[m], data.perMood[m]])
    );

    tulisBagian(
      doc,
      "Status Tiket",
      STATUS_ORDER.map((s) => [STATUS_LABEL[s], data.perStatus[s]])
    );

    tulisBagian(
      doc,
      "Tren 6 Bulan Terakhir",
      data.trenBulanan.map((t) => [t.label, t.jumlah])
    );

    doc.end();
  });
}

/** Sama seperti route Excel — lihat catatan di sana soal kenapa Route Handler, bukan Server Action. */
export async function GET() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Sesi login habis, silakan login ulang." }, { status: 401 });
  }

  const [data, sekolah] = await Promise.all([getStatistikCurhatan(), getSekolahSettings()]);
  const buffer = await generatePdfBuffer(sekolah.namaSekolah, data);
  // Buffer valid sebagai BodyInit di runtime (Response Web API menerima
  // Uint8Array apa pun) — cast ini murni menghindari bentrok tipe generik
  // ArrayBufferLike antara @types/node & lib DOM, bukan workaround perilaku.
  const body = buffer as unknown as BodyInit;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="statistik-ruang-aman-bk-${tanggalFileIni()}.pdf"`,
    },
  });
}
