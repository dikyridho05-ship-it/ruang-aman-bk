/**
 * Layanan hotline resmi pemerintah Indonesia untuk situasi darurat/krisis.
 * Ditampilkan lewat tombol darurat — tidak melewati alur curhat biasa,
 * karena ini butuh respons lebih cepat daripada menunggu Guru BK membalas.
 */
export const EMERGENCY_CONTACTS = [
  {
    nama: "Sejiwa — Layanan Sehat Jiwa",
    deskripsi: "Dukungan psikologis & pencegahan bunuh diri, 24 jam.",
    telepon: "119 ext 8",
    hrefTelepon: "tel:119",
  },
  {
    nama: "SAPA 129",
    deskripsi: "Pengaduan kekerasan terhadap perempuan & anak (Kemen PPPA).",
    telepon: "129",
    hrefTelepon: "tel:129",
    whatsapp: "08111129129",
    hrefWhatsapp: "https://wa.me/628111129129",
  },
] as const;
