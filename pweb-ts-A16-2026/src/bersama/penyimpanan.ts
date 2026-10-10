// ============================================================
// SEMENTARA - ini versi minimal supaya kode Reyhan bisa dijalankan.
// Versi ASLI milik RAFI. Saat merge, pakai punya Rafi (jangan commit file ini).
// ============================================================

/** Membaca data JSON dari localStorage; kalau kosong/rusak, kembalikan nilaiAwal. */
export function bacaData<T>(kunci: string, nilaiAwal: T): T {
  try {
    const mentah = localStorage.getItem(kunci);
    return mentah === null ? nilaiAwal : (JSON.parse(mentah) as T);
  } catch {
    return nilaiAwal;
  }
}

/** Menyimpan nilai sebagai JSON ke localStorage. */
export function simpanData(kunci: string, nilai: unknown): void {
  localStorage.setItem(kunci, JSON.stringify(nilai));
}
