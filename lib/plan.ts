// Video çekim planı: 6 aşamalı yapı. Saf mantık (React Native'e bağımlı değil), vitest ile test edilir.

export interface Phase {
  phase: string;
  time: string;
  desc: string;
  script: string;
}

export const PHASE_NAMES = ["Declare", "Assess", "Isolate", "Process", "Build", "Reveal"] as const;
const PHASE_TIMES = ["0-5s", "5-20s", "20-40s", "40-120s", "120-150s", "150s+"];

/** Sağlayıcı yokken ya da AI hata verince kullanılan kalıp plan: yalnızca niş ve konu yerine konur. */
export const templatePlan = (niche: string, topic: string): Phase[] => [
  {
    phase: "Declare",
    time: "0-5s",
    desc: `${niche} dünyasına hızlı giriş. ${topic} hakkında merak uyandırıcı bir soru sor.`,
    script: `Hiç ${topic} konusunu böyle düşünmüş müydünüz?`,
  },
  {
    phase: "Assess",
    time: "5-20s",
    desc: "Mevcut sorunu tanımla. Neden bu videoyu izlemeliler?",
    script: "Çoğu insan bu konuda yanılıyor, işte gerçek...",
  },
  {
    phase: "Isolate",
    time: "20-40s",
    desc: "Çözümü odak noktasına al. Gereksiz detayları ele.",
    script: "Şimdi sadece en önemli kısma odaklanalım.",
  },
  {
    phase: "Process",
    time: "40-120s",
    desc: "Adım adım uygulama. Teknik detayları basitçe anlat.",
    script: "İlk adım olarak şunu yapıyoruz...",
  },
  {
    phase: "Build",
    time: "120-150s",
    desc: "Momentumu artır. Sonuca yaklaştığını hissettir.",
    script: "Ve işte en heyecan verici kısma geliyoruz!",
  },
  {
    phase: "Reveal",
    time: "150s+",
    desc: "Büyük final ve CTA. İzleyiciyi harekete geçir.",
    script: "Sonuç ortada! Siz ne düşünüyorsunuz? Yorumlarda buluşalım.",
  },
];

export const planPrompt = (niche: string, topic: string) => `
YouTube için "${niche}" nişinde "${topic}" konulu bir video çekim planı hazırla.
Planı tam olarak şu 6 aşamaya böl ve aşama adlarını aynen kullan: ${PHASE_NAMES.join(", ")}.
Her aşama için: zaman aralığı (time, örn "0-5s"), ne yapılacağını anlatan kısa açıklama (desc) ve kameraya söylenecek örnek cümleler (script) ver.
Açıklama ve metinler bu konuya özgü olsun, genel geçer kalıp cümle yazma. Türkçe yaz.

Yanıtını SADECE şu JSON formatında ver, başka metin ekleme:
[{"phase":"Declare","time":"0-5s","desc":"...","script":"..."}]
`;

const strip = (s: string) => s.replace(/```json/g, "").replace(/```/g, "").trim();

/** AI yanıtını doğrular: 6 aşama, adlar ve metinler dolu. Eksik zamanı kalıp zamanla tamamlar. */
export function parsePlan(text: string): Phase[] {
  let raw: unknown;
  try {
    raw = JSON.parse(strip(text));
  } catch {
    throw new Error("AI yanıtı beklenen formatta gelmedi.");
  }
  if (!Array.isArray(raw) || raw.length !== PHASE_NAMES.length) {
    throw new Error("AI yanıtında 6 aşama yok.");
  }
  return raw.map((r, i) => {
    const o = (r ?? {}) as Record<string, unknown>;
    const desc = typeof o.desc === "string" ? o.desc.trim() : "";
    const script = typeof o.script === "string" ? o.script.trim() : "";
    if (!desc || !script) throw new Error(`AI yanıtında ${i + 1}. aşama eksik.`);
    const time = typeof o.time === "string" && o.time.trim() ? o.time.trim() : PHASE_TIMES[i]!;
    return { phase: PHASE_NAMES[i]!, time, desc, script };
  });
}
