import AsyncStorage from "@react-native-async-storage/async-storage";

export interface AIScene {
  scene: number;
  duration: string;
  description: string;
  script: string;
}

// Load Gemini API key from AsyncStorage
export const loadGeminiApiKey = async (): Promise<string | null> => {
  try {
    const key = await AsyncStorage.getItem("geminiApiKey");
    return key?.trim() || null;
  } catch (error) {
    console.error("Gemini API key yüklenemedi:", error);
    return null;
  }
};

// Analyze scenes using Gemini API
export const analyzeScenesWithGemini = async (
  apiKey: string,
  videoTitle: string,
  videoDescription: string,
  videoDuration: string
): Promise<AIScene[]> => {
  try {
    console.log("Gemini API ile sahne analizi başlatılıyor...");

    const prompt = `
      Aşağıdaki YouTube videosu bilgilerini kullanarak profesyonel bir sahne analizi yap.

      Video Başlığı: ${videoTitle}
      Açıklama: ${videoDescription}
      Süre: ${videoDuration}

      Görevin:
      Bu videoyu tam olarak 6 mantıklı bölüme (sahneye) ayır. Her sahne için:
      1. Sahne numarası
      2. Zaman aralığı (örn: "00:00 - 01:20")
      3. Sahnenin kısa özeti/açıklaması
      4. O sahne için önerilen bir anlatım metni (script)

      Not: Mutlaka 6 adet sahne nesnesi içeren bir dizi döndür.

      Yanıtını SADECE aşağıdaki JSON formatında ver, başka hiçbir metin ekleme:
      [
        {
          "scene": 1,
          "duration": "00:00 - 00:30",
          "description": "Sahne açıklaması",
          "script": "Sahne senaryosu"
        },
        ...
      ]
    `;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Gemini API Hatası: ${response.status}`);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // JSON içeriğini temizle (Markdown bloklarını kaldır)
    const jsonStr = resultText.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const scenes = JSON.parse(jsonStr);
      return scenes;
    } catch (parseError) {
      console.error("Gemini yanıtı parse edilemedi:", resultText);
      throw new Error("AI yanıtı beklenen formatta gelmedi.");
    }
  } catch (error) {
    console.error("Gemini Analiz Hatası:", error);
    throw error;
  }
};

// Test Gemini API connection
export const testGeminiAPI = async (apiKey: string): Promise<boolean> => {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Merhaba" }] }]
      })
    });
    const data = await response.json();
    if (data.error) {
      console.log('Gemini API Hatası:', data.error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.log('Gemini Bağlantı hatası:', error);
    return false;
  }
};
