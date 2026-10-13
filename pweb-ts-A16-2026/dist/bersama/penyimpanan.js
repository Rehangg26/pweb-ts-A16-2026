export function bacaData(kunci, nilaiAwal) {
    try {
        const mentah = localStorage.getItem(kunci);
        return mentah === null ? nilaiAwal : JSON.parse(mentah);
    }
    catch {
        return nilaiAwal;
    }
}
export function simpanData(kunci, nilai) {
    localStorage.setItem(kunci, JSON.stringify(nilai));
}
