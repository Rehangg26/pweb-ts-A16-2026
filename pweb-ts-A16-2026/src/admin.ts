import { keluar, wajibPeran } from "./bersama/sesi.js";
import { isiDataContoh } from "./bersama/dataContoh.js";
import {
  hapusJenisAntrian,
  resetAntrian,
  tambahJenisAntrian,
  tampilkanDaftarJenis,
  ubahStatusAktif,
} from "./adminJenisAntrian.js";
import { isiPilihanJenis, terbitkanTiketManual, tampilkanDaftarTiket } from "./adminTiketManual.js";
import type { Prioritas, Sesi } from "./bersama/tipe.js";

function ambilElemen<T extends HTMLElement = HTMLElement>(id: string): T {
  const elemen = document.getElementById(id);
  if (!elemen) throw new Error(`Elemen #${id} tidak ditemukan`);
  return elemen as T;
}

function tampilkanPesan(id: string, teks: string, galat = false): void {
  const elemen = ambilElemen(id);
  elemen.textContent = teks;
  elemen.className = galat ? "pesan galat" : "pesan sukses";
}

function segarkan(): void {
  tampilkanDaftarJenis();
  isiPilihanJenis();
  tampilkanDaftarTiket();
}

function tampilkanNavbar(sesi: Sesi): void {
  ambilElemen("navbar-nama").textContent = sesi.namaDepan;
  ambilElemen("navbar-peran").textContent = sesi.peran;
  ambilElemen("tombol-keluar").addEventListener("click", () => keluar());
}

function pasangFormJenis(): void {
  ambilElemen<HTMLFormElement>("form-jenis").addEventListener("submit", (e) => {
    e.preventDefault();
    const inputKode = ambilElemen<HTMLInputElement>("input-kode");
    const inputNama = ambilElemen<HTMLInputElement>("input-nama");
    const hasil = tambahJenisAntrian(inputKode.value, inputNama.value);
    tampilkanPesan("pesan-jenis", hasil.pesan, !hasil.berhasil);
    if (hasil.berhasil) {
      inputKode.value = "";
      inputNama.value = "";
      inputKode.focus();
      segarkan();
    }
  });

  ambilElemen("daftar-jenis").addEventListener("click", (e) => {
    const tombol = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-aksi]");
    if (!tombol) return;
    const id = tombol.dataset.id ?? "";
    if (tombol.dataset.aksi === "ubah") ubahStatusAktif(id);
    if (tombol.dataset.aksi === "hapus") {
      if (!confirm("Hapus jenis antrian ini?")) return;
      hapusJenisAntrian(id);
    }
    segarkan();
  });
}

function pasangFormTiket(): void {
  ambilElemen<HTMLFormElement>("form-tiket-manual").addEventListener("submit", (e) => {
    e.preventDefault();
    const idJenis = ambilElemen<HTMLSelectElement>("pilih-jenis-manual").value;
    const prioritas = ambilElemen<HTMLSelectElement>("pilih-prioritas").value as Prioritas;
    try {
      const tiket = terbitkanTiketManual(idJenis, prioritas);
      tampilkanPesan("pesan-tiket", `Tiket terbit: ${tiket.nomorTiket}`);
      segarkan();
    } catch (galat) {
      const pesan = galat instanceof Error ? galat.message : "Gagal menerbitkan tiket.";
      tampilkanPesan("pesan-tiket", pesan, true);
    }
  });
}

function pasangAksiKepala(): void {
  ambilElemen("tombol-reset").addEventListener("click", () => {
    if (!confirm("Kosongkan semua tiket dan reset nomor urut?")) return;
    resetAntrian();
    segarkan();
    tampilkanPesan("pesan-aksi", "Antrian berhasil direset.");
  });

  ambilElemen("tombol-data-contoh").addEventListener("click", () => {
    isiDataContoh();
    segarkan();
    tampilkanPesan("pesan-aksi", "Data contoh diisi (hanya jika data masih kosong).");
  });
}

function mulai(): void {
  const sesi = wajibPeran(["admin", "moderator"]);
  if (!sesi) return;

  ambilElemen("halaman-admin").hidden = false;
  tampilkanNavbar(sesi);
  pasangFormJenis();
  pasangFormTiket();
  pasangAksiKepala();
  segarkan();
  window.addEventListener("storage", segarkan);
}

mulai();