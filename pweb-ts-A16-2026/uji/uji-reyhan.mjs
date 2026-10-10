import { JSDOM } from "jsdom";
import fs from "node:fs";

const akar = "/home/claude/pweb-ts-p01-2026";
let jumlahLulus = 0;
let jumlahGagal = 0;

function periksa(nama, kondisi, rincian = "") {
  if (kondisi) {
    jumlahLulus++;
    console.log(`  LULUS  ${nama}`);
  } else {
    jumlahGagal++;
    console.log(`  GAGAL  ${nama} ${rincian}`);
  }
}
const tunggu = (ms = 15) => new Promise((r) => setTimeout(r, ms));
function setGlobal(nama, nilai) {
  Object.defineProperty(globalThis, nama, { value: nilai, configurable: true, writable: true });
}

let urutanImpor = 0;
function siapkan(namaHtml, { fetchPalsu } = {}) {
  const html = fs.readFileSync(`${akar}/${namaHtml}`, "utf8").replace(/<script[^>]*><\/script>/g, "");
  const dom = new JSDOM(html, { url: `http://localhost/${namaHtml}` });
  const w = dom.window;
  const pindah = [];
  const interval = [];
  w.setInterval = (fn, ms) => {
    interval.push({ fn, ms });
    return interval.length;
  };
  // jsdom belum punya showModal/close -> sengaja TIDAK di-polyfill showModal untuk menguji jalur cadangan
  w.HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  setGlobal("window", w);
  setGlobal("document", w.document);
  setGlobal("localStorage", w.localStorage);
  setGlobal("Element", w.Element);
  setGlobal("location", { replace: (u) => pindah.push(u) });
  setGlobal("fetch", fetchPalsu ?? (async () => { throw new TypeError("fetch tidak diharapkan"); }));
  return { w, d: w.document, pindah, interval };
}
const muat = (berkas) => import(`file://${akar}/dist/${berkas}?n=${++urutanImpor}`);
const balasJson = (status, badan) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => badan,
});

// =====================================================================
console.log("\n[1] sesi.ts");
{
  const { w, pindah } = siapkan("login.html");
  const s = await muat("bersama/sesi.js");

  periksa("ambilSesi() null saat belum login", s.ambilSesi() === null);
  s.simpanSesi({ token: "abc", peran: "admin", namaDepan: "Emily" });
  const baca = s.ambilSesi();
  periksa("simpan lalu baca sesi", baca?.token === "abc" && baca.peran === "admin" && baca.namaDepan === "Emily");

  w.localStorage.setItem("sesi_peran", "hacker");
  periksa("peran tidak valid -> dianggap belum login", s.ambilSesi() === null);
  w.localStorage.setItem("sesi_peran", "admin");

  w.localStorage.setItem("jenis_antrian", "[]");
  s.hapusSesi();
  periksa("hapusSesi() menghapus sesi", s.ambilSesi() === null);
  periksa("hapusSesi() TIDAK menghapus data antrian", w.localStorage.getItem("jenis_antrian") === "[]");

  periksa("wajibLogin() tanpa sesi -> null + redirect ke login.html", s.wajibLogin() === null && pindah.at(-1) === "login.html");

  s.simpanSesi({ token: "t", peran: "user", namaDepan: "Budi" });
  pindah.length = 0;
  periksa("wajibPeran(admin,moderator) untuk role user -> ditolak", s.wajibPeran(["admin", "moderator"]) === null && pindah[0] === "login.html");

  s.simpanSesi({ token: "t", peran: "moderator", namaDepan: "Mod" });
  pindah.length = 0;
  periksa("wajibPeran(admin,moderator) untuk moderator -> diizinkan", s.wajibPeran(["admin", "moderator"])?.peran === "moderator" && pindah.length === 0);

  s.keluar();
  periksa("keluar() hapus sesi + redirect login.html", s.ambilSesi() === null && pindah.at(-1) === "login.html");

  periksa("halamanTujuanUntuk: admin/moderator -> index.html, user -> operator.html",
    s.halamanTujuanUntuk("admin") === "index.html" && s.halamanTujuanUntuk("moderator") === "index.html" && s.halamanTujuanUntuk("user") === "operator.html");
}

