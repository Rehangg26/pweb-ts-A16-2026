import { bacaData, simpanData } from "./penyimpanan.js";
const KUNCI_JENIS = "jenis_antrian";
const KUNCI_TIKET = "daftar_tiket";
const KUNCI_PENGHITUNG = "penghitung_tiket";
const BOBOT_PRIORITAS = {
    vip: 4,
    disabilitas: 3,
    lansia: 2,
    normal: 1,
};
export function formatNomorTiket(kode, urutan) {
    return `${kode.toUpperCase()}-${String(urutan).padStart(3, "0")}`;
}
export function ambilSemuaJenis() {
    return bacaData(KUNCI_JENIS, []);
}
export function ambilJenisAktif() {
    return ambilSemuaJenis().filter((jenis) => jenis.aktif);
}
export function ambilSemuaTiket() {
    return bacaData(KUNCI_TIKET, []);
}
export function buatTiket(idJenis, prioritas) {
    const jenis = ambilSemuaJenis().find((j) => j.id === idJenis);
    if (!jenis)
        throw new Error("Jenis antrian tidak ditemukan.");
    if (!jenis.aktif)
        throw new Error(`Jenis antrian ${jenis.nama} sedang tidak aktif.`);
    const penghitung = bacaData(KUNCI_PENGHITUNG, {});
    const urutan = (penghitung[idJenis] ?? 0) + 1;
    penghitung[idJenis] = urutan;
    simpanData(KUNCI_PENGHITUNG, penghitung);
    const nomorTiket = formatNomorTiket(jenis.kode, urutan);
    const dibuatPada = Date.now();
    const tiketBaru = {
        id: `${nomorTiket}-${dibuatPada}`,
        idJenis,
        urutan,
        nomorTiket,
        prioritas,
        status: "menunggu",
        dibuatPada,
    };
    const daftar = ambilSemuaTiket();
    daftar.push(tiketBaru);
    simpanData(KUNCI_TIKET, daftar);
    return tiketBaru;
}
export function urutkanBerdasarkanPrioritas(daftarTiket) {
    return [...daftarTiket].sort((a, b) => {
        const bobotA = BOBOT_PRIORITAS[a.prioritas] ?? 0;
        const bobotB = BOBOT_PRIORITAS[b.prioritas] ?? 0;
        if (bobotA !== bobotB) {
            return bobotB - bobotA;
        }
        return a.urutan - b.urutan;
    });
}
export function ambilTiketDipanggil(idJenis) {
    const daftar = ambilSemuaTiket();
    return daftar.find((t) => t.idJenis === idJenis && t.status === "dipanggil") ?? null;
}
export function ambilTiketBerikutnya(idJenis) {
    const daftar = ambilSemuaTiket();
    console.log(daftar);
    const tiketMenunggu = daftar.filter((t) => t.idJenis === idJenis && t.status === "menunggu");
    if (tiketMenunggu.length === 0)
        return null;
    const terurut = urutkanBerdasarkanPrioritas(tiketMenunggu);
    return terurut[0] ?? null;
}
export function hitungSisaAntrean(idJenis) {
    const daftar = ambilSemuaTiket();
    return daftar.filter((t) => t.idJenis === idJenis && t.status === "menunggu").length;
}
export function ubahStatusTiket(idTiket, statusBaru) {
    const daftar = ambilSemuaTiket();
    const tiket = daftar.find((t) => t.id === idTiket);
    if (tiket) {
        tiket.status = statusBaru;
        if (statusBaru === "dipanggil") {
            tiket.dipanggilPada = Date.now();
        }
        simpanData(KUNCI_TIKET, daftar);
    }
}
