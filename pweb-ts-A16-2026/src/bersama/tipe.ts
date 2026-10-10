// ============================================================
// KONTRAK BERSAMA - disepakati Reyhan, Rafi, Rido saat kickoff.
// Jangan diubah sepihak. Kalau perlu diubah, kabari di chat dulu.
// ============================================================

export type Peran = "admin" | "moderator" | "user";
export type Prioritas = "normal" | "lansia" | "disabilitas" | "vip";
export type StatusTiket = "menunggu" | "dipanggil" | "selesai" | "dilewati";

export interface JenisAntrian {
  id: string;
  kode: string; // 1 huruf kapital, mis. "A"
  nama: string; // mis. "UMUM-1"
  aktif: boolean;
}

export interface Tiket {
  id: string;
  idJenis: string; // merujuk ke JenisAntrian.id
  urutan: number; // 1, 2, 3, ...
  nomorTiket: string; // "A-001"
  prioritas: Prioritas;
  status: StatusTiket;
  dibuatPada: number;
  dipanggilPada?: number;
}

export interface Sesi {
  token: string;
  peran: Peran;
  namaDepan: string;
}
