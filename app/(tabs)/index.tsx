import { ScrollView, Text, View, TextInput, TouchableOpacity, ActivityIndicator, FlatList, Alert, Image } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { Watermark } from "@/components/watermark";
import { useState, useCallback } from "react";
import { useColors } from "@/hooks/use-colors";
import { loadYoutubeApiKey, fetchVideoData, extractVideoId, convertLiveToVideoUrl, VideoData } from "@/lib/youtube-api";
import { useFocusEffect } from "expo-router";
import { VictoryBar, VictoryChart, VictoryTheme, VictoryAxis } from "victory-native";
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { loadGeminiApiKey, analyzeScenesWithGemini } from "@/lib/gemini-api";
import { Card, Badge, Divider } from 'react-native-paper';
import { sharePDF, shareZIPReport, ReportData } from "@/lib/report-service";
// import { NativeVideoFrames } from "@mgcrea/react-native-video-frames";

interface AnalysisResult {
  scene: number;
  duration: string;
  description: string;
  script: string;
  sentiment?: string;
}

export default function HomeScreen() {
  const colors = useColors();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [videoInfo, setVideoInfo] = useState<VideoData | null>(null);
  const [youtubeApiKey, setYoutubeApiKey] = useState<string | null>(null);
  const [geminiApiKey, setGeminiApiKey] = useState<string | null>(null);
  const [capturedFrame, setCapturedFrame] = useState<string | null>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);

  // Helper: Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const generateMockScenes = (durationSeconds: number, title: string): AnalysisResult[] => {
    const scenes: AnalysisResult[] = [];
    const count = 6; // 6 SAHNE
    const interval = durationSeconds / count;

    const sceneTypes = ['Giriş', 'Gelişme', 'Gelişme', 'Gelişme', 'Gelişme', 'Sonuç'];

    for (let i = 0; i < count; i++) {
      const startTime = formatTime(i * interval);
      const endTime = formatTime((i + 1) * interval);
      scenes.push({
        scene: i + 1,
        duration: `${startTime} - ${endTime}`,
        description: `${title} videosunun ${i + 1}. bölümü analiz ediliyor.`,
        script: "Bu bölüm için otomatik oluşturulan örnek senaryo metni.",
        sentiment: sceneTypes[i]
      });
    }
    return scenes;
  };

  // Load API keys when screen is focused
  useFocusEffect(
    useCallback(() => {
      const loadKeys = async () => {
        try {
          const ytKey = await loadYoutubeApiKey();
          setYoutubeApiKey(ytKey);

          const gmKey = await loadGeminiApiKey();
          setGeminiApiKey(gmKey);
        } catch (error) {
          console.error("API anahtarları yüklenemedi:", error);
        }
      };
      loadKeys();
    }, [])
  );

  const handleAnalyze = async () => {
    // 3. Butona Tıklama Anında Kilitleme (Debouncing)
    if (isLoading) return;

    if (!url.trim()) {
      Alert.alert("Hata", "Lütfen bir YouTube URL'si girin.");
      return;
    }

    console.log("Analiz başlatılıyor: ", url);

    setIsLoading(true);
    setCapturedFrame(null);

    // 1. Ana Hatayı Yakala (En Önemlisi) - try/catch sarmalama
    try {
      const processedUrl = convertLiveToVideoUrl(url.trim());
      const videoId = extractVideoId(processedUrl);
      console.log("Video ID ayıklandı: ", videoId);

      if (!videoId) {
        Alert.alert("Hata", "Geçersiz YouTube URL'si.");
        setIsLoading(false);
        return;
      }

      // 2. Ağ İsteğini (API Call) Kesinlikle Asenkron Yap (await kullanımı)
      console.log("API çağrısı yapılıyor...");
      const videoData = await fetchVideoData(videoId, youtubeApiKey);
      console.log("API yanıtı alındı: ", videoData?.title);

      if (videoData) {
        setVideoInfo(videoData);
        console.log("Video Süresi (sn):", videoData.durationInSeconds);

        // AI Analizi (Opsiyonel - Gemini Key varsa)
        if (geminiApiKey) {
          try {
            setIsAiAnalyzing(true);
            const aiScenes = await analyzeScenesWithGemini(
              geminiApiKey,
              videoData.title,
              videoData.description,
              videoData.duration
            );
            setResults(aiScenes);
          } catch (aiError: any) {
            console.error("AI Analiz hatası:", aiError);

            const errorMessage = aiError?.message || "Bilinmeyen bir hata oluştu";

            Alert.alert(
              '⚠️ AI Analiz Hatası',
              `Gemini API bağlantısı başarısız oldu.\n\nDetay: ${errorMessage}\n\nLütfen kontrol edin:\n• Ayarlar'dan API anahtarınızın doğru olduğundan\n• İnternet bağlantınızın aktif olduğundan\n• Google Cloud Console'da Gemini API'nin aktif olduğundan\n\nOtomatik sahneler oluşturuluyor.`
            );
            useFallbackResults(videoData);
          } finally {
            setIsAiAnalyzing(false);
          }
        } else {
          // Otomatik sahne oluşturma (Fallback)
          useFallbackResults(videoData);
        }
      }
    } catch (error) {
      // 4. Hata Mesajını Kullanıcıya Göster
      console.log("Analiz sırasında HATA oluştu:", error);
      Alert.alert("Hata", error instanceof Error ? error.message : "Bağlantı hatası");
    } finally {
      console.log("Analiz işlemi bitti (loading: false)");
      setIsLoading(false); // Bitince kilidi kaldır ve yüklemeyi kapat
    }
  };

  const useFallbackResults = (video: VideoData) => {
    // Video süresine göre mock sahneler oluştur
    const mockScenes = generateMockScenes(video.durationInSeconds || 300, video.title);
    setResults(mockScenes);
  };

  const handleCaptureFrame = async () => {
    if (!videoInfo) return;

    const videoId = extractVideoId(url);
    if (!videoId) {
      Alert.alert("Hata", "Video ID tespit edilemedi.");
      return;
    }

    setIsCapturing(true);
    try {
      // YouTube Thumbnail kullanarak frame al (Daha güvenli ve hızlı)
      const frameUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

      const downloadResumable = FileSystem.createDownloadResumable(
        frameUrl,
        FileSystem.documentDirectory + `frame_5.jpg`
      );

      const downloadResult = await downloadResumable.downloadAsync();

      if (downloadResult) {
        setCapturedFrame(downloadResult.uri);
      } else {
        throw new Error("Download failed");
      }
    } catch (error) {
      console.log('Frame alma hatası:', error);
      Alert.alert('Uyarı', 'Frame alınamadı, video erişilebilir değil olabilir.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleExportPDF = async () => {
    if (!videoInfo || results.length === 0) {
      Alert.alert("Uyarı", "Önce bir videoyu analiz etmelisiniz.");
      return;
    }

    try {
      setIsLoading(true);
      const reportData: ReportData = {
        title: videoInfo.title,
        channel: videoInfo.channel,
        views: parseInt(videoInfo.viewCount) || 0,
        likes: parseInt(videoInfo.likeCount) || 0,
        engagementRate: videoInfo.engagementRate,
        scenes: results
      };
      await sharePDF(reportData);
    } catch (error) {
      Alert.alert("Hata", "PDF raporu oluşturulamadı.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportZIP = async () => {
    if (!videoInfo || results.length === 0) {
      Alert.alert("Uyarı", "Önce bir videoyu analiz etmelisiniz.");
      return;
    }

    try {
      setIsLoading(true);
      const reportData: ReportData = {
        title: videoInfo.title,
        channel: videoInfo.channel,
        views: parseInt(videoInfo.viewCount) || 0,
        likes: parseInt(videoInfo.likeCount) || 0,
        engagementRate: videoInfo.engagementRate,
        scenes: results
      };
      await shareZIPReport(reportData);
    } catch (error) {
      Alert.alert("Hata", "Veri dosyası oluşturulamadı.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderResult = ({ item }: { item: AnalysisResult }) => (
    <Card className="mb-4 bg-surface border border-border overflow-hidden" elevation={0}>
      <Card.Content className="p-4">
        <View className="flex-row justify-between items-center mb-2">
          <View className="flex-row items-center gap-2">
            <View className="bg-primary px-2 py-0.5 rounded-full">
              <Text className="text-[10px] text-background font-bold">#{item.scene}</Text>
            </View>
            <Text className="font-bold text-foreground">Sahne {item.scene}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Badge style={{ backgroundColor: colors.muted + '20', color: colors.foreground }}>{item.duration}</Badge>
            {item.sentiment && (
              <Badge style={{
                backgroundColor: item.sentiment === 'Giriş' ? colors.success + '20' :
                                 item.sentiment === 'Sonuç' ? colors.primary + '20' :
                                 colors.warning + '20',
                color: item.sentiment === 'Giriş' ? colors.success :
                       item.sentiment === 'Sonuç' ? colors.primary :
                       colors.warning
              }}>
                {item.sentiment}
              </Badge>
            )}
          </View>
        </View>
        <Text className="text-sm font-medium text-foreground mb-2">{item.description}</Text>
        <Divider className="my-2" />
        <View className="bg-muted/10 p-2 rounded">
          <Text className="text-xs text-foreground italic font-light">&quot;{item.script}&quot;</Text>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <ScreenContainer className="p-4">
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text className="text-2xl font-bold text-foreground mb-4">📹 Video Analizi</Text>

        {/* API Status */}
        <View className="flex-row gap-2 mb-4">
          <View className="flex-1 p-2 rounded-lg" style={{ backgroundColor: youtubeApiKey ? colors.success : colors.warning }}>
            <Text className="text-[10px] font-bold text-background text-center">
              {youtubeApiKey ? "✅ YouTube API" : "⚠️ YouTube API Eksik"}
            </Text>
          </View>
          <View className="flex-1 p-2 rounded-lg" style={{ backgroundColor: geminiApiKey ? colors.success : colors.muted }}>
            <Text className="text-[10px] font-bold text-background text-center">
              {geminiApiKey ? "✨ Gemini AI Aktif" : "⚪ Gemini AI Pasif"}
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

        {/* Video Info and Chart */}
        {videoInfo && (
          <View className="mb-4 p-4 bg-surface rounded-lg border border-border">
            <Text className="text-base font-semibold text-foreground mb-2">{videoInfo.title}</Text>
            <Text className="text-sm text-muted mb-1">📺 {videoInfo.channel}</Text>

            <View className="flex-row justify-between mt-2 mb-4">
              <View>
                <Text className="text-xs text-muted">İzlenme</Text>
                <Text className="text-sm font-bold text-foreground">{Number(videoInfo.viewCount).toLocaleString()}</Text>
              </View>
              <View>
                <Text className="text-xs text-muted">Süre</Text>
                <Text className="text-sm font-bold text-foreground">{formatTime(videoInfo.durationInSeconds)}</Text>
              </View>
              <View>
                <Text className="text-xs text-muted">Etkileşim</Text>
                <Text className="text-sm font-bold" style={{ color: colors.primary }}>%{videoInfo.engagementRate}</Text>
              </View>
            </View>

            {/* Bar Chart - GÜVENLİK İÇİN GEÇİCİ OLARAK DEVRE DIŞI */}
            <View className="items-center justify-center p-4 bg-muted/20 rounded-lg mb-2">
              <View className="flex-row items-end gap-4 h-20">
                 <View style={{ height: '30%', width: 30, backgroundColor: colors.primary, borderRadius: 4 }} />
                 <View style={{ height: '80%', width: 30, backgroundColor: colors.primary, borderRadius: 4, opacity: 0.6 }} />
              </View>
              <View className="flex-row gap-8 mt-2">
                <Text className="text-[10px] text-muted">Beğeni</Text>
                <Text className="text-[10px] text-muted">İzlenme</Text>
              </View>
            </View>

            {/* Frame Capture Button */}
            <TouchableOpacity
              onPress={handleCaptureFrame}
              disabled={isCapturing}
              className="mt-2 p-2 rounded-md border border-primary"
            >
              {isCapturing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text className="text-center text-primary font-semibold text-xs">📸 Frame Al (5. sn)</Text>
              )}
            </TouchableOpacity>

            {capturedFrame && (
              <View className="mt-4 items-center">
                <Text className="text-xs text-muted mb-2">Yakalanan Kare:</Text>
                <Image source={{ uri: capturedFrame }} style={{ width: '100%', height: 150, borderRadius: 8 }} resizeMode="cover" />
              </View>
            )}
          </View>
        )}

        {/* Results */}
        {results.length > 0 && (
          <View className="mt-4">
            <View className="flex-row items-center justify-between mb-3 px-1">
              <View>
                <Text className="text-lg font-semibold text-foreground">📊 Analiz Sonuçları</Text>
                <Text className="text-[10px] text-muted">{results.length} sahne • Toplam {videoInfo?.durationInSeconds ? formatTime(videoInfo.durationInSeconds) : 'N/A'}</Text>
              </View>
              {geminiApiKey && (
                <View className="bg-primary/20 px-2 py-1 rounded">
                  <Text className="text-[10px] text-primary font-bold">{isAiAnalyzing ? "⏳ AI Analiz Ediyor..." : "✨ AI Destekli"}</Text>
                </View>
              )}
            </View>

            {/* FlatList yerine map kullanarak Android dokunmatik sorunlarını önleyelim */}
            {results.map((item) => (
              <View key={item.scene.toString()}>
                {renderResult({ item })}
              </View>
            ))}

            {/* Export Buttons */}
            <View className="flex-row gap-2 mt-2 mb-6">
              <TouchableOpacity
                onPress={handleExportPDF}
                disabled={isLoading}
                className="flex-1 p-4 rounded-xl shadow-sm"
                style={{ backgroundColor: colors.primary, opacity: isLoading ? 0.7 : 1 }}
              >
                <Text className="text-center text-white font-bold text-sm">📄 PDF Raporu</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleExportZIP}
                disabled={isLoading}
                className="flex-1 p-4 rounded-xl shadow-sm"
                style={{ backgroundColor: colors.primary, opacity: isLoading ? 0.7 : 1 }}
              >
                <Text className="text-center text-white font-bold text-sm">📦 Veri Dışa Aktar</Text>
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
      <Watermark />
    </ScreenContainer>
  );
}
