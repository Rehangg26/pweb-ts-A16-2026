import { buatTiket } from "./bersama/layananTiket.js";
import { bacaData } from "./bersama/penyimpanan.js";
import { ambilDaftarJenis } from "./adminJenisAntrian.js";
const namaStatus = {
    menunggu: "Menunggu",
    dipanggil: "Dipanggil",
    selesai: "Selesai",
    dilewati: "Dilewati",
};
const namaPrioritas = {
    normal: "Normal",
    lansia: "Lansia",
    disabilitas: "Disabilitas",
    vip: "VIP",
};
export function terbitkanTiketManual(idJenis, prioritas) {
    const jenis = ambilDaftarJenis().find((j) => j.id === idJenis);
    if (!jenis || !jenis.aktif)
        throw new Error("Jenis antrian tidak aktif atau tidak ditemukan.");
    return buatTiket(idJenis, prioritas);
}
export function isiPilihanJenis() {
    const pilihan = document.getElementById("pilih-jenis-manual");
    if (!pilihan)
        return;
    const terpilih = pilihan.value;
    pilihan.replaceChildren();
    const petunjuk = new Option("Pilih jenis antrian", "");
    petunjuk.disabled = true;
    pilihan.add(petunjuk);
    for (const jenis of ambilDaftarJenis().filter((j) => j.aktif)) {
        pilihan.add(new Option(`${jenis.kode} — ${jenis.nama}`, jenis.id));
    }
    pilihan.value = terpilih;
}
export function tampilkanDaftarTiket() {
    const wadah = document.getElementById("daftar-tiket");
    if (!wadah)
        return;
    wadah.replaceChildren();
    const semuaTiket = bacaData("daftar_tiket", []);
    let adaTiket = false;
    for (const jenis of ambilDaftarJenis()) {
        const tiketJenis = semuaTiket
            .filter((t) => t.idJenis === jenis.id)
            .sort((a, b) => b.urutan - a.urutan);
        if (tiketJenis.length === 0)
            continue;
        adaTiket = true;
        const kelompok = document.createElement("div");
        kelompok.className = "kelompok-tiket";
        const judul = document.createElement("h3");
        judul.className = "judul-kelompok";
        judul.textContent = jenis.nama;
        kelompok.append(judul);
        for (const tiket of tiketJenis) {
            const baris = document.createElement("div");
            baris.className = "baris-tiket";
            const nomor = document.createElement("span");
            nomor.className = "nomor-tiket";
            nomor.textContent = tiket.nomorTiket;
            const prioritas = document.createElement("span");
            prioritas.className = "lencana-garis";
            prioritas.textContent = namaPrioritas[tiket.prioritas];
            const status = document.createElement("span");
            status.className = `status-tiket status-${tiket.status}`;
            status.textContent = namaStatus[tiket.status];
            baris.append(nomor, prioritas, status);
            kelompok.append(baris);
        }
        wadah.append(kelompok);
    }
    if (!adaTiket) {
        const kosong = document.createElement("p");
        kosong.className = "kosong";
        kosong.textContent = "Belum ada tiket.";
        wadah.append(kosong);
    }
}
