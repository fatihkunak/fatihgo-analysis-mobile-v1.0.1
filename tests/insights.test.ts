import { describe, expect, it } from "vitest";

import { channelScore, forecastViews, formatCount, sentiment, topKeywords } from "../lib/insights";

describe("insights", () => {
  it("formatCount kısaltır", () => {
    expect(formatCount(999)).toBe("999");
    expect(formatCount(1500)).toBe("1.5K");
    expect(formatCount(2_000_000)).toBe("2M");
  });

  it("channelScore 0-100 aralığında kalır ve videosuz kanalda 0 döner", () => {
    expect(channelScore({ subs: 100, views: 0, videos: 0 })).toBe(0);
    const big = channelScore({ subs: 50_000_000, views: 5e10, videos: 1000 });
    expect(big).toBeLessThanOrEqual(100);
    expect(big).toBeGreaterThan(90);
    const small = channelScore({ subs: 100, views: 5000, videos: 10 });
    expect(small).toBeLessThan(big);
  });

  it("forecastViews artan, 6 elemanlı seri üretir", () => {
    const f = forecastViews(1000, 5);
    expect(f).toHaveLength(6);
    expect(f[0]).toBe(1000);
    for (let i = 1; i < f.length; i++) expect(f[i]).toBeGreaterThan(f[i - 1]);
  });

  it("sentiment yüzdeleri 100'e tamamlanır", () => {
    const s = sentiment(["harika video", "çok kötü", "ilk", "great stuff", "boring"]);
    expect(s.positive + s.neutral + s.negative).toBe(100);
    expect(s.positive).toBe(40);
    expect(s.negative).toBe(40);
    expect(sentiment([])).toEqual({ positive: 0, neutral: 100, negative: 0 });
  });

  it("topKeywords sık geçen kelimeleri sıralar, kısa/stop kelimeleri atar", () => {
    const k = topKeywords(["yapay zeka ve yapay zeka araçları", "zeka the a"]);
    expect(k[0]).toEqual({ word: "zeka", count: 3 });
    expect(k[1]).toEqual({ word: "yapay", count: 2 });
    expect(k.find((x) => x.word === "ve" || x.word === "the")).toBeUndefined();
  });
});
