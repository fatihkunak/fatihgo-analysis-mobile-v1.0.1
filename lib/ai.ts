// Uygulama genelinde tek AI girişi: seçili sağlayıcıyı (Profil > Yapay Zeka) kullanır.
import { loadAiConfig } from "@/lib/ai-config";
import { AiError, chat, resolve, type ChatTurn, type Creds } from "@/lib/ai-providers";

export type { ChatTurn };

/** Ayarlı ve kullanılabilir sağlayıcıyı döndürür; yoksa nedenini söyler. */
export async function aiStatus(): Promise<{ creds: Creds | null; label: string; reason: string }> {
  try {
    const creds = resolve(await loadAiConfig());
    return { creds, label: creds.info.label, reason: "" };
  } catch (e) {
    return { creds: null, label: "", reason: (e as Error).message };
  }
}

export async function aiChat(system: string, turns: ChatTurn[], maxTokens?: number): Promise<string> {
  const creds = resolve(await loadAiConfig());
  return chat(creds, system, turns, maxTokens);
}

export const ASSISTANT_SYSTEM =
  "Sen Nichevo uygulamasının YouTube büyüme asistanısın. Kısa, uygulanabilir ve Türkçe cevap ver.";

const stripFences = (s: string) => s.replace(/```json/g, "").replace(/```/g, "").trim();

export async function generateIdeas(niche: string): Promise<string[]> {
  const text = await aiChat(ASSISTANT_SYSTEM, [
    {
      role: "user",
      text: `"${niche}" nişi için 5 YouTube video fikri üret. SADECE JSON string dizisi döndür, örn: ["fikir 1","fikir 2"].`,
    },
  ]);
  const parsed = JSON.parse(stripFences(text));
  if (!Array.isArray(parsed)) throw new AiError("BAD_RESPONSE", "AI yanıtı beklenen formatta gelmedi.");
  return parsed.map(String).slice(0, 5);
}

export interface AiScene {
  scene: number;
  duration: string;
  description: string;
  script: string;
}

export async function analyzeScenes(title: string, description: string, duration: string): Promise<AiScene[]> {
  const prompt = `
Aşağıdaki YouTube videosu bilgilerini kullanarak profesyonel bir sahne analizi yap.

Video Başlığı: ${title}
Açıklama: ${description}
Süre: ${duration}

Görevin: Bu videoyu tam olarak 6 mantıklı bölüme (sahneye) ayır. Her sahne için sahne numarası, zaman aralığı (örn: "00:00 - 01:20"), kısa açıklama ve önerilen anlatım metni (script) ver.

Yanıtını SADECE aşağıdaki JSON formatında ver, başka hiçbir metin ekleme:
[{"scene":1,"duration":"00:00 - 00:30","description":"Sahne açıklaması","script":"Sahne senaryosu"}]
`;
  const text = await aiChat(ASSISTANT_SYSTEM, [{ role: "user", text: prompt }], 2048);
  try {
    return JSON.parse(stripFences(text));
  } catch {
    throw new AiError("BAD_RESPONSE", "AI yanıtı beklenen formatta gelmedi.");
  }
}

// Sağlayıcı yokken kullanılan şablon fikirler
export const templateIdeas = (niche: string): string[] => [
  `${niche}: Herkesin yaptığı 5 hata`,
  `${niche} için sıfırdan başlangıç rehberi`,
  `${niche}: 30 günde sonuç (gerçek deney)`,
  `${niche} hakkında kimsenin bahsetmediği gerçekler`,
  `${niche}: Başlangıç vs. profesyonel karşılaştırması`,
];
