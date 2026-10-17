import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Switch, Text, View } from "react-native";

import { Field } from "@/components/field";
import { AccountCard } from "@/components/account-card";
import { AiSettings } from "@/components/ai-settings";
import { Card, GradientButton } from "@/components/nv";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useSession } from "@/lib/session";
import { getUsage, type Usage } from "@/lib/usage";
import { loadYoutubeApiKey } from "@/lib/youtube-api";
import { fetchChannelInfo, verifyYoutubeKey } from "@/lib/youtube-extras";

function Row({ label, value, onPress }: { label: string; value?: string; onPress?: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}
    >
      <Text className="text-foreground text-[14px]">{label}</Text>
      <Text style={{ color: colors.muted, fontSize: 13 }}>{value}{onPress ? "  ›" : ""}</Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const colors = useColors();
  const { profile, update, signOut } = useSession();
  const [youtubeKey, setYoutubeKey] = useState("");
  const [usage, setUsage] = useState<Usage | null>(null);
  const [channelInput, setChannelInput] = useState(profile?.channelName ?? "");
  const [ytStatus, setYtStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [ytBusy, setYtBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem("youtubeApiKey").then((v) => setYoutubeKey(v ?? ""));
      getUsage().then(setUsage);
    }, []),
  );

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 3000);
  };

  const saveYoutubeKey = async () => {
    const key = youtubeKey.trim();
    if (!key) {
      setYtStatus({ ok: false, msg: "YouTube API anahtarı boş olamaz." });
      return;
    }
    setYtBusy(true);
    setYtStatus(null);
    try {
      await AsyncStorage.setItem("youtubeApiKey", key);
      setYoutubeKey(key);
      const v = await verifyYoutubeKey(key);
      setYtStatus(v.ok ? { ok: true, msg: "Kaydedildi · " + v.msg } : { ok: false, msg: "Kaydedildi ama doğrulanamadı: " + v.msg });
    } catch (e) {
      setYtStatus({ ok: false, msg: "Kaydedilemedi: " + (e as Error).message });
    } finally {
      setYtBusy(false);
    }
  };


  const saveChannel = async () => {
    setBusy(true);
    try {
      const key = await loadYoutubeApiKey();
      const info = channelInput.trim() && key ? await fetchChannelInfo(channelInput, key) : null;
      if (info) {
        await update({ channelName: info.title, channelId: info.id });
        setChannelInput(info.title);
        flash("✅ Kanal bağlandı: " + info.title);
      } else {
        await update({ channelName: channelInput.trim(), channelId: "" });
        flash(key ? "Kanal bulunamadı; ad olarak kaydedildi." : "API anahtarı yok; ad olarak kaydedildi.");
      }
    } catch (e) {
      flash("Hata: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const logout = () =>
    Alert.alert("Çıkış Yap", "Bu cihazdaki profil silinecek. API anahtarları korunur.", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Çıkış Yap",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);

  if (!profile) return null;

  return (
    <ScreenContainer className="px-4 pt-2">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="flex-row items-center justify-between mb-3">
          <Pressable onPress={() => router.back()} accessibilityLabel="Geri">
            <Text style={{ color: colors.info, fontSize: 15 }}>‹ Geri</Text>
          </Pressable>
          <Text className="text-foreground text-xl font-bold">Profil ve Ayarlar</Text>
          <View style={{ width: 40 }} />
        </View>

        <Card>
          <View className="flex-row items-center">
            <View
              className="w-12 h-12 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: "rgba(139,92,246,0.35)" }}
            >
              <Text className="text-foreground text-xl font-bold">{profile.name.slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text className="text-foreground font-semibold text-[16px]">{profile.name}</Text>
              <Text className="text-muted text-[12px]">{profile.email}</Text>
            </View>
          </View>
        </Card>

        <Card title="Kanal Bilgileri">
          <Field
            value={channelInput}
            onChangeText={setChannelInput}
            autoCapitalize="none"
            placeholder="@kanaliniz veya kanal bağlantısı"
          />
          <GradientButton title="Kanalı Kaydet" onPress={saveChannel} loading={busy} small />
          {profile.channelId ? <Text className="text-success text-[11px] mt-2">Doğrulandı · {profile.channelId}</Text> : null}
          {msg ? <Text style={{ color: msg.startsWith("✅") ? colors.success : colors.muted, fontSize: 12, marginTop: 8 }}>{msg}</Text> : null}
        </Card>

        <Card title="Paket Planı">
          <Row label="Mevcut paket" value={profile.plan} />
          <Text className="text-muted text-[11px] mt-2">Ödemeli paketler henüz aktif değil.</Text>
        </Card>

        <Card title="Kullanım İstatistikleri">
          <Row label="Video analizi" value={String(usage?.analyses ?? 0)} />
          <Row label="Niş taraması" value={String(usage?.scans ?? 0)} />
          <Row label="Oluşturulan plan" value={String(usage?.plans ?? 0)} />
          <Row label="Asistan mesajı" value={String(usage?.chats ?? 0)} />
        </Card>

        <Card title="Ayarlar">
          <Row
            label="Dil"
            value={profile.language}
            onPress={() => update({ language: profile.language === "Türkçe" ? "English" : "Türkçe" })}
          />
          <View className="flex-row items-center justify-between py-2">
            <Text className="text-foreground text-[14px]">Bildirimler</Text>
            <Switch
              value={profile.notifications}
              onValueChange={(v) => update({ notifications: v })}
              trackColor={{ true: "#8B5CF6", false: colors.border }}
            />
          </View>
          {profile.language === "English" ? (
            <Text className="text-muted text-[11px]">Arayüz çevirisi henüz yok; tercih kaydedildi.</Text>
          ) : null}
        </Card>

        <Card title="YouTube Data API v3">
          <Field value={youtubeKey} onChangeText={setYoutubeKey} secure placeholder="AIzaSy..." autoCapitalize="none" />
          <GradientButton title="YouTube Key Kaydet" onPress={saveYoutubeKey} loading={ytBusy} small />
          {ytStatus ? (
            <Text style={{ color: ytStatus.ok ? colors.success : colors.error, fontSize: 12, marginTop: 8 }}>
              {ytStatus.ok ? "✓ " : "✗ "}
              {ytStatus.msg}
            </Text>
          ) : null}
          <Text className="text-muted text-[11px] mt-2">
            Google Cloud Console / YouTube Data API v3 / API Key oluştur
          </Text>
        </Card>

        <AiSettings />

        <AccountCard />


        <Pressable
          onPress={logout}
          style={{ borderRadius: 999, borderWidth: 1, alignItems: "center", paddingVertical: 12, marginBottom: 16, borderColor: colors.error }}
        >
          <Text style={{ color: colors.error, fontWeight: "700" }}>Çıkış Yap</Text>
        </Pressable>

        <Text className="text-muted text-[11px] text-center">
          Nichevo v1.0.0 · YouTube büyüme ve niş analiz aracı{"\n"}www.fatihgo.com · info@fatihgo.com
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}
