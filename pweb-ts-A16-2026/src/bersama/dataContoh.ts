import { bacaData, simpanData } from "./penyimpanan.js";
import type { JenisAntrian, Prioritas, Tiket } from "./tipe.js";

const jenisAwal: Omit<JenisAntrian, "id">[] = [
  { kode: "A", nama: "UMUM-1", aktif: true },
  { kode: "B", nama: "UMUM-2", aktif: true },
  { kode: "C", nama: "GIGI", aktif: true },
  { kode: "D", nama: "ANAK", aktif: true },
  { kode: "E", nama: "KANDUNGAN", aktif: true },
  { kode: "F", nama: "LAB", aktif: false },
];

const prioritasContoh: Prioritas[] = ["normal", "lansia", "normal", "vip", "disabilitas"];

export function isiDataContoh(): void {
  if (bacaData<JenisAntrian[]>("jenis_antrian", []).length > 0) return;

  const daftarJenis: JenisAntrian[] = jenisAwal.map((j, i) => ({ id: `jenis-${i + 1}`, ...j }));
  const daftarTiket: Tiket[] = [];
  const penghitung: Record<string, number> = {};

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