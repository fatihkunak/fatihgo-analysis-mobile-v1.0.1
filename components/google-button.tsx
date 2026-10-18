import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { useSession } from "@/lib/session";

/** "veya" ayırıcısı + Google ile devam et. Sunucuda Google tanımlı değilse hiçbir şey çizmez. */
export function GoogleSignIn({ onError }: { onError: (message: string) => void }) {
  const colors = useColors();
  const { googleAvailable, signInWithGoogle } = useSession();
  const [busy, setBusy] = useState(false);

  if (!googleAvailable) return null;

  const press = async () => {
    setBusy(true);
    onError("");
    try {
      await signInWithGoogle();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ marginTop: 18 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        <Text style={{ color: colors.muted, fontSize: 12, marginHorizontal: 10 }}>veya</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      </View>
      <Pressable
        onPress={press}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Google ile devam et"
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          paddingVertical: 13,
          opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? <ActivityIndicator color={colors.foreground} /> : <MaterialCommunityIcons name="google" size={20} color={colors.foreground} />}
        <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 15 }}>Google ile devam et</Text>
      </Pressable>
    </View>
  );
}
