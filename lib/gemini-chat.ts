// Nichevo AI asistanı ve fikir üretici için Gemini çağrıları.

const GEMINI_URL = (apiKey: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

export type ChatTurn = { role: "user" | "model"; text: string };

export const chatWithGemini = async (apiKey: string, history: ChatTurn[]): Promise<string> => {
  const response = await fetch(GEMINI_URL(apiKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [
          { text: "Sen Nichevo uygulamasının YouTube büyüme asistanısın. Kısa, uygulanabilir ve Türkçe cevap ver." },
        ],
      },
      contents: history.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || `Gemini API Hatası: ${response.status}`);
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Yanıt alınamadı.";
};

export const generateIdeasWithGemini = async (apiKey: string, niche: string): Promise<string[]> => {
  const text = await chatWithGemini(apiKey, [
    {
      role: "user",
      text: `"${niche}" nişi için 5 YouTube video fikri üret. SADECE JSON string dizisi döndür, örn: ["fikir 1","fikir 2"].`,
    },
  ]);
  const parsed = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
  if (!Array.isArray(parsed)) throw new Error("AI yanıtı beklenen formatta gelmedi.");
  return parsed.map(String).slice(0, 5);
};

// API anahtarı yokken kullanılan şablon fikirler
export const templateIdeas = (niche: string): string[] => [
  `${niche}: Herkesin yaptığı 5 hata`,
  `${niche} için sıfırdan başlangıç rehberi`,
  `${niche}: 30 günde sonuç (gerçek deney)`,
  `${niche} hakkında kimsenin bahsetmediği gerçekler`,
  `${niche}: Başlangıç vs. profesyonel karşılaştırması`,
];
