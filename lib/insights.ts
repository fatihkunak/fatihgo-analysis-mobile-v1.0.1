// Saf (yan etkisiz) analiz fonksiyonları: ekranlar ve testler paylaşır.

export const SAMPLE_TOPICS = [
  "Teknoloji Trendleri", "Oyun Dünyası", "Yapay Zeka", "Üretkenlik",
  "AI Haberleri", "Medya Tasarımı", "Minimalist Yaşam", "Finans",
];

export const RISING_NICHES = [
  { name: "Yapay Zeka Araçları", growth: 42, series: [20, 24, 23, 31, 36, 48, 58] },
  { name: "Minimalist Yaşam", growth: 28, series: [30, 28, 34, 33, 40, 44, 47] },
  { name: "Retro Oyunlar", growth: 19, series: [22, 25, 24, 27, 26, 30, 33] },
  { name: "Sesli Kitap Özetleri", growth: 15, series: [15, 18, 17, 20, 22, 21, 26] },
];

export const CATEGORIES = ["Teknoloji", "Oyun", "Eğitim", "Finans", "Yaşam", "Sağlık", "Müzik", "Spor"];

/** Rekabet ısı haritası: satır = niş, sütun = format. Değer 0-1 (yüksek = kalabalık). */
export const HEAT_ROWS = ["Teknoloji", "Oyun", "Eğitim", "Yaşam"];
export const HEAT_COLS = ["Kısa", "Uzun", "Canlı", "Podcast", "Vlog"];
export const HEAT_DATA = [
  [0.9, 0.7, 0.4, 0.3, 0.5],
  [0.8, 0.9, 0.8, 0.2, 0.6],
  [0.5, 0.6, 0.2, 0.4, 0.3],
  [0.7, 0.5, 0.3, 0.2, 0.9],
];

export function formatCount(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

/** 0-100 arası kanal skoru: ortalama görüntülenme, abone ve video sayısının basit birleşimi. */
export function channelScore(c: { subs: number; views: number; videos: number }): number {
  if (c.videos <= 0) return 0;
  const avgViews = c.views / c.videos;
  const reach = Math.min(1, Math.log10(Math.max(1, avgViews)) / 6); // 1M ort. görüntülenme = tam puan
  const authority = Math.min(1, Math.log10(Math.max(1, c.subs)) / 7); // 10M abone = tam puan
  const consistency = Math.min(1, c.videos / 200);
  return Math.round((reach * 0.5 + authority * 0.3 + consistency * 0.2) * 100);
}

/** Basit büyüme modeli: mevcut görüntülenmeyi etkileşim oranına göre sonraki dönemlere yayar. */
export function forecastViews(views: number, engagementPct: number, periods = 6): number[] {
  const growth = 1 + Math.min(0.25, Math.max(0.02, engagementPct / 100));
  const out: number[] = [];
  let v = Math.max(1, views);
  for (let i = 0; i < periods; i++) {
    out.push(Math.round(v));
    v *= growth;
  }
  return out;
}

const POS = ["harika", "mükemmel", "süper", "teşekkür", "sağol", "güzel", "bayıldım", "faydalı", "efsane", "great", "love", "awesome", "amazing", "thanks", "best", "helpful", "good", "nice"];
const NEG = ["kötü", "berbat", "saçma", "rezalet", "gereksiz", "yanlış", "sıkıcı", "beğenmedim", "bad", "worst", "boring", "hate", "terrible", "awful", "waste", "fake"];

export function sentiment(comments: string[]): { positive: number; neutral: number; negative: number } {
  let p = 0;
  let n = 0;
  for (const c of comments) {
    const t = c.toLocaleLowerCase("tr");
    const hasPos = POS.some((w) => t.includes(w));
    const hasNeg = NEG.some((w) => t.includes(w));
    if (hasPos && !hasNeg) p++;
    else if (hasNeg && !hasPos) n++;
  }
  const total = Math.max(1, comments.length);
  const positive = Math.round((p / total) * 100);
  const negative = Math.round((n / total) * 100);
  return { positive, negative, neutral: 100 - positive - negative };
}

const STOP = new Set(["ve", "ile", "bir", "bu", "şu", "için", "de", "da", "mi", "mı", "the", "and", "for", "you", "with", "that", "this", "to", "of", "in", "on", "a", "is", "it"]);

export function topKeywords(texts: string[], limit = 12): { word: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const t of texts) {
    for (const w of t.toLocaleLowerCase("tr").split(/[^\p{L}\p{N}#]+/u)) {
      if (w.length < 3 || STOP.has(w)) continue;
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}

export const WEEK_DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

/** Görüntülenme/abone oranını (yüzde) "x kat" olarak gösterir: 304516 -> "3K×", 48 -> "0.5×". */
export function formatMultiple(ratioPct: number): string {
  const x = ratioPct / 100;
  if (x >= 1000) return formatCount(Math.round(x)) + "×";
  return x.toFixed(1).replace(/\.0$/, "") + "×";
}

const GENERIC_TAGS = new Set(["official", "video", "shorts", "youtube", "trailer", "türkçe", "turkish", "tr", "2025", "2026", "music"]);

/** Trend etiketlerinden konu ifadeleri: tam etiketler sayılır (tek tek kelimeler değil), genel olanlar atılır. */
export function topPhrases(tags: string[], limit = 8): string[] {
  const counts = new Map<string, { n: number; first: number }>();
  tags.forEach((raw, i) => {
    const t = raw.trim().toLocaleLowerCase("tr");
    if (t.length < 4 || t.length > 30 || GENERIC_TAGS.has(t) || /^[\d\s]+$/.test(t)) return;
    const c = counts.get(t);
    if (c) c.n++;
    else counts.set(t, { n: 1, first: i });
  });
  return [...counts.entries()]
    .sort((a, b) => b[1].n - a[1].n || a[1].first - b[1].first)
    .slice(0, limit)
    .map(([t]) => t.charAt(0).toLocaleUpperCase("tr") + t.slice(1));
}
