import { bacaData, simpanData } from "./bersama/penyimpanan.js";
import type { JenisAntrian, Tiket } from "./bersama/tipe.js";

const KUNCI_JENIS = "jenis_antrian";
const KUNCI_TIKET = "daftar_tiket";
const KUNCI_PENGHITUNG = "penghitung_tiket";

export interface Hasil {
  berhasil: boolean;
  pesan: string;
}

export function ambilDaftarJenis(): JenisAntrian[] {
  return bacaData<JenisAntrian[]>(KUNCI_JENIS, []);
}

export function apakahDuplikat(kode: string, nama: string): boolean {
  const kodeBaku = kode.trim().toUpperCase();
  const namaBaku = nama.trim().toLowerCase();
  return ambilDaftarJenis().some(
    (j) => j.kode.toUpperCase() === kodeBaku || j.nama.trim().toLowerCase() === namaBaku
  );
}

export function tambahJenisAntrian(kode: string, nama: string): Hasil {
  const kodeBaku = kode.trim().toUpperCase();
  const namaBaku = nama.trim();

  if (!/^[A-Z]$/.test(kodeBaku)) return { berhasil: false, pesan: "Kode harus 1 huruf (A-Z)." };
  if (!namaBaku) return { berhasil: false, pesan: "Nama tidak boleh kosong." };
  if (apakahDuplikat(kodeBaku, namaBaku)) return { berhasil: false, pesan: "Kode atau nama sudah dipakai." };

  const daftar = ambilDaftarJenis();
  daftar.push({ id: crypto.randomUUID(), kode: kodeBaku, nama: namaBaku, aktif: true });
  simpanData(KUNCI_JENIS, daftar);
  return { berhasil: true, pesan: `Jenis ${namaBaku} ditambahkan.` };
}

export function ubahStatusAktif(id: string): void {
  const daftar = ambilDaftarJenis().map((j) => (j.id === id ? { ...j, aktif: !j.aktif } : j));
  simpanData(KUNCI_JENIS, daftar);
}

export function hapusJenisAntrian(id: string): void {
  simpanData(KUNCI_JENIS, ambilDaftarJenis().filter((j) => j.id !== id));
}

export function resetAntrian(): void {
  simpanData(KUNCI_TIKET, []);
  simpanData(KUNCI_PENGHITUNG, {});
}

function buatTombol(teks: string, aksi: string, id: string, kelas: string): HTMLButtonElement {
  const tombol = document.createElement("button");
  tombol.type = "button";
  tombol.className = `tombol kecil ${kelas}`;
  tombol.textContent = teks;
  tombol.dataset.aksi = aksi;
  tombol.dataset.id = id;
  return tombol;
}

export function tampilkanDaftarJenis(): void {
  const wadah = document.getElementById("daftar-jenis");
  if (!wadah) return;
  wadah.replaceChildren();

  const daftar = ambilDaftarJenis();
  if (daftar.length === 0) {
    const kosong = document.createElement("p");
    kosong.className = "kosong";
    kosong.textContent = "Belum ada jenis antrian.";
    wadah.append(kosong);
    return;
  }

  const semuaTiket = bacaData<Tiket[]>(KUNCI_TIKET, []);

  for (const jenis of daftar) {
    const menunggu = semuaTiket.filter((t) => t.idJenis === jenis.id && t.status === "menunggu").length;

    const baris = document.createElement("div");
    baris.className = jenis.aktif ? "baris-jenis" : "baris-jenis nonaktif";

    const info = document.createElement("div");
    info.className = "info-jenis";

    const nama = document.createElement("div");
    nama.className = "nama-jenis";
    const kode = document.createElement("span");
    kode.className = "kode-jenis";
    kode.textContent = `(${jenis.kode})`;
    nama.append(jenis.nama, " ", kode);

    const sisa = document.createElement("div");
    sisa.className = "sisa-jenis";
    sisa.textContent = `${menunggu} menunggu`;

    info.append(nama, sisa);

    const aksi = document.createElement("div");
    aksi.className = "aksi-baris";
    aksi.append(
      buatTombol(jenis.aktif ? "Nonaktifkan" : "Aktifkan", "ubah", jenis.id, "garis"),
      buatTombol("Hapus", "hapus", jenis.id, "bahaya-garis")
    );

    baris.append(info, aksi);
    wadah.append(baris);
  }
}