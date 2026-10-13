// src/operator.ts
import {
  ambilJenisAktif,
  ambilTiketBerikutnya,
  ambilTiketDipanggil,
  hitungSisaAntrean,
  ubahStatusTiket,
} from "./bersama/layananTiket.js";
import { wajibLogin, keluar, ambilSesi } from "./bersama/sesi.js";


export function panggilBerikutnya(idJenis: string): void {
  const tiketSaatIni = ambilTiketDipanggil(idJenis);
  if (tiketSaatIni) {
    ubahStatusTiket(tiketSaatIni.id, "selesai");
  }

  const tiketBerikutnya = ambilTiketBerikutnya(idJenis);
  if (tiketBerikutnya) {
    ubahStatusTiket(tiketBerikutnya.id, "dipanggil");
  }

  tampilkanPanelOperator();
}


export function selesaikanTiket(idJenis: string): void {
  const tiketSaatIni = ambilTiketDipanggil(idJenis);
  if (tiketSaatIni) {
    ubahStatusTiket(tiketSaatIni.id, "selesai");
  }

  tampilkanPanelOperator();
}

export function lewati(idJenis: string): void {
  const tiketSaatIni = ambilTiketDipanggil(idJenis);
  if (tiketSaatIni) {
    ubahStatusTiket(tiketSaatIni.id, "dilewati");
  } else {
    const tiketBerikutnya = ambilTiketBerikutnya(idJenis);
    if (tiketBerikutnya) {
      ubahStatusTiket(tiketBerikutnya.id, "dilewati");
    }
  }

  tampilkanPanelOperator();
}


export function tampilkanPanelOperator(): void {
  const kontainerPanel = document.getElementById("panel-operator");
  if (!kontainerPanel) return;

  const jenisAktif = ambilJenisAktif();

  kontainerPanel.innerHTML = "";

  jenisAktif.forEach((jenis) => {
    const tiketDipanggil = ambilTiketDipanggil(jenis.id);
    const tiketBerikutnya = ambilTiketBerikutnya(jenis.id);
    const jumlahMenunggu = hitungSisaAntrean(jenis.id);

    const kartu = document.createElement("div");
    kartu.className = "kartu-operator";
    kartu.innerHTML = `
      <div class="header-kartu">
        <span class="nama-jenis">${jenis.nama}</span>
        <span class="jumlah-menunggu">${jumlahMenunggu} menunggu</span>
      </div>

      <div class="area-nomor">
        <div>
          <div class="label-sub">Sedang Dipanggil</div>
          <div class="nomor-panggil">${tiketDipanggil ? tiketDipanggil.nomorTiket : "-"}</div>
        </div>
        <div>
          <div class="label-sub">Berikutnya</div>
          <div class="nomor-berikutnya">${tiketBerikutnya ? tiketBerikutnya.nomorTiket : "-"}</div>
          ${
            tiketBerikutnya
              ? `<div class="label-prioritas">Prioritas: ${tiketBerikutnya.prioritas}</div>`
              : ""
          }
        </div>
      </div>

      <div class="grup-tombol">
        <button class="tombol-aksi tombol-panggil" data-id="${jenis.id}" ${
          !tiketDipanggil && !tiketBerikutnya ? "disabled" : ""
        }>
          Panggil Berikutnya
        </button>
        <button class="tombol-aksi tombol-selesai" data-id="${jenis.id}" ${
          !tiketDipanggil ? "disabled" : ""
        }>
          Selesai
        </button>
        <button class="tombol-aksi tombol-lewati" data-id="${jenis.id}" ${
          !tiketDipanggil && !tiketBerikutnya ? "disabled" : ""
        }>
          Lewati
        </button>
      </div>

      ${
        !tiketDipanggil && !tiketBerikutnya
          ? `<p class="pesan-kosong">Tidak ada tiket menunggu untuk jenis antrian ini.</p>`
          : ""
      }
    `;

    kontainerPanel.appendChild(kartu);
  });

  // Event Handlers
  kontainerPanel.querySelectorAll(".tombol-panggil").forEach((tombol) => {
    tombol.addEventListener("click", (e) => {
      const id = (e.currentTarget as HTMLButtonElement).getAttribute("data-id");
      if (id) panggilBerikutnya(id);
    });
  });

  kontainerPanel.querySelectorAll(".tombol-selesai").forEach((tombol) => {
    tombol.addEventListener("click", (e) => {
      const id = (e.currentTarget as HTMLButtonElement).getAttribute("data-id");
      if (id) selesaikanTiket(id);
    });
  });

  kontainerPanel.querySelectorAll(".tombol-lewati").forEach((tombol) => {
    tombol.addEventListener("click", (e) => {
      const id = (e.currentTarget as HTMLButtonElement).getAttribute("data-id");
      if (id) lewati(id);
    });
  });
}

// Inisialisasi
document.addEventListener("DOMContentLoaded", () => {
  wajibLogin();

  const sesi = ambilSesi();
  const elemenNama = document.getElementById("nama-pengguna");
  if (elemenNama && sesi?.namaDepan) {
    elemenNama.textContent = `Operator: ${sesi.namaDepan}`;
  }

  const tombolKeluar = document.getElementById("tombol-keluar");
  if (tombolKeluar) {
    tombolKeluar.addEventListener("click", () => keluar());
  }

  tampilkanPanelOperator();
});