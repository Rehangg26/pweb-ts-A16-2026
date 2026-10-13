import type { JenisAntrian, Prioritas, Tiket } from "./bersama/tipe.js";
import { ambilJenisAktif, buatTiket } from "./bersama/layananTiket.js";
import {  wajibLogin} from "./bersama/sesi.js";

const INTERVAL_POLLING_MS = 3000;

const LABEL_PRIORITAS: Record<Prioritas, string> = {
  normal: "Normal",
  lansia: "Lansia",
  disabilitas: "Disabilitas",
  vip: "VIP",
};

const PRIORITAS_KHUSUS: Prioritas[] = ["lansia", "disabilitas", "vip"];

let daftarSaatIni: JenisAntrian[] = [];
let sidikJariDaftar: string | null = null;


function ambilElemen<T extends HTMLElement>(id: string): T {
  const elemen = document.getElementById(id);
  if (!elemen) {
    throw new Error(`Elemen dengan id "${id}" tidak ditemukan di ambil-antrian.html`);
  }
  return elemen as T;
}

export function apakahPrioritasValid(nilai: unknown): nilai is Prioritas {
  return typeof nilai === "string" && Object.hasOwn(LABEL_PRIORITAS, nilai);
}


export function buatSidikJari(daftar: JenisAntrian[]): string {
  return JSON.stringify(daftar.map((jenis) => [jenis.id, jenis.kode, jenis.nama]));
}

function buatTombol(kelas: string, teks: string, idJenis: string, prioritas: Prioritas): HTMLButtonElement {
  const tombol = document.createElement("button");
  tombol.type = "button";
  tombol.className = kelas;
  tombol.textContent = teks;
  tombol.dataset["idJenis"] = idJenis;
  tombol.dataset["prioritas"] = prioritas;
  return tombol;
}

function buatKartuJenis(jenis: JenisAntrian): HTMLElement {
  const kartu = document.createElement("article");
  kartu.className = "kartu-antrian";

  const kepala = document.createElement("div");
  kepala.className = "kepala-kartu";
  const nama = document.createElement("h2");
  nama.className = "nama-jenis";
  nama.textContent = jenis.nama;
  const kode = document.createElement("span");
  kode.className = "kode-jenis";
  kode.textContent = jenis.kode;
  kepala.append(nama, kode);

  const tombolUtama = buatTombol("tombol-utama", "Ambil Nomor", jenis.id, "normal");
  tombolUtama.setAttribute("aria-label", `Ambil nomor ${jenis.nama}`);

  const label = document.createElement("p");
  label.className = "label-prioritas";
  label.textContent = "Ambil dengan prioritas:";

  const barisPrioritas = document.createElement("div");
  barisPrioritas.className = "baris-prioritas";
  for (const prioritas of PRIORITAS_KHUSUS) {
    const tombol = buatTombol("tombol-prioritas", LABEL_PRIORITAS[prioritas], jenis.id, prioritas);
    tombol.setAttribute("aria-label", `Ambil nomor ${jenis.nama} dengan prioritas ${LABEL_PRIORITAS[prioritas]}`);
    barisPrioritas.append(tombol);
  }

  kartu.append(kepala, tombolUtama, label, barisPrioritas);
  return kartu;
}


export function tampilkanKartuJenis(): void {
  const daftar = ambilJenisAktif();
  const sidikJari = buatSidikJari(daftar);
  if (sidikJari === sidikJariDaftar) return; 

  sidikJariDaftar = sidikJari;
  daftarSaatIni = daftar;

  ambilElemen("daftar-jenis").replaceChildren(...daftar.map(buatKartuJenis));
  ambilElemen("keadaan-kosong").hidden = daftar.length > 0;
}


function tampilkanPesan(pesan: string): void {
  const kotak = ambilElemen<HTMLParagraphElement>("pesan-ambil");
  kotak.textContent = pesan;
  kotak.hidden = false;
}

function sembunyikanPesan(): void {
  const kotak = ambilElemen<HTMLParagraphElement>("pesan-ambil");
  kotak.textContent = "";
  kotak.hidden = true;
}

function tampilkanDialogTiket(tiket: Tiket, namaJenis: string): void {
  ambilElemen("nomor-tiket-hasil").textContent = tiket.nomorTiket;
  ambilElemen("rincian-tiket-hasil").textContent =
    tiket.prioritas === "normal"
      ? namaJenis
      : `${namaJenis}, prioritas ${LABEL_PRIORITAS[tiket.prioritas]}`;

  const dialog = ambilElemen<HTMLDialogElement>("dialog-tiket");
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", ""); 
  }
  ambilElemen("tombol-tutup-dialog").focus();
}

export function tanganiAmbilNomor(idJenis: string, prioritas: Prioritas): void {
  try {
    const tiket = buatTiket(idJenis, prioritas);
    const namaJenis = daftarSaatIni.find((jenis) => jenis.id === idJenis)?.nama ?? tiket.nomorTiket;
    sembunyikanPesan();
    tampilkanDialogTiket(tiket, namaJenis);
  } catch (galat) {

    tampilkanPesan(
      galat instanceof Error
        ? `${galat.message} Daftar layanan sudah diperbarui.`
        : "Nomor antrian gagal dibuat. Coba lagi."
    );
    tampilkanKartuJenis(); 
  }
}


export function mulaiPolling(): void {
  window.setInterval(tampilkanKartuJenis, INTERVAL_POLLING_MS);


  window.addEventListener("storage", tampilkanKartuJenis);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) tampilkanKartuJenis();
  });
}

function mulai(): void {
    wajibLogin();
    tampilkanKartuJenis();

  ambilElemen("daftar-jenis").addEventListener("click", (kejadian) => {
    const sasaran = kejadian.target;
    if (!(sasaran instanceof Element)) return;

    const tombol = sasaran.closest<HTMLButtonElement>("button[data-id-jenis]");
    if (!tombol) return;

    const idJenis = tombol.dataset["idJenis"];
    const prioritas = tombol.dataset["prioritas"];
    if (idJenis && apakahPrioritasValid(prioritas)) {
      tanganiAmbilNomor(idJenis, prioritas);
    }
  });

  ambilElemen<HTMLButtonElement>("tombol-tutup-dialog").addEventListener("click", () => {
    ambilElemen<HTMLDialogElement>("dialog-tiket").close();
  });

  mulaiPolling();
}


if (document.getElementById("daftar-jenis")) {
  mulai();
}
