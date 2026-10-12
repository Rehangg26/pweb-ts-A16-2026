import { bacaData, simpanData } from "./penyimpanan.js";
const jenisAwal = [
    { kode: "A", nama: "UMUM-1", aktif: true },
    { kode: "B", nama: "UMUM-2", aktif: true },
    { kode: "C", nama: "GIGI", aktif: true },
    { kode: "D", nama: "ANAK", aktif: true },
    { kode: "E", nama: "KANDUNGAN", aktif: true },
    { kode: "F", nama: "LAB", aktif: false },
];
const prioritasContoh = ["normal", "lansia", "normal", "vip", "disabilitas"];
export function isiDataContoh() {
    if (bacaData("jenis_antrian", []).length > 0)
        return;
    const daftarJenis = jenisAwal.map((j, i) => ({ id: `jenis-${i + 1}`, ...j }));
    const daftarTiket = [];
    const penghitung = {};
    for (const jenis of daftarJenis.slice(0, 3)) {
        prioritasContoh.forEach((prioritas, i) => {
            const urutan = i + 1;
            daftarTiket.push({
                id: `${jenis.id}-${urutan}`,
                idJenis: jenis.id,
                urutan,
                nomorTiket: `${jenis.kode}-${String(urutan).padStart(3, "0")}`,
                prioritas,
                status: "menunggu",
                dibuatPada: Date.now(),
            });
        });
        penghitung[jenis.id] = prioritasContoh.length;
    }
    simpanData("jenis_antrian", daftarJenis);
    simpanData("daftar_tiket", daftarTiket);
    simpanData("penghitung_tiket", penghitung);
}
