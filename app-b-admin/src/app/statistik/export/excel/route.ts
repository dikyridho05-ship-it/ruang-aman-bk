import "server-only";
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getAuthenticatedAdmin } from "@/lib/session/admin-session";
import { getStatistikCurhatan } from "@/lib/firestore/statistik";
import { getSekolahSettings } from "@/lib/firestore/settings";
import {
  KATEGORI_CURHAT,
  KATEGORI_CURHAT_LABEL,
  MOOD_OPTIONS,
  MOOD_LABEL,
  STATUS_LABEL,
  type TicketStatus,
} from "@/types/statistik";

const STATUS_ORDER: readonly TicketStatus[] = ["baru", "dibaca", "dibalas", "selesai"];

function tanggalFileIni(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function bikinSheetTabel(
  workbook: ExcelJS.Workbook,
  nama: string,
  header: [string, string],
  baris: [string, number][]
) {
  const sheet = workbook.addWorksheet(nama);
  sheet.columns = [
    { header: header[0], key: "label", width: 28 },
    { header: header[1], key: "jumlah", width: 12 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const [label, jumlah] of baris) {
    sheet.addRow({ label, jumlah });
  }
  return sheet;
}

/**
 * Route Handler (bukan Server Action) supaya bisa langsung dipakai sebagai
 * `href` <a> biasa — browser menganggapnya download file karena header
 * Content-Disposition, tanpa perlu JavaScript client-side (blob/base64).
 * Sesi diverifikasi ulang di sini juga (bukan cuma di halaman /statistik)
 * karena route handler bisa diakses langsung lewat URL.
 */
export async function GET() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Sesi login habis, silakan login ulang." }, { status: 401 });
  }

  const [data, sekolah] = await Promise.all([getStatistikCurhatan(), getSekolahSettings()]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Ruang Aman BK";
  workbook.created = new Date();

  const ringkasan = workbook.addWorksheet("Ringkasan");
  ringkasan.columns = [
    { key: "label", width: 32 },
    { key: "nilai", width: 20 },
  ];
  ringkasan.addRow(["Laporan Statistik — Ruang Aman BK"]).font = { bold: true, size: 14 };
  ringkasan.addRow([sekolah.namaSekolah]);
  ringkasan.addRow([`Dibuat: ${new Date(data.dibuatPada).toLocaleString("id-ID")}`]);
  ringkasan.addRow([]);
  ringkasan.addRow(["Total Curhatan (sepanjang waktu)", data.totalKeseluruhan]);
  ringkasan.addRow(["Curhatan 30 Hari Terakhir", data.total30HariTerakhir]);
  ringkasan.addRow(["Prioritas Aktif (belum selesai)", data.prioritasAktif]);
  ringkasan.addRow([
    "Tingkat Selesai",
    data.totalKeseluruhan > 0
      ? `${Math.round((data.perStatus.selesai / data.totalKeseluruhan) * 100)}%`
      : "0%",
  ]);
  ringkasan.getRow(1).font = { bold: true, size: 14 };

  const sheetKategori = bikinSheetTabel(
    workbook,
    "Per Kategori",
    ["Kategori", "Jumlah"],
    KATEGORI_CURHAT.map((k) => [KATEGORI_CURHAT_LABEL[k], data.perKategori[k]])
  );
  // Tanpa catatan ini, pembaca laporan wajar mengira angkanya salah hitung
  // begitu menjumlahkan kolom dan hasilnya melebihi total curhatan.
  sheetKategori.addRow([]);
  sheetKategori.addRow([
    "Catatan: satu curhatan boleh memilih sampai 3 kategori, jadi jumlah angka di kolom ini bisa melebihi total curhatan.",
  ]).font = { italic: true, size: 9 };

  bikinSheetTabel(
    workbook,
    "Per Mood",
    ["Mood", "Jumlah"],
    MOOD_OPTIONS.map((m) => [MOOD_LABEL[m], data.perMood[m]])
  );

  bikinSheetTabel(
    workbook,
    "Status Tiket",
    ["Status", "Jumlah"],
    STATUS_ORDER.map((s) => [STATUS_LABEL[s], data.perStatus[s]])
  );

  bikinSheetTabel(
    workbook,
    "Tren Bulanan",
    ["Bulan", "Jumlah"],
    data.trenBulanan.map((t) => [t.label, t.jumlah])
  );

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="statistik-ruang-aman-bk-${tanggalFileIni()}.xlsx"`,
    },
  });
}