// =====================================================================
console.log("\n[2] login.ts");

async function skenarioLogin(nama, { username = "emilys", password = "emilyspass", fetchPalsu, sebelum, periksaHasil }) {
  console.log(` - ${nama}`);
  const ctx = siapkan("login.html", { fetchPalsu });
  sebelum?.(ctx);
  const mod = await muat("login.js");
  const { d, w } = ctx;
  d.getElementById("input-username").value = username;
  d.getElementById("input-password").value = password;
  d.getElementById("form-masuk").dispatchEvent(new w.Event("submit", { cancelable: true, bubbles: true }));
  await tunggu(30);
  await periksaHasil({ ...ctx, mod });
}

await skenarioLogin("field kosong -> pesan validasi, server tidak dihubungi", {
  username: "",
  password: "",
  fetchPalsu: async () => { throw new Error("tidak boleh dipanggil"); },
  periksaHasil: ({ d }) => {
    const pesan = d.getElementById("pesan-error");
    periksa("pesan validasi tampil", !pesan.hidden && pesan.textContent.includes("Isi username dan password"));
  },
});

{
  let panggilan = 0;
  await skenarioLogin("kredensial salah (HTTP 400)", {
    fetchPalsu: async () => { panggilan++; return balasJson(400, { message: "Invalid credentials" }); },
    periksaHasil: ({ d, w, pindah }) => {
      const pesan = d.getElementById("pesan-error");
      const tombol = d.getElementById("tombol-masuk");
      periksa("pesan 'username atau password salah' tampil", !pesan.hidden && pesan.textContent.includes("Username atau password salah"));
      periksa("tombol kembali aktif & bertuliskan 'Masuk'", !tombol.disabled && tombol.textContent === "Masuk");
      periksa("password dikosongkan", d.getElementById("input-password").value === "");
      periksa("tidak ada sesi tersimpan & tidak redirect", w.localStorage.getItem("sesi_token") === null && pindah.length === 0);
    },
  });
}

await skenarioLogin("jaringan putus (fetch melempar error / try...catch)", {
  fetchPalsu: async () => { throw new TypeError("Failed to fetch"); },
  periksaHasil: ({ d, pindah }) => {
    const pesan = d.getElementById("pesan-error");
    periksa("pesan koneksi tampil", !pesan.hidden && pesan.textContent.includes("Tidak dapat terhubung"));
    periksa("tidak redirect", pindah.length === 0);
  },
});

await skenarioLogin("server error (HTTP 500)", {
  fetchPalsu: async () => balasJson(500, {}),
  periksaHasil: ({ d }) => {
    periksa("pesan memuat kode 500", d.getElementById("pesan-error").textContent.includes("500"));
  },
});

{
  const daftarFetch = [];
  await skenarioLogin("sukses, role ADA di respons login (admin)", {
    fetchPalsu: async (url, opsi) => {
      daftarFetch.push({ url, opsi });
      return balasJson(200, { accessToken: "TOKEN1", firstName: "Emily", role: "admin" });
    },
    periksaHasil: ({ w, pindah }) => {
      periksa("hanya 1 request (tanpa /auth/me)", daftarFetch.length === 1);
      periksa("method POST ke /auth/login", daftarFetch[0].url === "https://dummyjson.com/auth/login" && daftarFetch[0].opsi.method === "POST");
      const badan = JSON.parse(daftarFetch[0].opsi.body);
      periksa("payload berisi username & password", badan.username === "emilys" && badan.password === "emilyspass");
      periksa("3 key sesi tersimpan di localStorage",
        w.localStorage.getItem("sesi_token") === "TOKEN1" && w.localStorage.getItem("sesi_peran") === "admin" && w.localStorage.getItem("sesi_namaDepan") === "Emily");
      periksa("redirect ke index.html", pindah.at(-1) === "index.html");
    },
  });
}

