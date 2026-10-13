
export function bacaData<T>(kunci: string, nilaiAwal: T): T {
  try {
    const mentah = localStorage.getItem(kunci);
    return mentah === null ? nilaiAwal : (JSON.parse(mentah) as T);
  } catch {
    return nilaiAwal;
  }
}

export function simpanData(kunci: string, nilai: unknown): void {
  localStorage.setItem(kunci, JSON.stringify(nilai));
}
