import { ScrollView, Text, View, TextInput, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { Watermark } from "@/components/watermark";
import { useState } from "react";
import { useColors } from "@/hooks/use-colors";

interface NicheResult {
  id: string;
  channelName: string;
  subs: number;
  views: number;
  age: number;
  ratio: number;
  isOutlier: boolean;
  videoId: string;
}

export default function NicheScreen() {
  const colors = useColors();
  const [query, setQuery] = useState("");
  const [ageDays, setAgeDays] = useState("180");
  const [minSubs, setMinSubs] = useState("100");
  const [maxSubs, setMaxSubs] = useState("50000");
  const [outlierThreshold, setOutlierThreshold] = useState("300");
  const [maxResults, setMaxResults] = useState("20");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<NicheResult[]>([]);

  const handleScan = async () => {
    if (!query.trim()) {
      alert("Lütfen bir arama terimi girin.");
      return;
    }

    setIsLoading(true);
    try {
      const mockResults: NicheResult[] = [
        {
          id: "UCabc123",
          channelName: "Örnek Kanal 1",
          subs: 15000,
          views: 500000,
          age: 365,
          ratio: 3.0,
          isOutlier: false,
          videoId: "dQw4w9WgXcQ",
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
        },
      ];
      setTimeout(() => {
        setResults(mockResults);
        setIsLoading(false);
      }, 1500);
    } catch (error) {
      alert("Hata: " + (error as Error).message);
      setIsLoading(false);
    }
  };

  const renderResult = ({ item }: { item: NicheResult }) => (
    <View className="mb-3 p-4 bg-surface rounded-lg border border-border">
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-base font-semibold text-foreground flex-1">{item.channelName}</Text>
        {item.isOutlier && <Text className="text-xs bg-warning px-2 py-1 rounded text-foreground">⚡ OUTLIER</Text>}
      </View>
      <View className="flex-row justify-between text-xs text-muted mb-1">
        <Text>Abone: {(item.subs / 1000).toFixed(1)}K</Text>
        <Text>Yaş: {item.age}d</Text>
        <Text>Oran: {item.ratio}%</Text>
      </View>
      <TouchableOpacity className="mt-2 p-2 bg-primary rounded">
        <Text className="text-center text-background text-sm font-semibold">▶ İzle</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScreenContainer className="p-4">
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text className="text-2xl font-bold text-foreground mb-4">🔍 Niş Tarama</Text>

        {/* Search Input */}
        <View className="mb-4">
          <Text className="text-sm text-muted mb-2">Arama Terimi</Text>
          <TextInput
            placeholder="Örn: ASMR, Gaming, Vlog"
            value={query}
            onChangeText={setQuery}
            className="p-3 bg-surface border border-border rounded-lg text-foreground"
            placeholderTextColor={colors.muted}
          />
        </View>

        {/* Filters Grid */}
        <View className="mb-4 gap-3">
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-xs text-muted mb-1">Kanal Yaşı</Text>
              <TextInput
                placeholder="180"
                value={ageDays}
                onChangeText={setAgeDays}
                keyboardType="number-pad"
                className="p-2 bg-surface border border-border rounded text-foreground text-sm"
                placeholderTextColor={colors.muted}
              />
            </View>
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
          </View>

          <View className="flex-row gap-3">
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
          </View>

          <View>
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

        {/* Scan Button */}
        <TouchableOpacity
          onPress={handleScan}
          disabled={isLoading}
          className={`p-4 rounded-lg mb-4 ${isLoading ? "opacity-50" : ""}`}
          style={{ backgroundColor: colors.primary }}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text className="text-center text-background font-semibold">🚀 Taramayı Başlat</Text>
          )}
        </TouchableOpacity>

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
            <Text className="text-muted text-sm">Tarama sonuçları burada görüntülenecek</Text>
          </View>
        )}
      </ScrollView>
      <Watermark />
    </ScreenContainer>
  );
}