{
  const daftarFetch = [];
  await skenarioLogin("sukses, role TIDAK ada di respons -> tanya /auth/me (moderator)", {
    fetchPalsu: async (url, opsi) => {
      daftarFetch.push({ url, opsi });
      return url.endsWith("/auth/login")
        ? balasJson(200, { accessToken: "TOKEN2", firstName: "Mina" })
        : balasJson(200, { role: "moderator" });
    },
    periksaHasil: ({ w, pindah }) => {
      periksa("request ke-2 adalah GET /auth/me", daftarFetch.length === 2 && daftarFetch[1].url === "https://dummyjson.com/auth/me");
      periksa("header Authorization: Bearer <token>", daftarFetch[1].opsi.headers.Authorization === "Bearer TOKEN2");
      periksa("peran moderator tersimpan apa adanya", w.localStorage.getItem("sesi_peran") === "moderator");
      periksa("moderator -> redirect ke index.html (hak sama seperti admin)", pindah.at(-1) === "index.html");
    },
  });
}

await skenarioLogin("role user (dummyjson versi lama: field 'token')", {
  fetchPalsu: async (url) =>
    url.endsWith("/auth/login")
      ? balasJson(200, { token: "TOKEN3", firstName: "Budi" })
      : balasJson(200, { role: "user" }),
  periksaHasil: ({ w, pindah }) => {
    periksa("token dari field lama 'token' terbaca", w.localStorage.getItem("sesi_token") === "TOKEN3");
    periksa("role user -> redirect ke operator.html", pindah.at(-1) === "operator.html");
  },
});

await skenarioLogin("role tidak dikenal ('guest') ditolak", {
  fetchPalsu: async (url) =>
    url.endsWith("/auth/login") ? balasJson(200, { accessToken: "T", firstName: "X" }) : balasJson(200, { role: "guest" }),
  periksaHasil: ({ d, w, pindah }) => {
    periksa("pesan 'peran tidak dikenali'", d.getElementById("pesan-error").textContent.includes("tidak dikenali"));
    periksa("tidak ada sesi & tidak redirect", w.localStorage.getItem("sesi_token") === null && pindah.length === 0);
  },
});

await skenarioLogin("respons tanpa token ditolak", {
  fetchPalsu: async () => balasJson(200, { firstName: "X", role: "admin" }),
  periksaHasil: ({ d, w }) => {
    periksa("pesan token tidak ada, sesi tidak tersimpan", d.getElementById("pesan-error").textContent.includes("token") && w.localStorage.getItem("sesi_token") === null);
  },
});

{
  console.log(" - status memuat & klik ganda");
  let panggilan = 0;
  let selesaikan;
  const tertunda = new Promise((r) => (selesaikan = r));
  const ctx = siapkan("login.html", {
    fetchPalsu: async () => { panggilan++; await tertunda; return balasJson(200, { accessToken: "T", firstName: "E", role: "admin" }); },
  });
  await muat("login.js");
  const { d, w, pindah } = ctx;
  d.getElementById("input-username").value = "emilys";
  d.getElementById("input-password").value = "x";
  const kirim = () => d.getElementById("form-masuk").dispatchEvent(new w.Event("submit", { cancelable: true, bubbles: true }));
  kirim();
  await tunggu();
  const tombol = d.getElementById("tombol-masuk");
  periksa("saat menunggu: tombol nonaktif & bertuliskan 'Memproses...'", tombol.disabled && tombol.textContent === "Memproses...");
  periksa("saat menunggu: input username & password terkunci", d.getElementById("input-username").disabled && d.getElementById("input-password").disabled);
  kirim();
  kirim();
  await tunggu();
  periksa("klik ganda tidak mengirim request tambahan", panggilan === 1);
  selesaikan();
  await tunggu(30);
  periksa("selesai -> redirect", pindah.at(-1) === "index.html");
}

