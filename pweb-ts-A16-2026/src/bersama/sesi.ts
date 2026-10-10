// ============================================================
// sesi.ts - milik Reyhan
// Mengelola data login di localStorage: simpan, baca, hapus,
// dan "penjaga halaman" (auth guard) untuk halaman yang butuh login.
// ============================================================

import type { Peran, Sesi } from "./tipe.js";

// Nama key localStorage (sesuai kontrak).
const KUNCI_TOKEN = "sesi_token";
const KUNCI_PERAN = "sesi_peran";
const KUNCI_NAMA_DEPAN = "sesi_namaDepan";

const DAFTAR_PERAN_VALID: readonly string[] = ["admin", "moderator", "user"];

/** Cek apakah sebuah nilai adalah peran yang dikenal sistem. */
export function apakahPeranValid(nilai: unknown): nilai is Peran {
  return typeof nilai === "string" && DAFTAR_PERAN_VALID.includes(nilai);
}

/**
 * Membaca sesi dari localStorage.
 * Mengembalikan null kalau belum login ATAU datanya tidak lengkap/rusak.
 */
export function ambilSesi(): Sesi | null {
  try {
    const token = localStorage.getItem(KUNCI_TOKEN);
    const peran = localStorage.getItem(KUNCI_PERAN);
    const namaDepan = localStorage.getItem(KUNCI_NAMA_DEPAN);

    if (!token || !namaDepan || !apakahPeranValid(peran)) {
      return null;
    }
    return { token, peran, namaDepan };
  } catch {
    // localStorage bisa error (mis. diblokir browser) -> anggap belum login.
    return null;
  }
}

/** Menyimpan sesi setelah login berhasil. */
export function simpanSesi(sesi: Sesi): void {
  localStorage.setItem(KUNCI_TOKEN, sesi.token);
  localStorage.setItem(KUNCI_PERAN, sesi.peran);
  localStorage.setItem(KUNCI_NAMA_DEPAN, sesi.namaDepan);
}

/** Menghapus sesi (hanya 3 key sesi; data antrian TIDAK ikut terhapus). */
export function hapusSesi(): void {
  localStorage.removeItem(KUNCI_TOKEN);
  localStorage.removeItem(KUNCI_PERAN);
  localStorage.removeItem(KUNCI_NAMA_DEPAN);
}

/** Pindah halaman tanpa menambah riwayat (supaya tombol Back tidak memantul). */
export function pindahKe(alamat: string): void {
  location.replace(alamat);
}

/**
 * Penjaga halaman: wajib sudah login.
 * - Sudah login -> mengembalikan Sesi.
 * - Belum login -> redirect paksa ke login.html dan mengembalikan null.
 *
 * Cara pakai di halaman lain:
 *   const sesi = wajibLogin();
 *   if (!sesi) return; // sudah diarahkan ke login, hentikan script
 */
export function wajibLogin(): Sesi | null {
  const sesi = ambilSesi();
  if (!sesi) {
    pindahKe("login.html");
    return null;
  }
  return sesi;
}

/**
 * Penjaga halaman: wajib login DAN peran harus termasuk yang diizinkan.
 * Contoh: wajibPeran(["admin", "moderator"]) untuk Dashboard Admin.
 */
export function wajibPeran(peranDiizinkan: Peran[]): Sesi | null {
  const sesi = wajibLogin();
  if (!sesi) return null;

  if (!peranDiizinkan.includes(sesi.peran)) {
    pindahKe("login.html");
    return null;
  }
  return sesi;
}

/** Logout: hapus sesi lalu kembali ke halaman login. */
export function keluar(): void {
  hapusSesi();
  pindahKe("login.html");
}

/** Menentukan halaman tujuan setelah login berdasarkan peran. */
export function halamanTujuanUntuk(peran: Peran): string {
  // admin & moderator -> Dashboard Admin; user biasa -> Panel Operator.
  return peran === "user" ? "operator.html" : "index.html";
}
