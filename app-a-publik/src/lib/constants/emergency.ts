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
    // Sebelumnya cuma "tel:119" — sampai di 119 tapi tidak pernah otomatis
    // masuk ke ekstensi 8 (Sejiwa), siswa harus tahu sendiri untuk menekan
    // "8" manual setelah tersambung. Koma di sini artinya jeda lalu kirim
    // nada DTMF "8" otomatis — didukung luas di dialer Android & iOS.
    hrefTelepon: "tel:119,8",
  },
  {
    nama: "SAPA 129",
    deskripsi: "Pengaduan kekerasan terhadap perempuan & anak (Kemen PPPA).",
    telepon: "129",
    hrefTelepon: "tel:129",
    whatsapp: "08111129129",
    hrefWhatsapp: "https://wa.me/628111129129",
  },
  {
    nama: "Guru BK — WhatsApp Resmi",
    deskripsi: "Jalur WhatsApp resmi Guru BK sekolah untuk situasi yang butuh perhatian segera.",
    // Sengaja TIDAK ada telepon/hrefTelepon: yang diberikan sekolah cuma
    // nomor WhatsApp, bukan nomor yang dipastikan bisa ditelepon langsung —
    // EmergencyButton.tsx merender tombol telepon hanya kalau field ini ada.
    whatsapp: "081292665202",
    hrefWhatsapp: "https://wa.me/6281292665202",
  },
] as const;
