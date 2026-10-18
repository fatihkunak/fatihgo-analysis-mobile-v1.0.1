import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { googleErrorMessage } from "@/lib/api";
import { useSession } from "@/lib/session";

// Google'dan dönüş sayfası: web'de https://nichevo.fatihgo.com/auth/callback?code=…, native'de derin bağlantı
// (nichevo://auth). Sunucunun verdiği tek kullanımlık kodu oturuma çevirir.
export default function GoogleCallbackScreen() {
  const router = useRouter();
  const { completeGoogleSignIn } = useSession();
  const params = useLocalSearchParams<{ code?: string; error?: string }>();
  const [error, setError] = useState("");

  useEffect(() => {
    if (params.error) return setError(googleErrorMessage(String(params.error)));
    if (!params.code) return setError(googleErrorMessage(""));
    completeGoogleSignIn(String(params.code))
      .then(() => router.replace("/")) // AuthGate profile durumuna göre karşılama ya da ana ekrana taşır
      .catch((e: Error) => setError(e.message));
  }, [params.code, params.error, completeGoogleSignIn, router]);

  return (
    <ScreenContainer className="px-6">
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14 }}>
        {error ? (
          <>
            <Text className="text-error text-[14px] text-center">{error}</Text>
            <Pressable onPress={() => router.replace("/(auth)/login")}>
              <Text className="text-info font-semibold">Girişe dön</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator />
            <Text className="text-muted text-[13px]">Google girişi tamamlanıyor…</Text>
          </>
        )}
      </View>
    </ScreenContainer>
  );
}
