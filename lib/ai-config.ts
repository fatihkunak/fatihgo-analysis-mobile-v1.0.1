import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { DEFAULT_CONFIG, PROVIDERS, type AiConfig } from "@/lib/ai-providers";

// Ayarlar (sağlayıcı/model/adres) AsyncStorage'da; API anahtarları cihazın güvenli deposunda
// (Android Keystore / iOS Keychain). Web'de güvenli depo yok, AsyncStorage'a düşer.
const CONFIG_KEY = "nichevo.ai";
const keyName = (id: string) => `nichevo.aikey.${id}`;
const useSecure = Platform.OS !== "web";

async function readKey(id: string): Promise<string> {
  try {
    const v = useSecure ? await SecureStore.getItemAsync(keyName(id)) : await AsyncStorage.getItem(keyName(id));
    return v ?? "";
  } catch {
    return "";
  }
}

async function writeKey(id: string, value: string): Promise<void> {
  const v = value.trim();
  if (useSecure) {
    if (v) await SecureStore.setItemAsync(keyName(id), v);
    else await SecureStore.deleteItemAsync(keyName(id));
  } else if (v) {
    await AsyncStorage.setItem(keyName(id), v);
  } else {
    await AsyncStorage.removeItem(keyName(id));
  }
}

export async function loadAiConfig(): Promise<AiConfig> {
  let cfg: AiConfig = { ...DEFAULT_CONFIG, apiKeys: {} };
  try {
    const raw = await AsyncStorage.getItem(CONFIG_KEY);
    if (raw) {
      const j = JSON.parse(raw);
      cfg = { ...cfg, provider: j.provider ?? cfg.provider, model: j.model ?? "", baseUrl: j.baseUrl ?? "" };
    } else {
      // İlk açılış: eski sürümdeki Gemini anahtarını yeni yapıya taşı
      const legacy = (await AsyncStorage.getItem("geminiApiKey"))?.trim();
      if (legacy) {
        await writeKey("gemini", legacy);
        await AsyncStorage.removeItem("geminiApiKey");
      }
    }
  } catch {}
  for (const p of PROVIDERS) {
    if (p.needsKey) cfg.apiKeys[p.id] = await readKey(p.id);
  }
  return cfg;
}

export async function saveAiConfig(cfg: AiConfig): Promise<void> {
  await AsyncStorage.setItem(
    CONFIG_KEY,
    JSON.stringify({ provider: cfg.provider, model: cfg.model, baseUrl: cfg.baseUrl }),
  );
  for (const p of PROVIDERS) {
    if (p.needsKey && cfg.apiKeys[p.id] !== undefined) await writeKey(p.id, cfg.apiKeys[p.id]);
  }
}
