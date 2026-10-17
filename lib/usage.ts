import AsyncStorage from "@react-native-async-storage/async-storage";

export type UsageKey = "analyses" | "scans" | "plans" | "chats";
export type Usage = Record<UsageKey, number>;

const KEY = "nichevo.usage";
const EMPTY: Usage = { analyses: 0, scans: 0, plans: 0, chats: 0 };

export async function getUsage(): Promise<Usage> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

// Kullanım sayacını artırır; hata olursa sessizce geçer (istatistik kritik değil)
export async function bumpUsage(k: UsageKey): Promise<void> {
  try {
    const u = await getUsage();
    u[k] += 1;
    await AsyncStorage.setItem(KEY, JSON.stringify(u));
  } catch {}
}
