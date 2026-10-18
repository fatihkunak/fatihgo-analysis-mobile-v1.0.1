// Canlı pazar verisi: yükselen nişler ve niş × format rekabet ısı haritası.
// Ölçü: YouTube araması `pageInfo.totalResults` (yaklaşık video sayısı). Yükselen niş = haftalık yükleme
// hacminin son dört haftadaki değişimi; rekabet = son 30 günde yüklenen video sayısı (log ölçeği).
// Her arama 100 kota birimi; sonuçlar 24 saat önbelleğe alınır ki günlük 10.000'lik kota boşa gitmesin.

import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE = "https://www.googleapis.com/youtube/v3";
const DAY = 86_400_000;

export const RISING_SEEDS = [
  "Yapay Zeka Araçları",
  "Minimalist Yaşam",
  "Retro Oyunlar",
  "Sesli Kitap Özetleri",
  "Kişisel Finans",
  "Ev Ofisi",
];
export const RISING_WEEKS = 4;

export const HEAT_ROW_QUERIES = [
  { label: "Teknoloji", q: "teknoloji" },
  { label: "Oyun", q: "oyun" },
  { label: "Eğitim", q: "eğitim" },
  { label: "Yaşam", q: "yaşam" },
];

type Format = { label: string; suffix?: string; params?: Record<string, string> };
/** Kısa: 4 dk altı · Uzun: 20 dk üstü · Canlı: bitmiş canlı yayınlar (YouTube arama filtreleri). */
export const HEAT_FORMATS: Format[] = [
  { label: "Kısa", params: { videoDuration: "short" } },
  { label: "Uzun", params: { videoDuration: "long" } },
  { label: "Canlı", params: { eventType: "completed" } },
  { label: "Podcast", suffix: "podcast" },
  { label: "Vlog", suffix: "vlog" },
];

export class QuotaError extends Error {
  constructor() {
    super("YouTube günlük kotası doldu; yarın tekrar denenecek.");
    this.name = "QuotaError";
  }
}

async function totalResults(apiKey: string, params: Record<string, string>): Promise<number> {
  const qs = new URLSearchParams({
    part: "id",
    type: "video",
    maxResults: "1",
    regionCode: "TR",
    relevanceLanguage: "tr",
    fields: "pageInfo(totalResults)",
    ...params,
    key: apiKey,
  });
  const res = await fetch(`${BASE}/search?${qs.toString()}`);
  if (!res.ok) {
    let reason = "";
    try {
      const j = await res.json();
      reason = (j.error?.errors?.[0]?.reason as string | undefined) ?? (j.error?.message as string | undefined) ?? "";
    } catch {}
    if (res.status === 403 && /quota/i.test(reason)) throw new QuotaError();
    throw new Error(`API Hatası: ${res.status}${reason ? " " + reason.replace(apiKey, "***").slice(0, 80) : ""}`);
  }
  const n = (await res.json()).pageInfo?.totalResults;
  if (typeof n !== "number") throw new Error("YouTube beklenmeyen bir yanıt verdi");
  return n;
}

/** Serinin (eskiden yeniye) ilk ve son değeri arasındaki yüzde değişim. */
export function growthPct(series: number[]): number {
  if (series.length < 2) return 0;
  const first = series[0];
  const last = series[series.length - 1];
  if (first <= 0) return last > 0 ? 100 : 0;
  return Math.round(((last - first) / first) * 100);
}

/** Sayıları 0-1 aralığına log ölçeğiyle indirger; hepsi eşitse 0.5. */
export function normalizeHeat(counts: number[][]): number[][] {
  const logs = counts.map((row) => row.map((c) => Math.log10(Math.max(1, c))));
  const flat = logs.flat();
  const lo = Math.min(...flat);
  const hi = Math.max(...flat);
  if (hi - lo < 1e-9) return logs.map((row) => row.map(() => 0.5));
  return logs.map((row) => row.map((v) => +((v - lo) / (hi - lo)).toFixed(3)));
}

/** Eskiden yeniye N haftalık pencere: [{after, before}] (ISO). */
export function weekWindows(now: number, weeks: number): { after: string; before: string }[] {
  return Array.from({ length: weeks }, (_, i) => {
    const end = now - (weeks - 1 - i) * 7 * DAY;
    return { after: new Date(end - 7 * DAY).toISOString(), before: new Date(end).toISOString() };
  });
}

/** Aynı anda en fazla `size` istek (kota/ağ dostu). */
async function inBatches<T, R>(items: T[], size: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  return out;
}

export interface RisingNiche {
  name: string;
  growth: number;
  series: number[];
}

export async function fetchRisingNiches(apiKey: string, now = Date.now()): Promise<RisingNiche[]> {
  const wins = weekWindows(now, RISING_WEEKS);
  const jobs = RISING_SEEDS.flatMap((name) => wins.map((w) => ({ name, w })));
  const counts = await inBatches(jobs, 4, ({ name, w }) =>
    totalResults(apiKey, { q: name, publishedAfter: w.after, publishedBefore: w.before }),
  );
  const rows = RISING_SEEDS.map((name, i) => {
    const series = counts.slice(i * RISING_WEEKS, (i + 1) * RISING_WEEKS);
    return { name, growth: growthPct(series), series };
  });
  return rows.sort((a, b) => b.growth - a.growth);
}

export interface Heat {
  rows: string[];
  cols: string[];
  data: number[][];
  counts: number[][];
}

export async function fetchHeatmap(apiKey: string, now = Date.now()): Promise<Heat> {
  const after = new Date(now - 30 * DAY).toISOString();
  const jobs = HEAT_ROW_QUERIES.flatMap((r) => HEAT_FORMATS.map((f) => ({ r, f })));
  const flat = await inBatches(jobs, 4, ({ r, f }) =>
    totalResults(apiKey, { q: f.suffix ? `${r.q} ${f.suffix}` : r.q, publishedAfter: after, ...(f.params ?? {}) }),
  );
  const counts = HEAT_ROW_QUERIES.map((_, i) => flat.slice(i * HEAT_FORMATS.length, (i + 1) * HEAT_FORMATS.length));
  return {
    rows: HEAT_ROW_QUERIES.map((r) => r.label),
    cols: HEAT_FORMATS.map((f) => f.label),
    data: normalizeHeat(counts),
    counts,
  };
}

// --- 24 saatlik önbellek ---
const TTL = DAY;
type Cached<T> = { at: number; value: T };

export async function cached<T>(key: string, load: () => Promise<T>, now = Date.now()): Promise<{ value: T; at: number; fresh: boolean }> {
  let hit: Cached<T> | null = null;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) hit = JSON.parse(raw) as Cached<T>;
  } catch {}
  if (hit && now - hit.at < TTL) return { value: hit.value, at: hit.at, fresh: false };
  try {
    const value = await load();
    try {
      await AsyncStorage.setItem(key, JSON.stringify({ at: now, value }));
    } catch {}
    return { value, at: now, fresh: true };
  } catch (e) {
    // Kota/ağ hatasında eski veriyi göstermek boş ekrandan iyidir; yoksa hata yukarı çıkar
    if (hit) return { value: hit.value, at: hit.at, fresh: false };
    throw e;
  }
}

export const loadRising = (apiKey: string) => cached("nichevo.market.rising.v1", () => fetchRisingNiches(apiKey));
export const loadHeat = (apiKey: string) => cached("nichevo.market.heat.v1", () => fetchHeatmap(apiKey));
