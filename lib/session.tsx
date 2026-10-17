import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

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

const KEY = "nichevo.profile";

type SessionValue = {
  ready: boolean;
  profile: Profile | null;
  signIn: (p: Pick<Profile, "email"> & Partial<Profile>) => Promise<void>;
  update: (patch: Partial<Profile>) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setProfile(JSON.parse(raw)))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const persist = useCallback(async (p: Profile | null) => {
    setProfile(p);
    try {
      if (p) await AsyncStorage.setItem(KEY, JSON.stringify(p));
      else await AsyncStorage.removeItem(KEY);
    } catch {}
  }, []);

  const signIn = useCallback<SessionValue["signIn"]>(
    async (p) => {
      const existing = profile && profile.email === p.email ? profile : null;
      await persist({
        name: p.name || existing?.name || p.email.split("@")[0],
        email: p.email,
        channelName: p.channelName ?? existing?.channelName ?? "",
        channelId: existing?.channelId ?? "",
        plan: existing?.plan ?? "Ücretsiz",
        language: existing?.language ?? "Türkçe",
        notifications: existing?.notifications ?? true,
        onboarded: existing?.onboarded ?? false,
      });
    },
    [persist, profile],
  );

  const update = useCallback<SessionValue["update"]>(
    async (patch) => {
      if (profile) await persist({ ...profile, ...patch });
    },
    [persist, profile],
  );

  const signOut = useCallback(() => persist(null), [persist]);

  const value = useMemo(
    () => ({ ready, profile, signIn, update, signOut }),
    [ready, profile, signIn, update, signOut],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
