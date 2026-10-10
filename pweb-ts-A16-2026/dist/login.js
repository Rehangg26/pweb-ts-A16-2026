// ============================================================
// login.ts - milik Reyhan
// Alur: isi form -> validasi -> POST ke dummyjson -> tentukan peran
//       -> simpan sesi -> redirect sesuai peran.
// ============================================================
import { ambilSesi, apakahPeranValid, halamanTujuanUntuk, pindahKe, simpanSesi, } from "./bersama/sesi.js";
const URL_API = "https://dummyjson.com";
/**
 * Galat yang pesannya aman ditampilkan langsung ke pengguna.
 * Galat jenis lain (bug kita sendiri) tidak ditampilkan mentah-mentah.
 */
export class GalatLogin extends Error {
    constructor(pesan) {
        super(pesan);
        this.name = "GalatLogin";
    }
}
// ============================================================
// BAGIAN 1 - Logika (tidak menyentuh tampilan)
// ============================================================
/**
 * Menentukan peran dari objek yang punya field "role".
 * Mengembalikan null kalau role tidak ada / tidak dikenal.
 * Catatan: "moderator" tetap disimpan apa adanya; halaman admin
 * memperlakukannya sama dengan admin lewat wajibPeran(["admin","moderator"]).
 */
export function tentukanPeran(data) {
    return apakahPeranValid(data.role) ? data.role : null;
}
/** Mengambil role lewat GET /auth/me (dipakai kalau respons login tidak memuat role). */
async function ambilPeranDariProfil(token) {
    let respons;
    try {
        respons = await fetch(`${URL_API}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });
    }
    catch {
        throw new GalatLogin("Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi.");
    }
    if (!respons.ok) {
        throw new GalatLogin("Login berhasil, tetapi data akun gagal diambil. Coba masuk lagi.");
    }
    const profil = (await respons.json().catch(() => ({})));
    return tentukanPeran(profil);
}
/**
 * Proses login lengkap. Mengembalikan Sesi kalau berhasil,
 * melempar GalatLogin (dengan pesan ramah) kalau gagal.
 */
export async function masuk(username, password) {
    // 1) Kirim kredensial ke server.
    let respons;
    try {
        respons = await fetch(`${URL_API}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });
    }
    catch {
        // fetch hanya "melempar" kalau jaringan putus / server tidak terjangkau.
        throw new GalatLogin("Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi.");
    }
    // 2) Server menjawab, tapi bisa jadi menolak.
    if (respons.status === 400 || respons.status === 401) {
        throw new GalatLogin("Username atau password salah. Periksa lagi lalu coba masuk kembali.");
    }
    if (!respons.ok) {
        throw new GalatLogin(`Server sedang bermasalah (kode ${respons.status}). Coba lagi beberapa saat lagi.`);
    }
    const data = (await respons.json().catch(() => ({})));
    const token = data.accessToken ?? data.token;
    if (!token) {
        throw new GalatLogin("Respons server tidak berisi token. Coba lagi.");
    }
    // 3) Peran: pakai dari respons login kalau ada, kalau tidak tanya /auth/me.
    const peran = tentukanPeran(data) ?? (await ambilPeranDariProfil(token));
    if (!peran) {
        throw new GalatLogin("Peran akun ini tidak dikenali (harus admin, moderator, atau user).");
    }
    return { token, peran, namaDepan: data.firstName ?? username };
}
// ============================================================
// BAGIAN 2 - Tampilan
// ============================================================
function ambilElemen(id) {
    const elemen = document.getElementById(id);
    if (!elemen) {
        throw new Error(`Elemen dengan id "${id}" tidak ditemukan di login.html`);
    }
    return elemen;
}
/** Mengunci/membuka form selama proses login berlangsung. */
export function aturStatusMemuat(sedangMemuat) {
    const tombol = ambilElemen("tombol-masuk");
    const inputUsername = ambilElemen("input-username");
    const inputPassword = ambilElemen("input-password");
    tombol.disabled = sedangMemuat;
    tombol.textContent = sedangMemuat ? "Memproses..." : "Masuk";
    inputUsername.disabled = sedangMemuat;
    inputPassword.disabled = sedangMemuat;
    tombol.setAttribute("aria-busy", String(sedangMemuat));
}
export function tampilkanPesanError(pesan) {
    const kotak = ambilElemen("pesan-error");
    kotak.textContent = pesan; // textContent (bukan innerHTML) -> aman dari injeksi HTML
    kotak.hidden = false;
}
export function sembunyikanPesanError() {
    const kotak = ambilElemen("pesan-error");
    kotak.textContent = "";
    kotak.hidden = true;
    ambilElemen("input-username").removeAttribute("aria-invalid");
    ambilElemen("input-password").removeAttribute("aria-invalid");
}
export function arahkanBerdasarkanPeran(peran) {
    pindahKe(halamanTujuanUntuk(peran));
}
// ============================================================
// BAGIAN 3 - Perekat: event form
// ============================================================
let sedangMemproses = false; // mencegah klik ganda mengirim login dua kali
async function tanganiKirimForm(kejadian) {
    kejadian.preventDefault(); // cegah browser memuat ulang halaman
    if (sedangMemproses)
        return;
    const inputUsername = ambilElemen("input-username");
    const inputPassword = ambilElemen("input-password");
    const username = inputUsername.value.trim();
    const password = inputPassword.value;
    sembunyikanPesanError();
    // Validasi sederhana di sisi klien sebelum menghubungi server.
    if (!username || !password) {
        tampilkanPesanError("Isi username dan password terlebih dahulu.");
        (username ? inputPassword : inputUsername).focus();
        return;
    }
    sedangMemproses = true;
    aturStatusMemuat(true);
    try {
        const sesi = await masuk(username, password);
        simpanSesi(sesi);
        arahkanBerdasarkanPeran(sesi.peran);
        // Sengaja tidak mematikan status memuat: halaman akan segera berpindah.
    }
    catch (galat) {
        sedangMemproses = false;
        aturStatusMemuat(false);
        const pesan = galat instanceof GalatLogin
            ? galat.message
            : "Terjadi kesalahan yang tidak terduga. Muat ulang halaman lalu coba lagi.";
        tampilkanPesanError(pesan);
        // Kosongkan password & kembalikan fokus ke sana supaya bisa langsung mengetik ulang.
        inputPassword.value = "";
        inputPassword.setAttribute("aria-invalid", "true");
        inputPassword.focus();
    }
}
function mulai() {
    // Kalau sudah login, tidak perlu melihat form lagi.
    const sesi = ambilSesi();
    if (sesi) {
        arahkanBerdasarkanPeran(sesi.peran);
        return;
    }
    ambilElemen("form-masuk").addEventListener("submit", (k) => {
        void tanganiKirimForm(k);
    });
    ambilElemen("input-username").focus();
}
// Hanya berjalan di halaman yang memang punya form login
// (supaya file ini aman diimpor untuk pengujian).
if (document.getElementById("form-masuk")) {
    mulai();
}
