import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { Card, Chip, Gauge, Heatmap, SampleBadge, ScreenHeader } from "@/components/nv";
import { ScreenContainer } from "@/components/screen-container";
import {
  HEAT_COLS,
  HEAT_DATA,
  HEAT_ROWS,
  SAMPLE_TOPICS,
  channelScore,
  formatCount,
  topKeywords,
  topPhrases,
} from "@/lib/insights";
import { useSession } from "@/lib/session";
import { loadYoutubeApiKey } from "@/lib/youtube-api";
import { fetchChannelInfo, fetchTrendingVideoTexts, type ChannelInfo } from "@/lib/youtube-extras";

export default function DashboardScreen() {
  const router = useRouter();
  const { profile } = useSession();
  const [topics, setTopics] = useState<string[]>(SAMPLE_TOPICS);
  const [topicsLive, setTopicsLive] = useState(false);
  const [channel, setChannel] = useState<ChannelInfo | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const key = await loadYoutubeApiKey();
      if (!key) {
        setNote("Canlı veri için Profil > Ayarlar'dan YouTube API anahtarı ekleyin.");
        return;
      }
      try {
        const t = await fetchTrendingVideoTexts(key, "TR");
        // Önce tam etiket ifadeleri; yetmezse başlık kelimeleriyle tamamla
        const phrases = topPhrases(t.tags, 8);
        const filler = topKeywords(t.titles, 12)
          .map((w) => w.word)
          .filter((w) => w.length >= 4 && !phrases.some((p) => p.toLocaleLowerCase("tr") === w))
          .map((w) => w.charAt(0).toLocaleUpperCase("tr") + w.slice(1));
        const words = [...phrases, ...filler].slice(0, 8);
        if (alive && words.length) {
          setTopics(words);
          setTopicsLive(true);
        }
      } catch (e) {
        if (alive) setNote("Trendler alınamadı: " + (e as Error).message);
      }
      if (profile?.channelId) {
        try {
          const c = await fetchChannelInfo(profile.channelId, key);
          if (alive) setChannel(c);
        } catch {}
      }
    })();
    return () => {
      alive = false;
    };
  }, [profile?.channelId]);

  const score = channel ? channelScore(channel) : null;

  return (
    <ScreenContainer className="px-4 pt-2">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <ScreenHeader title="Pano" />

        <Card title="Öne Çıkan Konular" hint={topicsLive ? "TR · canlı" : undefined}>
          <View className="flex-row flex-wrap">
            {topics.map((t) => (
              <Chip key={t} label={t} onPress={() => router.push({ pathname: "/niche", params: { q: t } })} />
            ))}
          </View>
          {!topicsLive ? (
            <View className="flex-row items-center mt-1">
              <SampleBadge />
            </View>
          ) : null}
        </Card>

        <View className="flex-row">
          <Card title="Kanal Skoru" style={{ flex: 1, marginRight: 6 }}>
            <View className="items-center">
              {score !== null ? (
                <>
                  <Gauge value={score} />
                  <Text className="text-muted text-[11px] mt-2 text-center" numberOfLines={1}>
                    {channel!.title}
                  </Text>
                  <Text className="text-muted text-[10px]">
                    {formatCount(channel!.subs)} abone · {formatCount(channel!.videos)} video
                  </Text>
                </>
              ) : (
                <Text className="text-muted text-[12px] text-center py-4">
                  {profile?.channelId
                    ? "Skor hesaplanıyor / API anahtarı gerekli"
                    : "Skor için kanalınızı Profil'den bağlayın"}
                </Text>
              )}
            </View>
          </Card>
          <Card title="Büyüme İpucu" style={{ flex: 1, marginLeft: 6 }}>
            <Text className="text-foreground text-[12px]">
              Isı haritasında mavi hücreler az kalabalık, magenta hücreler yoğun rekabet demektir. Az kalabalık
              format + yükselen niş = fırsat.
            </Text>
          </Card>
        </View>

        <Card title="Rekabet Isı Haritası" hint="niş × format">
          <Heatmap rows={HEAT_ROWS} cols={HEAT_COLS} data={HEAT_DATA} />
          <View className="flex-row items-center mt-2">
            <SampleBadge />
          </View>
        </Card>

        {note ? <Text className="text-muted text-[11px] text-center mt-1">{note}</Text> : null}
      </ScrollView>
    </ScreenContainer>
  );
}
