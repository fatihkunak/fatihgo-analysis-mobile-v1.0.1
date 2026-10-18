import { describe, expect, it } from "vitest";

import { PHASE_NAMES, parsePlan, planPrompt, templatePlan } from "../lib/plan";

const good = JSON.stringify(
  PHASE_NAMES.map((p, i) => ({ phase: p, time: `${i}-${i + 5}s`, desc: `açıklama ${i}`, script: `metin ${i}` })),
);

describe("templatePlan", () => {
  it("6 aşama üretir ve niş ile konuyu yerine koyar", () => {
    const p = templatePlan("Minimalist Yaşam", "dijital sadeleşme");
    expect(p.map((x) => x.phase)).toEqual([...PHASE_NAMES]);
    expect(p[0].desc).toContain("Minimalist Yaşam");
    expect(p[0].script).toContain("dijital sadeleşme");
  });
});

describe("planPrompt", () => {
  it("niş, konu ve altı aşama adını içerir", () => {
    const t = planPrompt("Oyun", "retro konsol");
    expect(t).toContain("Oyun");
    expect(t).toContain("retro konsol");
    for (const n of PHASE_NAMES) expect(t).toContain(n);
  });
});

describe("parsePlan", () => {
  it("geçerli yanıtı alır, aşama adlarını sabitler", () => {
    const p = parsePlan(good);
    expect(p).toHaveLength(6);
    expect(p[2]).toMatchObject({ phase: "Isolate", desc: "açıklama 2", script: "metin 2" });
  });
  it("kod çiti içindeki JSON'u da kabul eder", () => {
    expect(parsePlan("```json\n" + good + "\n```")).toHaveLength(6);
  });
  it("model aşama adını bozsa bile sıraya göre sabit adı kullanır", () => {
    const arr = JSON.parse(good);
    arr[0].phase = "Giriş";
    expect(parsePlan(JSON.stringify(arr))[0].phase).toBe("Declare");
  });
  it("eksik zamanı kalıp zamanla tamamlar", () => {
    const arr = JSON.parse(good);
    delete arr[3].time;
    expect(parsePlan(JSON.stringify(arr))[3].time).toBe("40-120s");
  });
  it("bozuk JSON, yanlış sayıda aşama ve boş metinde hata verir", () => {
    expect(() => parsePlan("merhaba")).toThrow(/beklenen formatta/);
    expect(() => parsePlan(JSON.stringify(JSON.parse(good).slice(0, 5)))).toThrow(/6 aşama/);
    const arr = JSON.parse(good);
    arr[1].script = "  ";
    expect(() => parsePlan(JSON.stringify(arr))).toThrow(/2\. aşama eksik/);
  });
});
