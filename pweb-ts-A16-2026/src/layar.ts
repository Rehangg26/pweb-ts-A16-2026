
import {
  ambilJenisAktif,
  ambilTiketDipanggil,
  hitungSisaAntrean,
} from "./bersama/layananTiket.js";


export function perbaruiLayar(): void {
  const kontainerKartu = document.getElementById("kontainer-kartu-layar");
  const elemenWaktu = document.getElementById("waktu-diperbarui");
  if (!kontainerKartu) return;

  const jenisAktif = ambilJenisAktif();

  kontainerKartu.innerHTML = "";

  jenisAktif.forEach((jenis) => {
    const tiketDipanggil = ambilTiketDipanggil(jenis.id);
    const sisaAntrean = hitungSisaAntrean(jenis.id);

    const kartu = document.createElement("div");
    kartu.className = "kartu-layar";
    kartu.innerHTML = `
      <div class="header-jenis-layar">
        <span class="nama-jenis-layar">${jenis.nama}</span>
        <span class="kode-jenis-layar">${jenis.kode}</span>
      </div>

      <div>
        ${
          tiketDipanggil
            ? `
              <div class="badge-dipanggil">● DIPANGGIL</div>
              <div class="nomor-panggil-besar">${tiketDipanggil.nomorTiket}</div>
            `
            : `
              <div class="nomor-kosong-layar">Belum ada nomor dipanggil</div>
            `
        }
      </div>

      <div class="footer-layar">
        ${sisaAntrean} tiket menunggu
      </div>
    `;

    kontainerKartu.appendChild(kartu);
  });

  if (elemenWaktu) {
    const sekarang = new Date();
    elemenWaktu.textContent = `Diperbarui: ${sekarang.toLocaleTimeString("id-ID")}`;
  }
}

export function mulaiPolling(): void {
  perbaruiLayar();
  setInterval(() => {
    perbaruiLayar();
  }, 2000);
}


export function aturLayarPenuh(): void {
  const tombol = document.getElementById("tombol-layar-penuh");
  if (!tombol) return;

  tombol.addEventListener("click", () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Gagal masuk mode layar penuh: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  });


  document.addEventListener("fullscreenchange", () => {
    if (document.fullscreenElement) {
      tombol.textContent = "Keluar Layar Penuh";
    } else {
      tombol.textContent = "Layar Penuh";
    }
  });
}


document.addEventListener("DOMContentLoaded", () => {
  mulaiPolling();
  aturLayarPenuh();
});