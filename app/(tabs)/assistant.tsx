import { useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";

import { Chip, ScreenHeader } from "@/components/nv";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { ASSISTANT_SYSTEM, aiChat, aiStatus, type ChatTurn } from "@/lib/ai";
import { bumpUsage } from "@/lib/usage";

const QUICK = [
  "Bu video için başlık önerir misin?",
  "En iyi yayınlama zamanı ne?",
  "Nişimi nasıl büyütürüm?",
];

// Modeller Markdown döndürür; düz Text bileşeni için işaretleri temizle
const plain = (s: string) =>
  s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^#{1,6}\s+/gm, "").replace(/`([^`]+)`/g, "$1");

export default function AssistantScreen() {
  const colors = useColors();
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<FlatList<ChatTurn>>(null);

  const send = async (msg: string) => {
    const content = msg.trim();
    if (!content || busy) return;
    const next: ChatTurn[] = [...turns, { role: "user", text: content }];
    setTurns(next);
    setText("");
    const st = await aiStatus();
    if (!st.creds) {
      setTurns([
        ...next,
        { role: "model", text: `${st.reason} Profil > Yapay Zeka bölümünden sağlayıcı seçip API anahtarı girin.` },
      ]);
      return;
    }
    setBusy(true);
    try {
      const reply = await aiChat(ASSISTANT_SYSTEM, next);
      setTurns([...next, { role: "model", text: reply }]);
      bumpUsage("chats");
    } catch (e) {
      setTurns([...next, { role: "model", text: "Hata: " + (e as Error).message }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer className="px-4 pt-2">
      <ScreenHeader title="Yapay Zeka Asistanı" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={80}
      >
        <FlatList
          ref={listRef}
          data={turns}
          keyExtractor={(_, i) => String(i)}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListHeaderComponent={
            turns.length === 0 ? (
              <View className="mb-2">
                <Text className="text-muted text-[12px] mb-2">Hızlı sorular</Text>
                <View className="flex-row flex-wrap">
                  {QUICK.map((q) => (
                    <Chip key={q} label={q} onPress={() => send(q)} />
                  ))}
                </View>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <View
              className="mb-2 px-3 py-2 rounded-2xl"
              style={{
                alignSelf: item.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
                backgroundColor: item.role === "user" ? "#7C3AED" : "rgba(26,14,54,0.95)",
                borderWidth: item.role === "user" ? 0 : 1,
                borderColor: colors.border,
              }}
            >
              <Text className="text-foreground text-[14px]">{item.role === "model" ? plain(item.text) : item.text}</Text>
            </View>
          )}
          ListFooterComponent={busy ? <Text className="text-muted text-[12px] mb-2">Yazıyor…</Text> : null}
        />
        <View
          className="flex-row items-center rounded-full border px-3 mb-2"
          style={{ borderColor: colors.border, backgroundColor: "rgba(13,6,32,0.85)" }}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Nichevo AI'a sorun..."
            placeholderTextColor={colors.muted}
            className="flex-1 text-foreground"
            style={{ paddingVertical: 10 }}
            onSubmitEditing={() => send(text)}
            returnKeyType="send"
          />
          <Pressable
            onPress={() => send(text)}
            disabled={busy || !text.trim()}
            accessibilityLabel="Gönder"
            style={{ opacity: busy || !text.trim() ? 0.4 : 1 }}
          >
            <Text style={{ color: colors.info, fontWeight: "700" }}>Gönder</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
