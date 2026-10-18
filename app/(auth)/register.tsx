import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text } from "react-native";

import { Field, isEmail } from "@/components/field";
import { GoogleSignIn } from "@/components/google-button";
import { GradientButton } from "@/components/nv";
import { ScreenContainer } from "@/components/screen-container";
import { useSession } from "@/lib/session";

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp, mode } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [channel, setChannel] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) return setError("Ad soyad girin.");
    if (!isEmail(email)) return setError("Geçerli bir e-posta girin.");
    if (password.length < 8) return setError("Şifre en az 8 karakter olmalı.");
    setError("");
    setBusy(true);
    try {
      await signUp({ email: email.trim().toLowerCase(), password, name: name.trim(), channelName: channel.trim() });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer className="px-6">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: 24, paddingBottom: 32 }}>
          <Text className="text-foreground text-3xl font-bold mb-6">Kayıt Ol</Text>
          <Field label="Ad Soyad" value={name} onChangeText={setName} placeholder="Ad Soyad" />
          <Field
            label="E-posta"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Field label="Kanal Adı (Opsiyonel)" value={channel} onChangeText={setChannel} placeholder="@kanaliniz" autoCapitalize="none" />
          <Field label="Şifre" value={password} onChangeText={setPassword} secure />
          {error ? <Text className="text-error text-[12px] mb-2">{error}</Text> : null}
          <GradientButton title="Kayıt Ol" onPress={submit} loading={busy} style={{ marginTop: 6 }} />
          <GoogleSignIn onError={setError} />
          <Text className="text-muted text-center text-[12px] mt-4">
            {mode === "server" ? "Kanalınızı hemen optimize edin." : "Sunucu ayarlı değil: hesap yalnızca bu cihazda tutulur."}
          </Text>
          <Pressable onPress={() => router.back()} style={{ alignItems: "center", marginTop: 20 }}>
            <Text className="text-info font-semibold">Zaten hesabım var</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
