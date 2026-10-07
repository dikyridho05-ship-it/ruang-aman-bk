/**
 * Ikon garis 24×24 untuk App B — menggantikan emoji di navigasi lama
 * (🏠 👩‍🏫 🗂️ …) yang tampil beda-beda di tiap HP/OS dan sulit diberi warna
 * aktif/non-aktif. Semua ikon pakai `currentColor`, jadi warnanya ikut kelas
 * teks pembungkusnya.
 */
export type NamaIkon =
  | "dasbor"
  | "guru"
  | "curhatan"
  | "piket"
  | "balasan"
  | "statistik"
  | "jejak"
  | "sekolah"
  | "admin"
  | "lainnya"
  | "keluar"
  | "janji"
  | "centang"
  | "silang"
  | "kunci";

const PATH: Record<NamaIkon, React.ReactNode> = {
  dasbor: (
    <>
      <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />
    </>
  ),
  guru: (
    <>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
      <path d="M15.5 5.2a3.2 3.2 0 0 1 0 5.9M17.5 14.8c1.6.6 2.7 2.2 3 4.7" />
    </>
  ),
  curhatan: (
    <>
      <path d="M4 13.5 6.2 6a1.5 1.5 0 0 1 1.4-1h8.8a1.5 1.5 0 0 1 1.4 1L20 13.5V18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <path d="M4 13.5h4.5l1.2 2h4.6l1.2-2H20" />
    </>
  ),
  piket: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="1.5" />
      <path d="M8 3.5v4M16 3.5v4M4 10h16" />
      <path d="m9 14.5 2 2 4-4" />
    </>
  ),
  balasan: (
    <>
      <path d="M20 12.5a7 7 0 0 1-10.3 6.2L5 20l1.3-4.2A7 7 0 1 1 20 12.5Z" />
      <path d="M9 11h6M9 14h4" />
    </>
  ),
  statistik: (
    <>
      <path d="M4 20h16" />
      <rect x="5.5" y="12" width="3" height="5.5" rx=".5" />
      <rect x="10.5" y="7.5" width="3" height="10" rx=".5" />
      <rect x="15.5" y="10" width="3" height="7.5" rx=".5" />
    </>
  ),
  jejak: (
    <>
      <path d="M7 4h8.5L19 7.5V19a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
      <path d="M9.5 10h6M9.5 13.5h6M9.5 17h3.5" />
    </>
  ),
  sekolah: (
    <>
      <path d="M3 9.5 12 5l9 4.5-9 4.5z" />
      <path d="M7 11.6V16c1.3 1.5 3 2.3 5 2.3s3.7-.8 5-2.3v-4.4M20 10v5" />
    </>
  ),
  admin: (
    <>
      <path d="M12 3.5 19 6v5.5c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6z" />
      <circle cx="12" cy="10.5" r="2.25" />
      <path d="M8.6 16c.7-1.6 1.9-2.4 3.4-2.4s2.7.8 3.4 2.4" />
    </>
  ),
  lainnya: (
    <>
      <circle cx="6" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="18" cy="12" r="1.4" />
    </>
  ),
  keluar: (
    <>
      <path d="M14 4.5H6.5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1H14" />
      <path d="M10.5 12H20M16.5 8.5 20 12l-3.5 3.5" />
    </>
  ),
  janji: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  centang: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  silang: <path d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5" />,
  kunci: (
    <>
      <rect x="5" y="10.5" width="14" height="9.5" rx="1.5" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </>
  ),
};

export default function Ikon({
  nama,
  className = "h-5 w-5",
}: {
  nama: NamaIkon;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      focusable="false"
    >
      {PATH[nama]}
    </svg>
  );
}

/** Logo "G" Google resmi (4 warna) — wajib tampil apa adanya di tombol masuk Google. */
export function LogoGoogle({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden focusable="false">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
