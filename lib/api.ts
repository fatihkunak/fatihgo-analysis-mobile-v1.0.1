import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Nichevo hesap sunucusu istemcisi. Adres PAKETLEME anında gömülür (EXPO_PUBLIC_API_URL);
// tanımsızsa uygulama açıkça "yerel mod"da çalışır (bkz. lib/session.tsx), sessizce sahte veriye düşmez.
const RAW = (process.env.EXPO_PUBLIC_API_URL ?? "").trim().replace(/\/+$/, "");
export const API_URL = RAW;
export const apiConfigured = (): boolean => RAW.length > 0;

export type ServerUser = {
  id: string;
  email: string;
  name: string;
  channelName: string;
  channelId: string;
  plan: "free" | "pro";
  language: "tr" | "en";
  notifications: boolean;
  onboarded: boolean;
  /** Google ile açılan hesaplarda false */
  hasPassword: boolean;
};

type Session = { user: ServerUser; accessToken: string; refreshToken: string; expiresIn: number };

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 0,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// --- jeton deposu: native'de güvenli depo, web'de AsyncStorage ---
const K_ACCESS = "nichevo.auth.access";
const K_REFRESH = "nichevo.auth.refresh";
const secure = Platform.OS !== "web";

const getItem = async (k: string) => (secure ? SecureStore.getItemAsync(k) : AsyncStorage.getItem(k));
const setItem = async (k: string, v: string) => (secure ? SecureStore.setItemAsync(k, v) : AsyncStorage.setItem(k, v));
const delItem = async (k: string) => (secure ? SecureStore.deleteItemAsync(k) : AsyncStorage.removeItem(k));

export const hasStoredSession = async (): Promise<boolean> => !!(await getItem(K_REFRESH));

async function storeTokens(s: { accessToken: string; refreshToken: string }) {
  await setItem(K_ACCESS, s.accessToken);
  await setItem(K_REFRESH, s.refreshToken);
}

export async function clearTokens() {
  await delItem(K_ACCESS);
  await delItem(K_REFRESH);
}

// --- HTTP ---
async function raw<T>(path: string, init: { method: string; body?: unknown; token?: string | null }): Promise<T> {
  if (!apiConfigured()) throw new ApiError("NO_SERVER", "Sunucu adresi ayarlı değil");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  let res: Response;
  try {
    res = await fetch(`${RAW}${path}`, {
      method: init.method,
      headers: {
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: ctrl.signal,
    });
  } catch {
    throw new ApiError("NETWORK", "Sunucuya ulaşılamıyor. Bağlantını kontrol et.");
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}
  if (!res.ok) {
    throw new ApiError(json?.error?.code ?? "HTTP", json?.error?.message ?? `Sunucu hatası (${res.status})`, res.status);
  }
  return json as T;
}

// Aynı anda birden çok 401 gelirse tek yenileme yapılır
let refreshing: Promise<boolean> | null = null;
async function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const refreshToken = await getItem(K_REFRESH);
      if (!refreshToken) return false;
      const s = await raw<Session>("/v1/auth/refresh", { method: "POST", body: { refreshToken } });
      await storeTokens(s);
      return true;
    } catch (e) {
      // Ağ hatasında oturumu silme (çevrimdışı olabilir); yalnızca sunucu reddederse sil
      if (e instanceof ApiError && e.status === 401) await clearTokens();
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

async function authed<T>(path: string, method: string, body?: unknown): Promise<T> {
  const token = await getItem(K_ACCESS);
  try {
    return await raw<T>(path, { method, body, token });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401 && (await refreshSession())) {
      return raw<T>(path, { method, body, token: await getItem(K_ACCESS) });
    }
    throw e;
  }
}

// --- uç noktalar ---
export async function register(b: { email: string; password: string; name: string; channelName?: string }) {
  const s = await raw<Session>("/v1/auth/register", { method: "POST", body: b });
  await storeTokens(s);
  return s.user;
}

export async function login(b: { email: string; password: string }) {
  const s = await raw<Session>("/v1/auth/login", { method: "POST", body: b });
  await storeTokens(s);
  return s.user;
}

export async function logout() {
  const refreshToken = await getItem(K_REFRESH);
  try {
    if (refreshToken) await raw<void>("/v1/auth/logout", { method: "POST", body: { refreshToken } });
  } catch {
    // sunucuya ulaşılamasa da yerel çıkış yapılır
  }
  await clearTokens();
}

export const fetchMe = async () => (await authed<{ user: ServerUser }>("/v1/me", "GET")).user;

export const patchMe = async (patch: Partial<Omit<ServerUser, "id" | "email" | "plan">>) =>
  (await authed<{ user: ServerUser }>("/v1/me", "PATCH", patch)).user;

export async function changePassword(currentPassword: string, newPassword: string) {
  const s = await authed<Session>("/v1/auth/change-password", "POST", { currentPassword, newPassword });
  await storeTokens(s);
  return s.user;
}

/** Şifreli hesap şifresini gönderir; Google hesabı (şifresiz) `undefined` verip açık onay gönderir. */
export async function deleteAccount(password?: string) {
  await authed<void>("/v1/me", "DELETE", password ? { password } : { confirm: true });
  await clearTokens();
}

// --- Google ile giriş (sunucu tarafı kod akışı) ---
export const fetchProviders = async (): Promise<{ google: boolean }> => {
  try {
    return await raw<{ google: boolean }>("/v1/auth/providers", { method: "GET" });
  } catch {
    return { google: false };
  }
};

export const googleStartUrl = (redirect: string) => `${RAW}/v1/auth/google/start?redirect=${encodeURIComponent(redirect)}`;

export async function exchangeGoogleCode(code: string) {
  const s = await raw<Session>("/v1/auth/google/exchange", { method: "POST", body: { code } });
  await storeTokens(s);
  return s.user;
}

const GOOGLE_ERRORS: Record<string, string> = {
  GOOGLE_DENIED: "Google girişi iptal edildi.",
  GOOGLE_FAILED: "Google girişi tamamlanamadı, tekrar dene.",
  EMAIL_UNVERIFIED: "Google e-postan doğrulanmamış, bu hesapla giriş yapılamaz.",
  EMAIL_EXISTS: "Bu e-posta şifreyle kayıtlı. Önce e-posta ve şifrenle giriş yap.",
};
export const googleErrorMessage = (code: string) => GOOGLE_ERRORS[code] ?? "Google girişi başarısız oldu.";
