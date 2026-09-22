/**
 * Kolom tengah saat belum ada curhatan yang dibuka.
 *
 * Hanya terlihat mulai layar lg ke atas: di HP, /guru menampilkan daftar
 * curhatan satu layar penuh dan kolom tengah disembunyikan (lihat
 * GuruShell), jadi tidak ada layar kosong yang perlu diisi apa pun.
 */
export default function PilihCurhatanPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center">
      <span className="text-4xl" aria-hidden>
        💬
      </span>
      <p className="mt-3 text-sm font-bold text-slate-700">Belum ada curhatan yang dibuka</p>
      <p className="mt-1 max-w-xs text-xs text-slate-500">
        Pilih satu curhatan di daftar sebelah kiri untuk membaca dan membalasnya. Yang bertanda
        merah sudah dinaikkan ke urutan teratas.
      </p>
    </div>
  );
}
