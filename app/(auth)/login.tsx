import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";

import { Field, isEmail } from "@/components/field";
import { GradientButton, Logo } from "@/components/nv";
import { ScreenContainer } from "@/components/screen-container";
import { useSession } from "@/lib/session";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, mode } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!isEmail(email)) return setError("Geçerli bir e-posta girin.");
    if (!password) return setError("Şifre girin.");
    setError("");
    setBusy(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer className="px-6">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }} keyboardShouldPersistTaps="handled">
          <View className="items-center mb-8">
            <Logo size={112} />
          </View>
          <Field
            label="E-posta"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="ornek@mail.com"
          />
          <Field label="Şifre" value={password} onChangeText={setPassword} secure placeholder="••••••" />
          {error ? <Text className="text-error text-[12px] mb-2">{error}</Text> : null}
          <GradientButton title="Giriş Yap" onPress={submit} loading={busy} style={{ marginTop: 6 }} />
          <Pressable onPress={() => router.push("/(auth)/register")} style={{ alignItems: "center", marginTop: 20 }}>
            <Text className="text-info font-semibold">Yeni Kayıt Ol</Text>
          </Pressable>
          <Text className="text-muted text-center text-[12px] mt-3">Hesabınız yok mu?</Text>
          <Text className="text-muted text-center text-[10px] mt-6">
            {mode === "server"
              ? "Hesabın Nichevo sunucusunda saklanır."
              : "Sunucu ayarlı değil: hesap yalnızca bu cihazda tutulur ve şifre doğrulanmaz."}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