{
  console.log(" - sudah login lalu membuka login.html");
  const ctx = siapkan("login.html");
  ctx.w.localStorage.setItem("sesi_token", "T");
  ctx.w.localStorage.setItem("sesi_peran", "user");
  ctx.w.localStorage.setItem("sesi_namaDepan", "Budi");
  await muat("login.js");
  periksa("langsung diarahkan ke operator.html", ctx.pindah[0] === "operator.html");
}

// =====================================================================
console.log("\n[3] ambilAntrian.ts");

const jenisContoh = [
  { id: "j-a", kode: "A", nama: "UMUM-1", aktif: true },
  { id: "j-b", kode: "B", nama: "UMUM-2", aktif: true },
  { id: "j-x", kode: "X", nama: "NONAKTIF", aktif: false },
  { id: "j-s", kode: "S", nama: "<img src=x onerror=alert(1)>", aktif: true },
];

{
  const ctx = siapkan("ambil-antrian.html");
  const { w, d, interval } = ctx;
  w.localStorage.setItem("jenis_antrian", JSON.stringify(jenisContoh));
  const mod = await muat("ambilAntrian.js");

  const kartu = [...d.querySelectorAll(".kartu-antrian")];
  periksa("hanya jenis AKTIF yang tampil (3 dari 4)", kartu.length === 3);
  periksa("jenis nonaktif tidak tampil", !d.body.textContent.includes("NONAKTIF"));
  periksa("tiap kartu: 1 tombol utama + 3 tombol prioritas",
    kartu.every((k) => k.querySelectorAll(".tombol-utama").length === 1 && k.querySelectorAll(".tombol-prioritas").length === 3));
  periksa("nama berisi HTML tampil sebagai TEKS (tidak jadi elemen <img>)", d.querySelector(".kartu-antrian img") === null && d.body.textContent.includes("<img src=x"));
  periksa("keadaan kosong tersembunyi", d.getElementById("keadaan-kosong").hidden === true);
  periksa("polling terpasang dengan interval 3000 ms", interval.length === 1 && interval[0].ms === 3000);

  // ----- Ambil nomor -----
  const tombolUtamaA = () => d.querySelector('.kartu-antrian .tombol-utama[data-id-jenis="j-a"]');
  tombolUtamaA().click();
  const dialog = d.getElementById("dialog-tiket");
  periksa("klik 'Ambil Nomor' -> dialog terbuka (jalur cadangan tanpa showModal)", dialog.hasAttribute("open"));
  periksa("nomor tampil 'A-001'", d.getElementById("nomor-tiket-hasil").textContent === "A-001");
  periksa("rincian = nama jenis (prioritas normal)", d.getElementById("rincian-tiket-hasil").textContent === "UMUM-1");
  let tiketTersimpan = JSON.parse(w.localStorage.getItem("daftar_tiket"));
  periksa("tiket tersimpan di localStorage (status menunggu)", tiketTersimpan.length === 1 && tiketTersimpan[0].status === "menunggu" && tiketTersimpan[0].prioritas === "normal");

  d.getElementById("tombol-tutup-dialog").click();
  periksa("tombol Tutup menutup dialog", !dialog.hasAttribute("open"));

  tombolUtamaA().click();
  periksa("ambil lagi -> nomor naik jadi 'A-002'", d.getElementById("nomor-tiket-hasil").textContent === "A-002");
  d.getElementById("tombol-tutup-dialog").click();

  d.querySelector('.tombol-prioritas[data-id-jenis="j-b"][data-prioritas="vip"]').click();
  periksa("prioritas VIP di UMUM-2 -> 'B-001' (urutan terpisah per jenis)", d.getElementById("nomor-tiket-hasil").textContent === "B-001");
  periksa("rincian memuat 'prioritas VIP'", d.getElementById("rincian-tiket-hasil").textContent === "UMUM-2, prioritas VIP");
  tiketTersimpan = JSON.parse(w.localStorage.getItem("daftar_tiket"));
  periksa("tiket VIP tersimpan dengan prioritas 'vip'", tiketTersimpan.at(-1).prioritas === "vip" && tiketTersimpan.length === 3);
  periksa("penghitung per jenis benar (A=2, B=1)", JSON.stringify(JSON.parse(w.localStorage.getItem("penghitung_tiket"))) === JSON.stringify({ "j-a": 2, "j-b": 1 }));
  d.getElementById("tombol-tutup-dialog").click();

  // ----- Tombol dengan data dirusak -----
  const tombolRusak = d.querySelector('.tombol-prioritas[data-id-jenis="j-b"]');
  tombolRusak.dataset.prioritas = "constructor";
  tombolRusak.click();
  periksa("data prioritas dirusak -> diabaikan (tidak ada tiket baru)", JSON.parse(w.localStorage.getItem("daftar_tiket")).length === 3);

  // ----- Tidak render ulang kalau tidak ada perubahan -----
  const kartuSebelum = d.querySelector(".kartu-antrian");
  mod.tampilkanKartuJenis();
  periksa("tanpa perubahan data -> kartu TIDAK digambar ulang", d.querySelector(".kartu-antrian") === kartuSebelum);

  // ----- Pembaruan otomatis: jenis baru dari admin -----
  const semua = JSON.parse(w.localStorage.getItem("jenis_antrian"));
  semua.push({ id: "j-g", kode: "G", nama: "GIGI", aktif: true });
  w.localStorage.setItem("jenis_antrian", JSON.stringify(semua));
  interval[0].fn(); // simulasi satu "detak" polling
  periksa("polling: jenis baru 'GIGI' muncul tanpa reload", d.body.textContent.includes("GIGI") && d.querySelectorAll(".kartu-antrian").length === 4);

  // ----- Pembaruan lewat event 'storage' (tab lain) -----
  semua.push({ id: "j-f", kode: "F", nama: "FARMASI", aktif: true });
  w.localStorage.setItem("jenis_antrian", JSON.stringify(semua));
  w.dispatchEvent(new w.Event("storage"));
  periksa("event 'storage': jenis 'FARMASI' muncul seketika", d.body.textContent.includes("FARMASI") && d.querySelectorAll(".kartu-antrian").length === 5);

  // ----- Admin menonaktifkan jenis saat halaman masih terbuka -----
  const tombolLama = tombolUtamaA();
  const berubah = JSON.parse(w.localStorage.getItem("jenis_antrian"));
  berubah.find((j) => j.id === "j-a").aktif = false;
  w.localStorage.setItem("jenis_antrian", JSON.stringify(berubah)); // tanpa memicu polling
  const jumlahTiketSebelum = JSON.parse(w.localStorage.getItem("daftar_tiket")).length;
  tombolLama.click();
  const pesan = d.getElementById("pesan-ambil");
  periksa("jenis dinonaktifkan: tampil pesan galat yang jelas", !pesan.hidden && pesan.textContent.includes("tidak aktif"));
  periksa("tiket TIDAK dibuat untuk jenis nonaktif", JSON.parse(w.localStorage.getItem("daftar_tiket")).length === jumlahTiketSebelum);
  const teksKartu = [...d.querySelectorAll(".kartu-antrian")].map((k) => k.textContent).join("|");
  periksa("daftar langsung disegarkan (kartu UMUM-1 hilang, sisa 4 kartu)", !teksKartu.includes("UMUM-1") && d.querySelectorAll(".kartu-antrian").length === 4);

  // pesan galat hilang setelah berhasil mengambil nomor
  d.querySelector('.tombol-utama[data-id-jenis="j-b"]').click();
  periksa("pesan galat disembunyikan setelah pengambilan berhasil", pesan.hidden === true);
}

{
  console.log(" - tanpa jenis antrian aktif");
  const { d } = siapkan("ambil-antrian.html");
  await muat("ambilAntrian.js");
  periksa("tampil keadaan kosong + tidak ada kartu", d.getElementById("keadaan-kosong").hidden === false && d.querySelectorAll(".kartu-antrian").length === 0);
}

// =====================================================================
console.log(`\nHASIL: ${jumlahLulus} lulus, ${jumlahGagal} gagal`);
process.exit(jumlahGagal === 0 ? 0 : 1);
