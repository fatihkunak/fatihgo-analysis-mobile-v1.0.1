import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async (k: string) => store.get(k) ?? null,
    setItem: async (k: string, v: string) => void store.set(k, v),
  },
}));

import {
  HEAT_FORMATS,
  HEAT_ROW_QUERIES,
  QuotaError,
  RISING_SEEDS,
  RISING_WEEKS,
  cached,
  fetchHeatmap,
  fetchRisingNiches,
  growthPct,
  normalizeHeat,
  weekWindows,
} from "../lib/market";

const NOW = Date.UTC(2026, 9, 18, 12);

const ok = (n: number) => new Response(JSON.stringify({ pageInfo: { totalResults: n } }), { status: 200 });

beforeEach(() => store.clear());
afterEach(() => vi.unstubAllGlobals());

describe("growthPct", () => {
  it("ilk ve son değer arasındaki yüzde değişimi verir", () => {
    expect(growthPct([100, 120, 130, 150])).toBe(50);
    expect(growthPct([200, 150])).toBe(-25);
  });
  it("başlangıç sıfırsa ya da seri kısaysa taşmaz", () => {
    expect(growthPct([0, 10])).toBe(100);
    expect(growthPct([0, 0])).toBe(0);
    expect(growthPct([5])).toBe(0);
  });
});

describe("normalizeHeat", () => {
  it("log ölçeğiyle 0-1 aralığına indirger; en küçük 0, en büyük 1", () => {
    const h = normalizeHeat([[10, 1000], [100, 100000]]);
    expect(h[0][0]).toBe(0);
    expect(h[1][1]).toBe(1);
    expect(h[0][0]).toBeLessThan(h[1][0]); // sıralama korunur: 10 < 100 < 1000 < 100000
    expect(h[1][0]).toBeLessThan(h[0][1]);
    expect(h[0][1]).toBeLessThan(h[1][1]);
  });
  it("hepsi eşitse 0.5 döner (bölme hatası yok)", () => {
    expect(normalizeHeat([[7, 7], [7, 7]])).toEqual([[0.5, 0.5], [0.5, 0.5]]);
  });
  it("sıfır sayıyı log(0)'a düşürmez", () => {
    const h = normalizeHeat([[0, 100]]);
    expect(h[0][0]).toBe(0);
    expect(h[0][1]).toBe(1);
  });
});

describe("weekWindows", () => {
  it("eskiden yeniye, bitişik 7 günlük pencereler üretir", () => {
    const w = weekWindows(NOW, 4);
    expect(w).toHaveLength(4);
    expect(w[3].before).toBe(new Date(NOW).toISOString());
    for (let i = 1; i < 4; i++) expect(w[i].after).toBe(w[i - 1].before);
    expect(new Date(w[0].before).getTime() - new Date(w[0].after).getTime()).toBe(7 * 86_400_000);
  });
});

describe("fetchRisingNiches", () => {
  it("her niş için haftalık seri çıkarır, büyümeye göre azalan sıralar", async () => {
    const calls: URL[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      const u = new URL(url);
      calls.push(u);
      const q = u.searchParams.get("q")!;
      const weekIdx = Math.round((NOW - new Date(u.searchParams.get("publishedBefore")!).getTime()) / (7 * 86_400_000));
      // "Retro Oyunlar" hızla büyüyor, "Ev Ofisi" düşüyor, diğerleri sabit
      const age = RISING_WEEKS - 1 - weekIdx; // 0 = en eski hafta, 3 = en yeni
      return ok(q === "Retro Oyunlar" ? 100 + age * 100 : q === "Ev Ofisi" ? 400 - age * 100 : 200);
    });
    const r = await fetchRisingNiches("KEY", NOW);
    expect(r).toHaveLength(RISING_SEEDS.length);
    expect(calls).toHaveLength(RISING_SEEDS.length * RISING_WEEKS);
    expect(r[0].name).toBe("Retro Oyunlar");
    expect(r[0].growth).toBeGreaterThan(0);
    expect(r[r.length - 1].name).toBe("Ev Ofisi");
    expect(r[r.length - 1].growth).toBeLessThan(0);
    expect(r[0].series).toHaveLength(RISING_WEEKS);
    expect(calls[0].searchParams.get("regionCode")).toBe("TR");
    expect(calls[0].searchParams.get("type")).toBe("video");
  });
});

describe("fetchHeatmap", () => {
  it("niş × format ızgarası kurar ve format süzgeçlerini isteğe taşır", async () => {
    const seen: URL[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      const u = new URL(url);
      seen.push(u);
      // oyun + canlı en kalabalık, eğitim + podcast en boş
      const q = u.searchParams.get("q")!;
      if (q === "oyun" && u.searchParams.get("eventType") === "completed") return ok(900_000);
      if (q === "eğitim podcast") return ok(500);
      return ok(20_000);
    });
    const h = await fetchHeatmap("KEY", NOW);
    expect(h.rows).toEqual(HEAT_ROW_QUERIES.map((r) => r.label));
    expect(h.cols).toEqual(HEAT_FORMATS.map((f) => f.label));
    expect(h.data).toHaveLength(4);
    expect(h.data[0]).toHaveLength(5);
    expect(h.data[1][2]).toBe(1); // Oyun × Canlı
    expect(h.data[2][3]).toBe(0); // Eğitim × Podcast
    expect(seen.some((u) => u.searchParams.get("videoDuration") === "short")).toBe(true);
    expect(seen.some((u) => u.searchParams.get("videoDuration") === "long")).toBe(true);
    expect(seen.some((u) => u.searchParams.get("q") === "yaşam vlog")).toBe(true);
  });
});

describe("hata ve önbellek", () => {
  it("kota hatasını QuotaError olarak ayırır", async () => {
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ error: { errors: [{ reason: "quotaExceeded" }] } }), { status: 403 }));
    await expect(fetchHeatmap("KEY", NOW)).rejects.toBeInstanceOf(QuotaError);
  });

  it("anahtarı hata mesajına sızdırmaz", async () => {
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ error: { message: "API key SECRETKEY invalid" } }), { status: 400 }));
    await expect(fetchHeatmap("SECRETKEY", NOW)).rejects.toThrow(/API Hatası: 400/);
    await expect(fetchHeatmap("SECRETKEY", NOW)).rejects.not.toThrow(/SECRETKEY/);
  });

  it("24 saat içinde ağa gitmez, sonra yeniler; hata olursa eski veriyi verir", async () => {
    const load = vi.fn().mockResolvedValueOnce("v1").mockResolvedValueOnce("v2").mockRejectedValueOnce(new Error("ağ"));
    expect((await cached("k", load, NOW)).value).toBe("v1");
    expect((await cached("k", load, NOW + 3_600_000)).value).toBe("v1");
    expect(load).toHaveBeenCalledTimes(1);
    expect((await cached("k", load, NOW + 25 * 3_600_000)).value).toBe("v2");
    const stale = await cached("k", load, NOW + 60 * 3_600_000);
    expect(stale.value).toBe("v2");
    expect(stale.fresh).toBe(false);
  });

  it("önbellek yokken yükleme hatası yukarı çıkar", async () => {
    await expect(cached("yok", async () => Promise.reject(new Error("boom")), NOW)).rejects.toThrow("boom");
  });
});
