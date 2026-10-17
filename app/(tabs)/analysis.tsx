import {
  ScrollView,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
  Dimensions,
  Linking,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { Bars, Card, ScreenHeader, SplitBar, WordCloud } from "@/components/nv";
import { forecastViews, sentiment, topKeywords } from "@/lib/insights";
import { fetchVideoComments, fetchVideoExtras } from "@/lib/youtube-extras";
import { bumpUsage } from "@/lib/usage";
import { useState, useEffect, useCallback } from "react";
import { useColors } from "@/hooks/use-colors";
import {
  loadYoutubeApiKey,
  fetchVideoData,
  fetchVideoStatistics,
  extractVideoId,
} from "@/lib/youtube-api";
import {
  loadGeminiApiKey,
  analyzeScenesWithGemini,
} from "@/lib/gemini-api";
import { sharePDF, shareZIPReport, type ReportData } from "@/lib/report-service";
import { LineChart } from "react-native-chart-kit";

interface AnalysisResult {
  scene: number;
  duration: string;
  description: string;
  script: string;
  intensity?: number;
}

interface VideoStats {
  views: number;
  likes: number;
  comments: number;
  engagementRate: string;
}

const screenWidth = Dimensions.get("window").width - 48; // 48 = padding (16*2) + margin

export default function HomeScreen() {
  const colors = useColors();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [videoInfo, setVideoInfo] = useState<{
    id: string;
    title: string;
    channel: string;
  } | null>(null);
  const [videoStats, setVideoStats] = useState<VideoStats | null>(null);
  const [mood, setMood] = useState<{ positive: number; neutral: number; negative: number; n: number } | null>(null);
  const [keywords, setKeywords] = useState<{ word: string; count: number }[]>([]);
  const [youtubeApiKey, setYoutubeApiKey] = useState<string | null>(null);
  const [geminiApiKey, setGeminiApiKey] = useState<string | null>(null);

  // Load API keys on mount
  useEffect(() => {
    const loadKeys = async () => {
      try {
        const [ytKey, gmKey] = await Promise.all([
          loadYoutubeApiKey(),
          loadGeminiApiKey(),
        ]);
        setYoutubeApiKey(ytKey);
        setGeminiApiKey(gmKey);
      } catch (error) {
        console.error("API key'ler yüklenemedi:", error);
      }
    };
    loadKeys();
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!url.trim()) {
      Alert.alert("Hata", "Lütfen bir YouTube URL'si girin.");
      return;
    }

    setIsLoading(true);
    setResults([]);
    setVideoInfo(null);
    setVideoStats(null);
    setMood(null);
    setKeywords([]);

    try {
      const videoId = extractVideoId(url);
      if (!videoId) {
        Alert.alert(
          "Hata",
          "Geçersiz YouTube URL'si. Desteklenen formatlar:\n- youtube.com/watch?v=...\n- youtu.be/...\n- youtube.com/live/...\n- youtube.com/embed/..."
        );
        setIsLoading(false);
        return;
      }

      // Fetch video data
      let videoTitle = "Video Başlığı (Mock)";
      let videoChannel = "Kanal Adı (Mock)";

      try {
        const videoData = await fetchVideoData(videoId, youtubeApiKey);
        if (videoData) {
          videoTitle = videoData.title;
          videoChannel = videoData.channel;
        }
      } catch (apiError) {
        console.error("YouTube API hatası:", apiError);
      }

      // Fetch video statistics
      let stats: VideoStats | null = null;
      try {
        const rawStats = await fetchVideoStatistics(videoId, youtubeApiKey);
        if (rawStats) {
          const engagementRate =
            rawStats.views > 0
              ? (
                  ((rawStats.likes + rawStats.comments) / rawStats.views) *
                  100
                ).toFixed(2)
              : "0.00";
          stats = { ...rawStats, engagementRate };
        }
      } catch {
        // Stats are optional
      }

      setVideoInfo({ id: videoId, title: videoTitle, channel: videoChannel });
      if (stats) setVideoStats(stats);

      // Yorum duyarlılığı ve anahtar kelimeler (API anahtarı yoksa atlanır)
      try {
        const [comments, extras] = await Promise.all([
          fetchVideoComments(videoId, youtubeApiKey),
          fetchVideoExtras(videoId, youtubeApiKey),
        ]);
        if (comments.length) setMood({ ...sentiment(comments), n: comments.length });
        const words = topKeywords([videoTitle, ...(extras?.tags ?? []), ...comments], 14);
        if (words.length) setKeywords(words);
      } catch {
        // ek analizler opsiyonel
      }
      bumpUsage("analyses");

      // Try Gemini AI analysis if key is available
      let scenes: AnalysisResult[] | null = null;
      if (geminiApiKey) {
        try {
          const aiScenes = await analyzeScenesWithGemini(
            geminiApiKey,
            videoTitle,
            "",
            "0:00"
          );
          scenes = aiScenes.map((s) => ({
            ...s,
            intensity: Math.min(10, Math.max(1, s.scene * 1.5 + 2)),
          }));
        } catch (geminiError) {
          console.error("Gemini hatası, mock kullanılıyor:", geminiError);
        }
      }

      // Fallback to mock data
      setResults(
        scenes || [
          {
            scene: 1,
            duration: "0-5s",
            description: "Giriş ve kanca - izleyiciyi yakala",
            script: "Merhaba izleyiciler! Bugün sizlerle çok özel bir konuyu ele alacağız.",
            intensity: 3,
          },
          {
            scene: 2,
            duration: "5-20s",
            description: "Sorun tanımı - izleyicinin problemini ortaya koy",
            script: "Çoğu insan bu konuda aynı hatayı yapıyor. Peki doğrusu ne?",
            intensity: 4,
          },
          {
            scene: 3,
            duration: "20-40s",
            description: "Çözüm sunumu - ana çözümü tanıt",
            script: "Çözüm aslında çok basit. İşte adım adım yapmanız gerekenler...",
            intensity: 6,
          },
          {
            scene: 4,
            duration: "40-80s",
            description: "Detaylı açıklama - derinlemesine incele",
            script: "Şimdi biraz daha derine inelim. Bu noktada dikkat etmeniz gereken şey...",
            intensity: 7,
          },
          {
            scene: 5,
            duration: "80-100s",
            description: "Momentum artışı - heyecanı zirveye taşı",
            script: "İşte en heyecan verici kısma geldik! Bu aşamada her şey değişiyor.",
            intensity: 9,
          },
          {
            scene: 6,
            duration: "100s+",
            description: "Kapanış ve CTA - harekete geçir",
            script: "Umarım bu video sizin için faydalı olmuştur. Yorumlarda ne düşündüğünüzü yazın!",
            intensity: 5,
          },
        ]
      );

      setIsLoading(false);
    } catch (error) {
      Alert.alert("Hata", "Hata: " + (error as Error).message);
      setIsLoading(false);
    }
  }, [url, youtubeApiKey, geminiApiKey]);

  const handleExportPDF = useCallback(async () => {
    if (!videoInfo || results.length === 0) return;

    setIsExporting(true);
    try {
      const reportData: ReportData = {
        title: videoInfo.title,
        channel: videoInfo.channel,
        views: videoStats?.views || 0,
        likes: videoStats?.likes || 0,
        engagementRate: videoStats?.engagementRate || "0.00",
        scenes: results.map((r) => ({
          scene: r.scene,
          duration: r.duration,
          description: r.description,
          script: r.script,
        })),
      };
      await sharePDF(reportData);
    } catch (error) {
      Alert.alert("Hata", "PDF oluşturulamadı");
    }
    setIsExporting(false);
  }, [videoInfo, results, videoStats]);

  const handleExportZIP = useCallback(async () => {
    if (!videoInfo || results.length === 0) return;

    setIsExporting(true);
    try {
      const reportData: ReportData = {
        title: videoInfo.title,
        channel: videoInfo.channel,
        views: videoStats?.views || 0,
        likes: videoStats?.likes || 0,
        engagementRate: videoStats?.engagementRate || "0.00",
        scenes: results.map((r) => ({
          scene: r.scene,
          duration: r.duration,
          description: r.description,
          script: r.script,
        })),
      };
      await shareZIPReport(reportData);
    } catch (error) {
      Alert.alert("Hata", "Dışa aktarma başarısız");
    }
    setIsExporting(false);
  }, [videoInfo, results, videoStats]);

  const renderResult = ({ item }: { item: AnalysisResult }) => (
    <View className="mb-3 p-3 bg-surface rounded-lg border border-border">
      <View className="flex-row justify-between mb-1">
        <Text className="font-semibold text-foreground">Sahne {item.scene}</Text>
        <Text className="text-xs text-muted">{item.duration}</Text>
      </View>
      <Text className="text-sm text-muted mb-1">{item.description}</Text>
      <Text className="text-xs text-foreground italic">
        &ldquo;{item.script}&rdquo;
      </Text>
      {item.intensity && (
        <View className="mt-2 flex-row items-center gap-1">
          <Text className="text-[10px] text-muted">Yoğunluk:</Text>
          <View className="flex-row gap-0.5">
            {Array.from({ length: 10 }, (_, i) => (
              <View
                key={i}
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor:
                    i < item.intensity! ? colors.primary : colors.border,
                }}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );

  // Chart data
  const chartData = {
    labels: ["Giriş", "Sorun", "Çözüm", "Detay", "Momentum", "Kapanış"],
    datasets: [
      {
        data:
          results.length > 0
            ? results.map((r) => r.intensity || 5)
            : [0],
        color: () => colors.primary,
        strokeWidth: 2,
      },
    ],
  };

  const chartConfig = {
    backgroundColor: colors.surface,
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 0,
    color: () => colors.primary,
    labelColor: () => colors.muted,
    propsForDots: {
      r: "5",
      strokeWidth: "2",
      stroke: colors.primary,
    },
    propsForBackgroundLines: {
      strokeDasharray: "3",
      stroke: colors.border,
    },
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Video Analizi" />

        {/* API Status */}
        <View className="flex-row gap-2 mb-4">
          <View
            className="flex-1 p-2 rounded-lg"
            style={{
              backgroundColor: youtubeApiKey ? "rgba(52,211,153,0.16)" : "rgba(251,191,36,0.16)",
              borderWidth: 1,
              borderColor: youtubeApiKey ? "rgba(52,211,153,0.5)" : "rgba(251,191,36,0.5)",
            }}
          >
            <Text className="text-xs font-semibold text-foreground text-center">
              {youtubeApiKey ? "✅ YouTube API" : "⚠️ YouTube Key Gerekli"}
            </Text>
          </View>
          <View
            className="flex-1 p-2 rounded-lg"
            style={{
              backgroundColor: geminiApiKey ? "rgba(52,211,153,0.16)" : "rgba(251,191,36,0.16)",
              borderWidth: 1,
              borderColor: geminiApiKey ? "rgba(52,211,153,0.5)" : "rgba(251,191,36,0.5)",
            }}
          >
            <Text className="text-xs font-semibold text-foreground text-center">
              {geminiApiKey ? "✅ Gemini AI" : "⚠️ Gemini Key Opsiyonel"}
            </Text>
          </View>
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
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text className="text-xs text-muted">
            Desteklenen: watch, youtu.be, live, embed
          </Text>
        </View>

        {/* Analyze Button */}
        <TouchableOpacity
          onPress={handleAnalyze}
          disabled={isLoading}
          className={`p-4 rounded-lg mb-4 ${
            isLoading ? "opacity-50" : ""
          }`}
          style={{ backgroundColor: colors.primary }}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-center text-white font-semibold">
              🚀 Analiz Et
            </Text>
          )}
        </TouchableOpacity>

        {/* Video Info */}
        {videoInfo && (
          <View className="mb-4 p-4 bg-surface rounded-lg border border-border">
            <Text className="text-base font-semibold text-foreground mb-2">
              {videoInfo.title}
            </Text>
            <Text className="text-sm text-muted">📺 {videoInfo.channel}</Text>
            <Text className="text-xs text-muted mt-1">ID: {videoInfo.id}</Text>
          </View>
        )}

        {/* Video Statistics */}
        {videoStats && (
          <View className="mb-4 p-4 bg-surface rounded-lg border border-border">
            <Text className="text-base font-semibold text-foreground mb-3">
              📊 Video İstatistikleri
            </Text>
            <View className="flex-row flex-wrap gap-3">
              <View className="flex-1 min-w-[80px] items-center p-3 bg-background rounded-lg">
                <Text className="text-lg font-bold text-foreground">
                  {videoStats.views >= 1000000
                    ? (videoStats.views / 1000000).toFixed(1) + "M"
                    : videoStats.views >= 1000
                    ? (videoStats.views / 1000).toFixed(1) + "K"
                    : videoStats.views.toLocaleString()}
                </Text>
                <Text className="text-[10px] text-muted mt-1">Görüntülenme</Text>
              </View>
              <View className="flex-1 min-w-[80px] items-center p-3 bg-background rounded-lg">
                <Text className="text-lg font-bold text-foreground">
                  {videoStats.likes >= 1000
                    ? (videoStats.likes / 1000).toFixed(1) + "K"
                    : videoStats.likes.toLocaleString()}
                </Text>
                <Text className="text-[10px] text-muted mt-1">Beğeni</Text>
              </View>
              <View className="flex-1 min-w-[80px] items-center p-3 bg-background rounded-lg">
                <Text className="text-lg font-bold text-foreground">
                  {videoStats.comments >= 1000
                    ? (videoStats.comments / 1000).toFixed(1) + "K"
                    : videoStats.comments.toLocaleString()}
                </Text>
                <Text className="text-[10px] text-muted mt-1">Yorum</Text>
              </View>
              <View className="flex-1 min-w-[80px] items-center p-3 bg-background rounded-lg">
                <Text className="text-lg font-bold text-foreground">
                  %{videoStats.engagementRate}
                </Text>
                <Text className="text-[10px] text-muted mt-1">Etkileşim</Text>
              </View>
            </View>
          </View>
        )}

        {videoStats && (
          <Card title="Görüntülenme Tahmini" hint="basit büyüme modeli">
            <Bars
              data={forecastViews(videoStats.views, parseFloat(videoStats.engagementRate))}
              labels={["Şimdi", "+1", "+2", "+3", "+4", "+5"]}
              highlightFrom={1}
            />
          </Card>
        )}

        {mood && (
          <Card title="Yorum Analizi" hint={`${mood.n} yorum · anahtar kelime tabanlı`}>
            <SplitBar positive={mood.positive} negative={mood.negative} />
            <View className="flex-row justify-between mt-2">
              <Text style={{ color: colors.success, fontSize: 12 }}>Olumlu %{mood.positive}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Nötr %{mood.neutral}</Text>
              <Text style={{ color: colors.error, fontSize: 12 }}>Olumsuz %{mood.negative}</Text>
            </View>
          </Card>
        )}

        {keywords.length > 0 && (
          <Card title="Anahtar Kelime Performansı">
            <WordCloud words={keywords} />
          </Card>
        )}

        {/* Results */}
        {results.length > 0 && (
          <View>
            <Text className="text-lg font-semibold text-foreground mb-3">
              🎞️ Sahne Analizi
            </Text>

            {/* Intensity/Progression Chart */}
            <View className="mb-4 p-3 bg-surface rounded-lg border border-border">
              <Text className="text-sm font-semibold text-foreground mb-3 text-center">
                📈 Yoğunluk / İlerleme Grafiği
              </Text>
              {results.length > 0 && (
                <LineChart
                  data={chartData}
                  width={screenWidth - 24}
                  height={180}
                  chartConfig={chartConfig}
                  bezier
                  style={{ borderRadius: 8 }}
                  withVerticalLabels={true}
                  withHorizontalLabels={true}
                  withInnerLines={true}
                  withOuterLines={true}
                  fromZero
                />
              )}
              <View className="flex-row justify-around mt-2">
                {results.map((r) => (
                  <Text key={r.scene} className="text-[10px] text-muted">
                    S{r.scene}
                  </Text>
                ))}
              </View>
            </View>

            <FlatList
              data={results}
              renderItem={renderResult}
              keyExtractor={(item) => item.scene.toString()}
              scrollEnabled={false}
            />

            {/* Export Buttons */}
            <View className="flex-row gap-2 mt-4 mb-4">
              <TouchableOpacity
                onPress={handleExportPDF}
                disabled={isExporting}
                className="flex-1 p-3 rounded-lg flex-row justify-center items-center gap-1"
                style={{
                  backgroundColor: colors.primary,
                  opacity: isExporting ? 0.5 : 1,
                }}
              >
                {isExporting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text className="text-white font-semibold text-sm">
                      📄 PDF İndir
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleExportZIP}
                disabled={isExporting}
                className="flex-1 p-3 rounded-lg flex-row justify-center items-center gap-1"
                style={{
                  backgroundColor: colors.primary,
                  opacity: isExporting ? 0.5 : 1,
                }}
              >
                {isExporting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-white font-semibold text-sm">
                    📦 ZIP + JSON
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {results.length === 0 && !isLoading && (
          <View className="items-center py-8">
            <Text className="text-muted text-sm">
              Analiz sonuçları burada görüntülenecek
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
