import { ScrollView, Text, View, TextInput, TouchableOpacity, ActivityIndicator, FlatList, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useState, useEffect } from "react";
import { useColors } from "@/hooks/use-colors";
import { loadYoutubeApiKey, fetchVideoData, extractVideoId } from "@/lib/youtube-api";

interface AnalysisResult {
  scene: number;
  duration: string;
  description: string;
  script: string;
}

export default function HomeScreen() {
  const colors = useColors();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [videoInfo, setVideoInfo] = useState<{ id: string; title: string; channel: string } | null>(null);
  const [youtubeApiKey, setYoutubeApiKey] = useState<string | null>(null);

  // Load YouTube API key from AsyncStorage on component mount
  useEffect(() => {
    const loadApiKey = async () => {
      try {
        const key = await loadYoutubeApiKey();
        setYoutubeApiKey(key);
      } catch (error) {
        console.error("API key yüklenemedi:", error);
      }
    };
    loadApiKey();
  }, []);

  const handleAnalyze = async () => {
    if (!url.trim()) {
      Alert.alert("Hata", "Lütfen bir YouTube URL'si girin.");
      return;
    }

    setIsLoading(true);
    try {
      // Extract video ID from URL
      const videoId = extractVideoId(url);
      if (!videoId) {
        Alert.alert("Hata", "Geçersiz YouTube URL'si. Desteklenen formatlar:\n- youtube.com/watch?v=...\n- youtu.be/...\n- youtube.com/live/...\n- youtube.com/embed/...");
        setIsLoading(false);
        return;
      }

      // Fetch video data from YouTube API
      let videoData = null;
      try {
        videoData = await fetchVideoData(videoId, youtubeApiKey);
      } catch (apiError) {
        console.error("YouTube API hatası:", apiError);
        // If API fails, use mock data
        Alert.alert(
          "API Uyarısı",
          "YouTube API'ye bağlanılamadı. Mock veriler kullanılıyor.\n\nLütfen Ayarlar sayfasında YouTube API anahtarınızı kontrol edin.",
          [{ text: "Tamam" }]
        );
      }

      // Set video info (real or mock)
      setVideoInfo({
        id: videoId,
        title: videoData?.title || "Video Başlığı (Mock)",
        channel: videoData?.channel || "Kanal Adı (Mock)",
      });

      // Generate mock analysis results
      setResults([
        { scene: 1, duration: "0-5s", description: "Giriş ve kanca", script: "Merhaba izleyiciler!" },
        { scene: 2, duration: "5-20s", description: "Sorun tanımı", script: "Bugün size şunu göstereceğim..." },
        { scene: 3, duration: "20-40s", description: "Çözüm sunumu", script: "Çözüm çok basit aslında..." },
        { scene: 4, duration: "40-80s", description: "Detaylı açıklama", script: "Adım adım yapıyoruz..." },
        { scene: 5, duration: "80-100s", description: "Momentum artışı", script: "İşte en heyecan verici kısım!" },
        { scene: 6, duration: "100s+", description: "Kapanış ve CTA", script: "Yorumlarda bana yazın!" },
      ]);

      setIsLoading(false);
    } catch (error) {
      Alert.alert("Hata", "Hata: " + (error as Error).message);
      setIsLoading(false);
    }
  };

  const renderResult = ({ item }: { item: AnalysisResult }) => (
    <View className="mb-3 p-3 bg-surface rounded-lg border border-border">
      <View className="flex-row justify-between mb-1">
        <Text className="font-semibold text-foreground">Sahne {item.scene}</Text>
        <Text className="text-xs text-muted">{item.duration}</Text>
      </View>
      <Text className="text-sm text-muted mb-1">{item.description}</Text>
      <Text className="text-xs text-foreground italic">&quot;{item.script}&quot;</Text>
    </View>
  );

  return (
    <ScreenContainer className="p-4">
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text className="text-2xl font-bold text-foreground mb-4">📹 Video Analizi</Text>

        {/* API Status */}
        <View className="mb-4 p-3 rounded-lg" style={{ backgroundColor: youtubeApiKey ? colors.success : colors.warning }}>
          <Text className="text-xs font-semibold text-background">
            {youtubeApiKey ? "✅ YouTube API Bağlı" : "⚠️ YouTube API Anahtarı Gerekli"}
          </Text>
        </View>

        {/* URL Input */}
        <View className="mb-4">
          <Text className="text-sm text-muted mb-2">YouTube URL</Text>
          <TextInput
            placeholder="https://youtube.com/watch?v=... veya youtu.be/..."
            value={url}
            onChangeText={setUrl}
            className="p-3 bg-surface border border-border rounded-lg text-foreground mb-3"
            placeholderTextColor={colors.muted}
          />
          <Text className="text-xs text-muted">Desteklenen: watch, youtu.be, live, embed</Text>
        </View>

        {/* Analyze Button */}
        <TouchableOpacity
          onPress={handleAnalyze}
          disabled={isLoading}
          className={`p-4 rounded-lg mb-4 ${isLoading ? "opacity-50" : ""}`}
          style={{ backgroundColor: colors.primary }}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text className="text-center text-background font-semibold">🚀 Analiz Et</Text>
          )}
        </TouchableOpacity>

        {/* Video Info */}
        {videoInfo && (
          <View className="mb-4 p-4 bg-surface rounded-lg border border-border">
            <Text className="text-base font-semibold text-foreground mb-2">{videoInfo.title}</Text>
            <Text className="text-sm text-muted">📺 {videoInfo.channel}</Text>
            <Text className="text-xs text-muted mt-1">ID: {videoInfo.id}</Text>
          </View>
        )}

        {/* Results */}
        {results.length > 0 && (
          <View>
            <Text className="text-lg font-semibold text-foreground mb-3">📊 Analiz Sonuçları</Text>
            <FlatList
              data={results}
              renderItem={renderResult}
              keyExtractor={(item) => item.scene.toString()}
              scrollEnabled={false}
            />

            {/* Export Buttons */}
            <View className="flex-row gap-2 mt-4">
              <TouchableOpacity className="flex-1 p-3 rounded-lg" style={{ backgroundColor: colors.primary }}>
                <Text className="text-center text-background font-semibold text-sm">📄 PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 p-3 rounded-lg" style={{ backgroundColor: colors.primary }}>
                <Text className="text-center text-background font-semibold text-sm">📦 ZIP</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {results.length === 0 && !isLoading && (
          <View className="items-center py-8">
            <Text className="text-muted text-sm">Analiz sonuçları burada görüntülenecek</Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
