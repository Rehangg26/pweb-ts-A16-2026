// ============================================================
// ambilAntrian.ts - milik Reyhan
// Halaman publik (tanpa login). Alur:
//   baca jenis aktif -> gambar kartu -> klik tombol -> buatTiket()
//   -> tampilkan nomor -> polling tiap 3 detik supaya jenis baru muncul.
// ============================================================
import { ambilJenisAktif, buatTiket } from "./bersama/layananTiket.js";
const INTERVAL_POLLING_MS = 3000;
const LABEL_PRIORITAS = {
    normal: "Normal",
    lansia: "Lansia",
    disabilitas: "Disabilitas",
    vip: "VIP",
};
// Tombol prioritas khusus yang ditampilkan di tiap kartu
// (prioritas "normal" sudah diwakili tombol utama "Ambil Nomor").
const PRIORITAS_KHUSUS = ["lansia", "disabilitas", "vip"];
// Daftar yang sedang tampil + "sidik jari"-nya, untuk mendeteksi perubahan.
let daftarSaatIni = [];
let sidikJariDaftar = null;
// ============================================================
// BAGIAN 1 - Fungsi pembantu
// ============================================================
function ambilElemen(id) {
    const elemen = document.getElementById(id);
    if (!elemen) {
        throw new Error(`Elemen dengan id "${id}" tidak ditemukan di ambil-antrian.html`);
    }
    return elemen;
}
export function apakahPrioritasValid(nilai) {
    // hasOwn (bukan "in") supaya kata seperti "constructor" tidak lolos.
    return typeof nilai === "string" && Object.hasOwn(LABEL_PRIORITAS, nilai);
}
/**
 * Membuat "sidik jari" daftar: hanya field yang tampil di layar.
 * Kalau sidik jari sama dengan sebelumnya, tidak perlu menggambar ulang.
 */
export function buatSidikJari(daftar) {
    return JSON.stringify(daftar.map((jenis) => [jenis.id, jenis.kode, jenis.nama]));
}
// ============================================================
// BAGIAN 2 - Menggambar kartu
// ============================================================
/** Membuat satu elemen tombol dengan data yang dibutuhkan saat diklik. */
function buatTombol(kelas, teks, idJenis, prioritas) {
    const tombol = document.createElement("button");
    tombol.type = "button";
    tombol.className = kelas;
    tombol.textContent = teks;
    tombol.dataset["idJenis"] = idJenis;
    tombol.dataset["prioritas"] = prioritas;
    return tombol;
}
/**
 * Membuat kartu untuk satu jenis antrian.
 * Memakai createElement + textContent (BUKAN innerHTML) karena nama jenis
 * diketik admin; dengan cara ini teks aneh seperti "<script>" tidak dieksekusi.
 */
function buatKartuJenis(jenis) {
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
/** Membaca jenis aktif lalu menggambar kartu; dilewati kalau tidak ada perubahan. */
export function tampilkanKartuJenis() {
    const daftar = ambilJenisAktif();
    const sidikJari = buatSidikJari(daftar);
    if (sidikJari === sidikJariDaftar)
        return; // tidak ada yang berubah
    sidikJariDaftar = sidikJari;
    daftarSaatIni = daftar;
    ambilElemen("daftar-jenis").replaceChildren(...daftar.map(buatKartuJenis));
    ambilElemen("keadaan-kosong").hidden = daftar.length > 0;
}
// ============================================================
// BAGIAN 3 - Mengambil nomor & menampilkan hasil
// ============================================================
function tampilkanPesan(pesan) {
    const kotak = ambilElemen("pesan-ambil");
    kotak.textContent = pesan;
    kotak.hidden = false;
}
function sembunyikanPesan() {
    const kotak = ambilElemen("pesan-ambil");
    kotak.textContent = "";
    kotak.hidden = true;
}
function tampilkanDialogTiket(tiket, namaJenis) {
    ambilElemen("nomor-tiket-hasil").textContent = tiket.nomorTiket;
    ambilElemen("rincian-tiket-hasil").textContent =
        tiket.prioritas === "normal"
            ? namaJenis
            : `${namaJenis}, prioritas ${LABEL_PRIORITAS[tiket.prioritas]}`;
    const dialog = ambilElemen("dialog-tiket");
    if (typeof dialog.showModal === "function") {
        dialog.showModal();
    }
    else {
        dialog.setAttribute("open", ""); // cadangan untuk browser lama
    }
    ambilElemen("tombol-tutup-dialog").focus();
}
export function tanganiAmbilNomor(idJenis, prioritas) {
    try {
        const tiket = buatTiket(idJenis, prioritas);
        const namaJenis = daftarSaatIni.find((jenis) => jenis.id === idJenis)?.nama ?? tiket.nomorTiket;
        sembunyikanPesan();
        tampilkanDialogTiket(tiket, namaJenis);
    }
    catch (galat) {
        // Contoh: admin menonaktifkan jenis ini tepat sebelum tombol diklik.
        tampilkanPesan(galat instanceof Error
            ? `${galat.message} Daftar layanan sudah diperbarui.`
            : "Nomor antrian gagal dibuat. Coba lagi.");
        tampilkanKartuJenis(); // segarkan daftar supaya sesuai kondisi terbaru
    }
}
// ============================================================
// BAGIAN 4 - Pembaruan otomatis (polling) & perekat event
// ============================================================
export function mulaiPolling() {
    window.setInterval(tampilkanKartuJenis, INTERVAL_POLLING_MS);
    // Tab lain (mis. Dashboard Admin) mengubah localStorage -> browser memberi tahu di sini.
    window.addEventListener("storage", tampilkanKartuJenis);
    // Kembali ke tab ini setelah lama di tab lain -> segarkan langsung.
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden)
            tampilkanKartuJenis();
    });
}
function mulai() {
    tampilkanKartuJenis();
    // Satu pendengar klik untuk SEMUA tombol (event delegation), jadi tetap
    // bekerja walaupun kartu digambar ulang oleh polling.
    ambilElemen("daftar-jenis").addEventListener("click", (kejadian) => {
        const sasaran = kejadian.target;
        if (!(sasaran instanceof Element))
            return;
        const tombol = sasaran.closest("button[data-id-jenis]");
        if (!tombol)
            return;
        const idJenis = tombol.dataset["idJenis"];
        const prioritas = tombol.dataset["prioritas"];
        if (idJenis && apakahPrioritasValid(prioritas)) {
            tanganiAmbilNomor(idJenis, prioritas);
        }
    });
    ambilElemen("tombol-tutup-dialog").addEventListener("click", () => {
        ambilElemen("dialog-tiket").close();
    });
    mulaiPolling();
}
// Hanya berjalan di halaman yang memang punya daftar jenis antrian.
if (document.getElementById("daftar-jenis")) {
    mulai();
}
