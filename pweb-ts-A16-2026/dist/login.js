import { ambilSesi, apakahPeranValid, halamanTujuanUntuk, pindahKe, simpanSesi, } from "./bersama/sesi.js";
const URL_API = "https://dummyjson.com";
export class GalatLogin extends Error {
    constructor(pesan) {
        super(pesan);
        this.name = "GalatLogin";
    }
}
export function tentukanPeran(data) {
    return apakahPeranValid(data.role) ? data.role : null;
}
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
export async function masuk(username, password) {
    let respons;
    try {
        respons = await fetch(`${URL_API}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });
    }
    catch {
        throw new GalatLogin("Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi.");
    }
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
    const peran = tentukanPeran(data) ?? (await ambilPeranDariProfil(token));
    if (!peran) {
        throw new GalatLogin("Peran akun ini tidak dikenali (harus admin, moderator, atau user).");
    }
    return { token, peran, namaDepan: data.firstName ?? username };
}
function ambilElemen(id) {
    const elemen = document.getElementById(id);
    if (!elemen) {
        throw new Error(`Elemen dengan id "${id}" tidak ditemukan di login.html`);
    }
    return elemen;
}
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
    kotak.textContent = pesan;
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
let sedangMemproses = false;
async function tanganiKirimForm(kejadian) {
    kejadian.preventDefault();
    if (sedangMemproses)
        return;
    const inputUsername = ambilElemen("input-username");
    const inputPassword = ambilElemen("input-password");
    const username = inputUsername.value.trim();
    const password = inputPassword.value;
    sembunyikanPesanError();
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
    }
    catch (galat) {
        sedangMemproses = false;
        aturStatusMemuat(false);
        const pesan = galat instanceof GalatLogin
            ? galat.message
            : "Terjadi kesalahan yang tidak terduga. Muat ulang halaman lalu coba lagi.";
        tampilkanPesanError(pesan);
        inputPassword.value = "";
        inputPassword.setAttribute("aria-invalid", "true");
        inputPassword.focus();
    }
}
function mulai() {
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
if (document.getElementById("form-masuk")) {
    mulai();
}
