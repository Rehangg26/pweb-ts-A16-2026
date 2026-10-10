// ============================================================
// SEMENTARA - versi minimal supaya halaman Ambil Antrian milik Reyhan bisa diuji.
// Versi ASLI milik RIDO. Saat merge, pakai punya Rido (jangan commit file ini).
//
// Kesepakatan yang dipakai Reyhan (Rido tolong samakan):
//  - buatTiket(idJenis, prioritas) MENGEMBALIKAN Tiket,
//    dan MELEMPAR Error (pesan Indonesia) kalau jenis tidak ada / nonaktif.
//  - ambilJenisAktif() mengembalikan hanya jenis yang aktif.
// ============================================================
import { bacaData, simpanData } from "./penyimpanan.js";
const KUNCI_JENIS = "jenis_antrian";
const KUNCI_TIKET = "daftar_tiket";
const KUNCI_PENGHITUNG = "penghitung_tiket";
/** Contoh: formatNomorTiket("A", 1) -> "A-001" */
export function formatNomorTiket(kode, urutan) {
    return `${kode}-${String(urutan).padStart(3, "0")}`;
}
export function ambilJenisAktif() {
    return bacaData(KUNCI_JENIS, []).filter((jenis) => jenis.aktif);
}
export function buatTiket(idJenis, prioritas) {
    const jenis = bacaData(KUNCI_JENIS, []).find((j) => j.id === idJenis);
    if (!jenis)
        throw new Error("Jenis antrian tidak ditemukan.");
    if (!jenis.aktif)
        throw new Error(`Jenis antrian ${jenis.nama} sedang tidak aktif.`);
    // Baca ulang tepat sebelum mengubah, lalu langsung simpan (aturan kerja no. 3).
    const penghitung = bacaData(KUNCI_PENGHITUNG, {});
    const urutan = (penghitung[idJenis] ?? 0) + 1;
    penghitung[idJenis] = urutan;
    simpanData(KUNCI_PENGHITUNG, penghitung);
    const nomorTiket = formatNomorTiket(jenis.kode, urutan);
    const dibuatPada = Date.now();
    const tiket = {
        id: `${nomorTiket}-${dibuatPada}`,
        idJenis,
        urutan,
        nomorTiket,
        prioritas,
        status: "menunggu",
        dibuatPada,
    };
    const daftar = bacaData(KUNCI_TIKET, []);
    daftar.push(tiket);
    simpanData(KUNCI_TIKET, daftar);
    return tiket;
}
