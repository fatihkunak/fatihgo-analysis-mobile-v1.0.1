import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

import * as api from "@/lib/api";

export type Profile = {
  name: string;
  email: string;
  channelName: string;
  channelId: string;
  plan: "Ücretsiz" | "Pro";
  language: "Türkçe" | "English";
  notifications: boolean;
  onboarded: boolean;
};

/** server: hesap sunucuda (EXPO_PUBLIC_API_URL tanımlı) · local: sunucu yok, profil yalnızca bu cihazda */
export type Mode = "server" | "local";

const KEY = "nichevo.profile";

type SignUpInput = { email: string; password: string; name: string; channelName?: string };

type SessionValue = {
  ready: boolean;
  profile: Profile | null;
  mode: Mode;
  /** Sunucuya ulaşılamadı; önbellekteki profil gösteriliyor */
  offline: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  update: (patch: Partial<Profile>) => Promise<void>;
  signOut: () => Promise<void>;
  changePassword: (current: string, next: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

const fromServer = (u: api.ServerUser): Profile => ({
  name: u.name,
  email: u.email,
  channelName: u.channelName,
  channelId: u.channelId,
  plan: u.plan === "pro" ? "Pro" : "Ücretsiz",
  language: u.language === "en" ? "English" : "Türkçe",
  notifications: u.notifications,
  onboarded: u.onboarded,
});

const toServerPatch = (p: Partial<Profile>) => ({
  ...(p.name !== undefined && { name: p.name }),
  ...(p.channelName !== undefined && { channelName: p.channelName }),
  ...(p.channelId !== undefined && { channelId: p.channelId }),
  ...(p.language !== undefined && { language: p.language === "English" ? ("en" as const) : ("tr" as const) }),
  ...(p.notifications !== undefined && { notifications: p.notifications }),
  ...(p.onboarded !== undefined && { onboarded: p.onboarded }),
});

const localProfile = (email: string, over: Partial<Profile> = {}): Profile => ({
  name: email.split("@")[0] ?? email,
  email,
  channelName: "",
  channelId: "",
  plan: "Ücretsiz",
  language: "Türkçe",
  notifications: true,
  onboarded: false,
  ...over,
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const mode: Mode = api.apiConfigured() ? "server" : "local";
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [offline, setOffline] = useState(false);

  const cache = useCallback(async (p: Profile | null) => {
    try {
      if (p) await AsyncStorage.setItem(KEY, JSON.stringify(p));
      else await AsyncStorage.removeItem(KEY);
    } catch {}
  }, []);

  const apply = useCallback(
    async (p: Profile | null) => {
      setProfile(p);
      await cache(p);
    },
    [cache],
  );

  // Açılışta oturumu geri yükle
  useEffect(() => {
    let alive = true;
    (async () => {
      let cached: Profile | null = null;
      try {
        const raw = await AsyncStorage.getItem(KEY);
        cached = raw ? JSON.parse(raw) : null;
      } catch {}
      if (mode === "local") {
        if (alive) setProfile(cached);
      } else if (await api.hasStoredSession()) {
        try {
          const p = fromServer(await api.fetchMe());
          if (alive) {
            setProfile(p);
            await cache(p);
          }
        } catch (e) {
          // Yalnızca ağ yoksa önbelleği göster; sunucu oturumu reddettiyse çıkış yapılmış say
          if (e instanceof api.ApiError && e.code === "NETWORK" && cached) {
            if (alive) {
              setProfile(cached);
              setOffline(true);
            }
          } else {
            await api.clearTokens();
            await cache(null);
          }
        }
      }
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [mode, cache]);

  const signIn = useCallback<SessionValue["signIn"]>(
    async (email, password) => {
      if (mode === "server") {
        await apply(fromServer(await api.login({ email, password })));
      } else {
        // Yerel mod: parola doğrulanmaz, profil yalnızca bu cihazda tutulur
        const same = profile && profile.email === email ? profile : null;
        await apply(same ?? localProfile(email));
      }
      setOffline(false);
    },
    [mode, apply, profile],
  );

  const signUp = useCallback<SessionValue["signUp"]>(
    async ({ email, password, name, channelName }) => {
      if (mode === "server") {
        await apply(fromServer(await api.register({ email, password, name, channelName })));
      } else {
        await apply(localProfile(email, { name, channelName: channelName ?? "" }));
      }
      setOffline(false);
    },
    [mode, apply],
  );

  const update = useCallback<SessionValue["update"]>(
    async (patch) => {
      if (!profile) return;
      const before = profile;
      await apply({ ...profile, ...patch }); // iyimser güncelleme
      if (mode !== "server") return;
      try {
        await apply(fromServer(await api.patchMe(toServerPatch(patch))));
      } catch (e) {
        await apply(before);
        Alert.alert("Kaydedilemedi", (e as Error).message);
      }
    },
    [profile, mode, apply],
  );

  const signOut = useCallback(async () => {
    if (mode === "server") await api.logout();
    await apply(null);
    setOffline(false);
  }, [mode, apply]);

  const changePassword = useCallback<SessionValue["changePassword"]>(
    async (current, next) => {
      await api.changePassword(current, next);
    },
    [],
  );

  const deleteAccount = useCallback<SessionValue["deleteAccount"]>(
    async (password) => {
      await api.deleteAccount(password);
      await apply(null);
    },
    [apply],
  );

  const value = useMemo(
    () => ({ ready, profile, mode, offline, signIn, signUp, update, signOut, changePassword, deleteAccount }),
    [ready, profile, mode, offline, signIn, signUp, update, signOut, changePassword, deleteAccount],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
