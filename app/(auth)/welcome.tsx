import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { Field } from "@/components/field";
import { GradientButton, Logo } from "@/components/nv";
import { ScreenContainer } from "@/components/screen-container";
import { useSession } from "@/lib/session";
import { loadYoutubeApiKey } from "@/lib/youtube-api";
import { fetchChannelInfo } from "@/lib/youtube-extras";

const STEPS = [
  "Kanalınızı bağlayın (@kullanıcıadı veya kanal bağlantısı)",
  "Kanalınızı gözlemleyin: skor, niş ve rekabet haritası",
  "Kanalınızı büyütün: planlama ve yapay zeka önerileri",
];

export default function WelcomeScreen() {
  const { profile, update } = useSession();
  const [channel, setChannel] = useState(profile?.channelName ?? "");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const connect = async () => {
    setBusy(true);
    setNote("");
    try {
      let channelId = "";
      let channelName = channel.trim();
      const key = await loadYoutubeApiKey();
      if (channelName && key) {
        const info = await fetchChannelInfo(channelName, key);
        if (info) {
          channelId = info.id;
          channelName = info.title;
        } else {
          setNote("Kanal bulunamadı, bağlantı olmadan devam ediliyor.");
        }
      } else if (channelName && !key) {
        setNote("YouTube API anahtarı yok; kanal doğrulanamadı. Profil > Ayarlar'dan ekleyebilirsiniz.");
      }
      await update({ channelName, channelId, onboarded: true });
    } catch (e) {
      setNote("Kanal doğrulanamadı: " + (e as Error).message);
      await update({ channelName: channel.trim(), onboarded: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer className="px-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingVertical: 24 }} keyboardShouldPersistTaps="handled">
        <View className="items-center mb-4">
          <Logo size={100} />
        </View>
        <Text className="text-foreground text-2xl font-bold text-center mb-6">Nichevo&apos;ya Hoş Geldiniz!</Text>
        {STEPS.map((s, i) => (
          <View
            key={i}
            className="flex-row items-center border border-border rounded-xl p-3 mb-2"
            style={{ backgroundColor: "rgba(26,14,54,0.85)" }}
          >
            <View className="w-6 h-6 rounded-full border border-info items-center justify-center mr-3">
              <Text className="text-info text-[12px]">{i + 1}</Text>
            </View>
            <Text className="text-foreground text-[13px] flex-1">{s}</Text>
          </View>
        ))}
        <View className="mt-4">
          <Field
            label="Kanalınız"
            value={channel}
            onChangeText={setChannel}
            autoCapitalize="none"
            placeholder="@kanaliniz"
          />
        </View>
        {note ? <Text className="text-warning text-[12px] mb-2">{note}</Text> : null}
        <GradientButton title="Kanalınızı Bağlayın" onPress={connect} loading={busy} />
        <Text
          onPress={() => update({ onboarded: true })}
          className="text-muted text-center text-[12px] mt-4"
        >
          Şimdilik atla
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}
