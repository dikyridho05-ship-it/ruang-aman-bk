/**
 * Bingkai halaman masuk & daftar App B. Panel kiri (layar lebar) memuat
 * identitas sekolah dan satu janji yang memang ditepati kode ini: isi
 * curhatan siswa tidak pernah dibaca App B (semua query di sini memakai
 * `.select()` tanpa field isi). Kalimat itu penting untuk kepala sekolah
 * atau operator yang baru pertama membuka dasbor — mereka perlu tahu batas
 * kewenangannya sejak halaman pertama.
 */
export default function AuthBingkai({
  namaSekolah,
  logoBase64,
  children,
}: {
  namaSekolah: string;
  logoBase64: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative flex flex-col justify-between overflow-hidden bg-admin-900 px-6 py-6 text-admin-100 sm:px-10 lg:py-12">
        <div className="flex items-center gap-3">
          {logoBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL base64 dari Firestore, bukan berkas statis
            <img src={logoBase64} alt="" className="h-10 w-10 rounded-lg bg-white object-contain p-1" />
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{namaSekolah}</p>
            <p className="text-xs text-admin-300">Ruang Aman BK</p>
          </div>
        </div>

        <div className="hidden max-w-md lg:block">
          <p className="text-[32px] font-extrabold leading-[1.15] tracking-tight text-white">
            Dasbor pengelola layanan konseling sekolah.
          </p>
          <p className="mt-5 text-[15px] leading-relaxed text-admin-200">
            Di sini kamu mengatur akun Guru BK, jadwal piket, dan identitas sekolah, serta melihat
            statistik layanan. Isi curhatan siswa tidak pernah tampil di dasbor ini — hanya Guru BK
            yang bisa membacanya.
          </p>
        </div>

        <p className="hidden text-xs text-admin-400 lg:block">
          Hanya untuk pengelola sekolah. Siswa memakai halaman Ruang Aman yang terpisah.
        </p>

        {/* Garis lengkung samar — gema bentuk perisai di ikon aplikasi. */}
        <svg
          aria-hidden
          viewBox="0 0 400 400"
          className="pointer-events-none absolute -bottom-24 -right-24 hidden h-96 w-96 text-admin-700/60 lg:block"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
        >
          <path d="M200 30 340 80v110c0 84-58 152-140 180C118 342 60 274 60 190V80z" />
          <path d="M200 70 305 108v84c0 63-43 114-105 135-62-21-105-72-105-135v-84z" />
          <path d="M200 110 270 136v58c0 42-29 76-70 90-41-14-70-48-70-90v-58z" />
        </svg>
      </aside>

      <main className="flex items-start justify-center bg-kertas px-5 py-10 sm:items-center sm:px-10">
        <div className="w-full max-w-[400px]">{children}</div>
      </main>
    </div>
  );
}

export function KotakPesan({
  jenis,
  children,
}: {
  jenis: "galat" | "info";
  children: React.ReactNode;
}) {
  return (
    <div
      role={jenis === "galat" ? "alert" : "status"}
      aria-live={jenis === "galat" ? "assertive" : "polite"}
      className={`rounded-lg border-l-4 px-3.5 py-3 text-sm leading-relaxed ${
        jenis === "galat"
          ? "border-red-500 bg-red-50 text-red-800"
          : "border-langit-500 bg-langit-100 text-admin-900"
      }`}
    >
      {children}
    </div>
  );
}
