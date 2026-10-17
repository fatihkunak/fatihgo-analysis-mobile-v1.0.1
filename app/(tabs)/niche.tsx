import {
  ScrollView,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Linking,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { Card, Chip, SampleBadge, ScreenHeader, Sparkline } from "@/components/nv";
import { CATEGORIES, RISING_NICHES } from "@/lib/insights";
import { bumpUsage } from "@/lib/usage";
import { useState, useEffect, useCallback } from "react";
import { useColors } from "@/hooks/use-colors";
import {
  loadYoutubeApiKey,
  searchNicheChannels,
  type ChannelSearchResult,
} from "@/lib/youtube-api";

const AGE_OPTIONS = [
  { label: "30 gün", value: "30" },
  { label: "90 gün", value: "90" },
  { label: "180 gün", value: "180" },
  { label: "365 gün", value: "365" },
  { label: "Tümü", value: "0" },
];

export default function NicheScreen() {
  const colors = useColors();
  const [query, setQuery] = useState("");
  const [ageDays, setAgeDays] = useState("180");
  const [ageDropdownOpen, setAgeDropdownOpen] = useState(false);
  const [minSubs, setMinSubs] = useState("100");
  const [maxSubs, setMaxSubs] = useState("50000");
  const [outlierThreshold, setOutlierThreshold] = useState("300");
  const [maxResults, setMaxResults] = useState("20");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ChannelSearchResult[]>([]);
  const [youtubeApiKey, setYoutubeApiKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const params = useLocalSearchParams<{ q?: string }>();

  // Pano'dan gelen konu başlığını arama kutusuna yaz
  useEffect(() => {
    if (params.q) setQuery(String(params.q));
  }, [params.q]);

  // Load YouTube API key
  useEffect(() => {
    loadYoutubeApiKey().then(setYoutubeApiKey).catch(console.error);
  }, []);

  const handleScan = useCallback(async () => {
    if (!query.trim()) {
      Alert.alert("Uyarı", "Lütfen bir arama terimi girin.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let results: ChannelSearchResult[] = [];

      if (youtubeApiKey) {
        try {
          results = await searchNicheChannels(
            query,
            youtubeApiKey,
            parseInt(maxResults, 10) || 20
          );
        } catch (apiError) {
          console.error("API Hatası:", apiError);
          setError(
            "YouTube API hatası: " + (apiError as Error).message
          );
        }
      }

      // If no API results, use mock data
      if (results.length === 0) {
        if (!youtubeApiKey) {
          setError(
            "YouTube API anahtarı bulunamadı. Mock veriler kullanılıyor."
          );
        }

        const mockResults: ChannelSearchResult[] = [
          {
            id: "UCabc123",
            channelName: "Örnek Kanal 1",
            subs: 15000,
            views: 500000,
            age: 365,
            ratio: 3.0,
            isOutlier: false,
            videoId: "dQw4w9WgXcQ",
            videoTitle: "Örnek Video Başlığı 1",
          },
          {
            id: "UCdef456",
            channelName: "Örnek Kanal 2",
            subs: 2500,
            views: 1200000,
            age: 180,
            ratio: 48.0,
            isOutlier: true,
            videoId: "jNQXAC9IVRw",
            videoTitle: "Örnek Video Başlığı 2",
          },
          {
            id: "UCghi789",
            channelName: "Örnek Kanal 3",
            subs: 50000,
            views: 800000,
            age: 730,
            ratio: 1.6,
            isOutlier: false,
            videoId: "9bZkp7q19f0",
            videoTitle: "Örnek Video Başlığı 3",
          },
        ];

        results = mockResults;
      }

      // Apply filters
      const minSubsNum = parseInt(minSubs, 10) || 0;
      const maxSubsNum = parseInt(maxSubs, 10) || 999999999;
      const outlierVal = parseInt(outlierThreshold, 10) || 300;
      const ageVal = parseInt(ageDays, 10) || 0;

      const filtered = results.filter((r) => {
        if (ageVal > 0 && r.age > ageVal) return false;
        if (r.subs < minSubsNum || r.subs > maxSubsNum) return false;
        return true;
      });

      // Mark outliers based on threshold
      const tagged = filtered.map((r) => ({
        ...r,
        isOutlier: r.ratio > outlierVal,
      }));

      // Sort by ratio descending
      tagged.sort((a, b) => b.ratio - a.ratio);

      setResults(tagged);
      bumpUsage("scans");
      setIsLoading(false);
    } catch (error) {
      Alert.alert("Hata", (error as Error).message);
      setIsLoading(false);
    }
  }, [query, ageDays, minSubs, maxSubs, outlierThreshold, maxResults, youtubeApiKey]);

  const openVideo = useCallback((videoId: string) => {
    if (videoId) {
      Linking.openURL(`https://www.youtube.com/watch?v=${videoId}`);
    }
  }, []);

  const renderResult = ({ item }: { item: ChannelSearchResult }) => (
    <View className="mb-3 p-4 bg-surface rounded-lg border border-border">
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-base font-semibold text-foreground flex-1 mr-2">
          {item.channelName}
        </Text>
        {item.isOutlier && (
          <View className="bg-warning px-2 py-1 rounded">
            <Text className="text-xs font-bold text-foreground">
              ⚡ OUTLIER
            </Text>
          </View>
        )}
      </View>

      {item.videoTitle ? (
        <Text className="text-xs text-muted mb-2 italic" numberOfLines={1}>
          📌 {item.videoTitle}
        </Text>
      ) : null}

      <View className="flex-row justify-between mb-3">
        <View className="items-center">
          <Text className="text-sm font-semibold text-foreground">
            {item.subs >= 1000000
              ? (item.subs / 1000000).toFixed(1) + "M"
              : item.subs >= 1000
              ? (item.subs / 1000).toFixed(1) + "K"
              : item.subs}
          </Text>
          <Text className="text-[10px] text-muted">Abone</Text>
        </View>
        <View className="items-center">
          <Text className="text-sm font-semibold text-foreground">
            {item.views >= 1000000
              ? (item.views / 1000000).toFixed(1) + "M"
              : item.views >= 1000
              ? (item.views / 1000).toFixed(1) + "K"
              : item.views}
          </Text>
          <Text className="text-[10px] text-muted">Görüntülenme</Text>
        </View>
        <View className="items-center">
          <Text className="text-sm font-semibold text-foreground">
            {item.age}g
          </Text>
          <Text className="text-[10px] text-muted">Yaş</Text>
        </View>
        <View className="items-center">
          <Text
            className={`text-sm font-semibold ${
              item.isOutlier ? "text-warning" : "text-foreground"
            }`}
          >
            %{item.ratio}
          </Text>
          <Text className="text-[10px] text-muted">Oran</Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => openVideo(item.videoId)}
        className="p-3 rounded-lg flex-row justify-center items-center gap-1"
        style={{ backgroundColor: colors.primary }}
      >
        <Text className="text-white text-sm font-semibold">
          ▶ Videoyu İzle
        </Text>
      </TouchableOpacity>
    </View>
  );

  const selectedAgeLabel =
    AGE_OPTIONS.find((o) => o.value === ageDays)?.label || "180 gün";

  return (
    <ScreenContainer className="p-4">
      <ScrollView showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Konu Keşfi" />

        <Card title="Yükselen Nişler" hint="son 7 dönem">
          <View className="flex-row">
            {RISING_NICHES.slice(0, 2).map((n) => (
              <View key={n.name} style={{ flex: 1, marginRight: 8 }}>
                <Text className="text-foreground text-[12px]" numberOfLines={1}>
                  {n.name} <Text style={{ color: colors.success }}>+{n.growth}%</Text>
                </Text>
                <Sparkline data={n.series} height={56} color={n === RISING_NICHES[0] ? "#38BDF8" : "#D946EF"} />
              </View>
            ))}
          </View>
          <View className="flex-row flex-wrap mt-2">
            {RISING_NICHES.map((n) => (
              <Chip key={n.name} label={n.name} onPress={() => setQuery(n.name)} />
            ))}
          </View>
          <SampleBadge />
        </Card>

        <Text className="text-muted text-[12px] mb-2">Kategori Filtreleri</Text>
        <View className="flex-row flex-wrap mb-2">
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} active={query === c} onPress={() => setQuery(c)} />
          ))}
        </View>

        {/* API Status */}
        <View
          className="mb-4 p-2 rounded-lg"
          style={{
            backgroundColor: youtubeApiKey ? "rgba(52,211,153,0.16)" : "rgba(251,191,36,0.16)",
              borderWidth: 1,
              borderColor: youtubeApiKey ? "rgba(52,211,153,0.5)" : "rgba(251,191,36,0.5)",
          }}
        >
          <Text className="text-xs font-semibold text-foreground text-center">
            {youtubeApiKey
              ? "✅ YouTube API Bağlı - Gerçek veriler"
              : "⚠️ YouTube API Anahtarı Gerekli - Mock veriler kullanılıyor"}
          </Text>
        </View>

        {/* Search Input */}
        <View className="mb-4">
          <Text className="text-sm text-muted mb-2">Arama Terimi</Text>
          <TextInput
            placeholder="Örn: ASMR, Gaming, Vlog, Teknoloji"
            value={query}
            onChangeText={setQuery}
            className="p-3 bg-surface border border-border rounded-lg text-foreground"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
          />
        </View>

        {/* Filters Grid */}
        <View className="mb-4 gap-3">
          {/* Kanal Yaşı - Dropdown */}
          <View>
            <Text className="text-xs text-muted mb-1">Kanal Yaşı</Text>
            <TouchableOpacity
              onPress={() => setAgeDropdownOpen(true)}
              className="p-3 bg-surface border border-border rounded text-foreground flex-row justify-between items-center"
            >
              <Text className="text-sm text-foreground">
                {selectedAgeLabel}
              </Text>
              <Text className="text-muted">▼</Text>
            </TouchableOpacity>
          </View>

          {/* Age Dropdown Modal */}
          <Modal
            visible={ageDropdownOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setAgeDropdownOpen(false)}
          >
            <Pressable
              className="flex-1 justify-center items-center"
              style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
              onPress={() => setAgeDropdownOpen(false)}
            >
              <View
                className="w-72 p-4 rounded-xl"
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                }}
              >
                <Text className="text-base font-semibold text-foreground mb-3 text-center">
                  Kanal Yaşı Seç
                </Text>
                {AGE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => {
                      setAgeDays(opt.value);
                      setAgeDropdownOpen(false);
                    }}
                    className="p-3 mb-1 rounded-lg"
                    style={{
                      backgroundColor:
                        ageDays === opt.value
                          ? colors.primary
                          : "transparent",
                    }}
                  >
                    <Text
                      className={`text-sm ${
                        ageDays === opt.value
                          ? "text-white font-semibold"
                          : "text-foreground"
                      }`}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Pressable>
          </Modal>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-xs text-muted mb-1">Min Abone</Text>
              <TextInput
                placeholder="100"
                value={minSubs}
                onChangeText={setMinSubs}
                keyboardType="number-pad"
                className="p-2 bg-surface border border-border rounded text-foreground text-sm"
                placeholderTextColor={colors.muted}
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-muted mb-1">Maks Abone</Text>
              <TextInput
                placeholder="50000"
                value={maxSubs}
                onChangeText={setMaxSubs}
                keyboardType="number-pad"
                className="p-2 bg-surface border border-border rounded text-foreground text-sm"
                placeholderTextColor={colors.muted}
              />
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-xs text-muted mb-1">Outlier %</Text>
              <TextInput
                placeholder="300"
                value={outlierThreshold}
                onChangeText={setOutlierThreshold}
                keyboardType="number-pad"
                className="p-2 bg-surface border border-border rounded text-foreground text-sm"
                placeholderTextColor={colors.muted}
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-muted mb-1">Maks Sonuç</Text>
              <TextInput
                placeholder="20"
                value={maxResults}
                onChangeText={setMaxResults}
                keyboardType="number-pad"
                className="p-2 bg-surface border border-border rounded text-foreground text-sm"
                placeholderTextColor={colors.muted}
              />
            </View>
          </View>
        </View>

        {/* Scan Button */}
        <TouchableOpacity
          onPress={handleScan}
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
              🚀 Taramayı Başlat
            </Text>
          )}
        </TouchableOpacity>

        {/* Error Message */}
        {error && (
          <View className="mb-4 p-3 rounded-lg" style={{ backgroundColor: colors.warning + "30" }}>
            <Text className="text-xs text-foreground">{error}</Text>
          </View>
        )}

        {/* Results */}
        {results.length > 0 && (
          <View>
            <Text className="text-lg font-semibold text-foreground mb-3">
              📊 Sonuçlar ({results.length})
            </Text>
            <FlatList
              data={results}
              renderItem={renderResult}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        )}

        {results.length === 0 && !isLoading && (
          <View className="items-center py-8">
            <Text className="text-muted text-sm">
              Tarama sonuçları burada görüntülenecek
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
