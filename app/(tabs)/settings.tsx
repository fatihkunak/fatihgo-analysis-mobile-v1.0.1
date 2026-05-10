import { ScrollView, Text, View, TouchableOpacity, TextInput, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useState, useEffect } from "react";
import { useColors } from "@/hooks/use-colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { testYoutubeApiConnection } from "@/lib/youtube-api";

export default function SettingsScreen() {
  const colors = useColors();
  const [youtubeKey, setYoutubeKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [showYoutubeKey, setShowYoutubeKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [testingApi, setTestingApi] = useState(false);
  const [apiStatus, setApiStatus] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      const yt = await AsyncStorage.getItem("youtubeApiKey");
      const gm = await AsyncStorage.getItem("geminiApiKey");
      if (yt) setYoutubeKey(yt);
      if (gm) setGeminiKey(gm);
    } catch (error) {
      console.error("Anahtarlar yüklenemedi:", error);
    }
  };

  const saveYoutubeKey = async () => {
    const trimmedKey = youtubeKey.trim();
    if (!trimmedKey) {
      Alert.alert("Hata", "YouTube API Key boş olamaz.");
      return;
    }

    try {
      await AsyncStorage.setItem("youtubeApiKey", trimmedKey);
      setYoutubeKey(trimmedKey); // Local state'i de temizlenmiş haliyle güncelle
      setSavedMessage("✅ YouTube API Key kaydedildi");
      setApiStatus(null);
      setTimeout(() => setSavedMessage(""), 3000);
    } catch {
      Alert.alert("Hata", "Anahtar kaydedilemedi");
    }
  };

  const saveGeminiKey = async () => {
    if (!geminiKey.trim()) {
      Alert.alert("Hata", "Gemini API Key boş olamaz.");
      return;
    }

    try {
      await AsyncStorage.setItem("geminiApiKey", geminiKey);
      setSavedMessage("✅ Gemini API Key kaydedildi");
      setTimeout(() => setSavedMessage(""), 3000);
    } catch {
      Alert.alert("Hata", "Anahtar kaydedilemedi");
    }
  };

  const testYoutubeApi = async () => {
    if (!youtubeKey.trim()) {
      Alert.alert("Hata", "Lütfen önce YouTube API Key'i girin.");
      return;
    }

    setTestingApi(true);
    try {
      const result = await testYoutubeApiConnection(youtubeKey);
      if (result.success) {
        setApiStatus({ success: true, message: "✅ YouTube API bağlantısı başarılı!" });
      } else {
        setApiStatus({ success: false, message: `❌ ${result.error}` });
      }
    } catch (error) {
      setApiStatus({ success: false, message: `❌ Test hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}` });
    } finally {
      setTestingApi(false);
    }
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text className="text-2xl font-bold text-foreground mb-6">🔑 Ayarlar</Text>

        {/* YouTube API Key Section */}
        <View className="mb-6 p-4 bg-surface rounded-lg border border-border">
          <Text className="text-base font-semibold text-foreground mb-3">YouTube Data API v3</Text>

          <View className="flex-row items-center bg-background rounded-lg border border-border mb-3">
            <TextInput
              placeholder="AIzaSy..."
              value={youtubeKey}
              onChangeText={setYoutubeKey}
              secureTextEntry={!showYoutubeKey}
              className="flex-1 p-3 text-foreground"
              placeholderTextColor={colors.muted}
            />
            <TouchableOpacity
              onPress={() => setShowYoutubeKey(!showYoutubeKey)}
              className="px-3 py-2"
            >
              <Text className="text-lg">{showYoutubeKey ? "🙈" : "👁"}</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row gap-2 mb-3">
            <TouchableOpacity
              onPress={saveYoutubeKey}
              className="flex-1 p-3 rounded-lg"
              style={{ backgroundColor: colors.primary }}
            >
              <Text className="text-center text-background font-semibold">💾 Kaydet</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={testYoutubeApi}
              disabled={testingApi}
              className="flex-1 p-3 rounded-lg"
              style={{ backgroundColor: colors.border, opacity: testingApi ? 0.5 : 1 }}
            >
              <Text className="text-center text-foreground font-semibold">🧪 Test Et</Text>
            </TouchableOpacity>
          </View>

          {apiStatus && (
            <View className={`p-3 rounded-lg mb-3 ${apiStatus.success ? 'bg-success' : 'bg-error'}`}>
              <Text className="text-sm text-background">
                {apiStatus.message}
              </Text>
            </View>
          )}

          <Text className="text-xs text-muted">
            📌 API Key almak için:{"\n"}
            1. Google Cloud Console'a git{"\n"}
            2. YouTube Data API v3'ü etkinleştir{"\n"}
            3. API Key oluştur (AIza... ile başlar)
          </Text>
        </View>

        {/* Gemini API Key Section */}
        <View className="mb-6 p-4 bg-surface rounded-lg border border-border">
          <Text className="text-base font-semibold text-foreground mb-3">Gemini API Key (Opsiyonel)</Text>

          <View className="flex-row items-center bg-background rounded-lg border border-border mb-3">
            <TextInput
              placeholder="AIzaSy..."
              value={geminiKey}
              onChangeText={setGeminiKey}
              secureTextEntry={!showGeminiKey}
              className="flex-1 p-3 text-foreground"
              placeholderTextColor={colors.muted}
            />
            <TouchableOpacity
              onPress={() => setShowGeminiKey(!showGeminiKey)}
              className="px-3 py-2"
            >
              <Text className="text-lg">{showGeminiKey ? "🙈" : "👁"}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={saveGeminiKey}
            className="p-3 rounded-lg"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-center text-background font-semibold">💾 Gemini Key Kaydet</Text>
          </TouchableOpacity>

          <Text className="text-xs text-muted mt-3">
            Gelişmiş AI özellikleri için Gemini API anahtarı ekleyin
          </Text>
        </View>

        {/* Status Message */}
        {savedMessage && (
          <View className="p-3 bg-success rounded-lg mb-4">
            <Text className="text-foreground text-center text-sm">{savedMessage}</Text>
          </View>
        )}

        {/* Info Section */}
        <View className="p-4 bg-surface rounded-lg border border-border">
          <Text className="text-sm font-semibold text-foreground mb-2">ℹ️ Hakkında</Text>
          <Text className="text-xs text-muted">
            Fatihgo Analysis v1.0.0{"\n"}
            YouTube video analiz ve niş tarama aracı{"\n"}
            © 2026 Fatihgo
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
