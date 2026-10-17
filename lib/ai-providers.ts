// Sağlayıcı kaydı (OpenAI uyumlu sunucular + Anthropic), kimlik çözümleme, model listesi ve sohbet isteği.
// Draxbyte'taki src/ai/providers.rs ile aynı mantık. `defaultModel` yalnızca başlangıç değeridir:
// model adları hızla eskir, bu yüzden arayüz gerçek listeyi sağlayıcıdan çeker.
// Bu dosya React Native'e bağımlı değildir (saf mantık + fetch), vitest ile test edilir.

export type Kind = "openai" | "anthropic";
export type Group = "local" | "free" | "paid" | "other";

export interface ProviderInfo {
  id: string;
  label: string;
  kind: Kind;
  group: Group;
  /** undefined → kullanıcı yazar (özel adres / Alibaba çalışma alanı URL'si) */
  baseUrl?: string;
  /** undefined → kullanıcı model seçmeli (listeyi getir) */
  defaultModel?: string;
  keyUrl?: string;
  /** Yeni OpenAI modelleri `max_completion_tokens` ister */
  maxTokensParam: string;
  /** Kimlik doğrulama `Authorization: Bearer` yerine `X-API-Key` (EVREN) */
  xApiKey: boolean;
  needsKey: boolean;
}

export const GROUP_LABELS: Record<Group, string> = {
  local: "Yerel ağ (ücretsiz, anahtarsız)",
  free: "Ücretsiz katmanı olanlar",
  paid: "Ücretli",
  other: "Diğer",
};

export const GROUP_ORDER: Group[] = ["free", "paid", "local", "other"];

const p = (
  id: string,
  label: string,
  kind: Kind,
  group: Group,
  baseUrl?: string,
  defaultModel?: string,
  keyUrl?: string,
  extra: Partial<ProviderInfo> = {},
): ProviderInfo => ({
  id,
  label,
  kind,
  group,
  baseUrl,
  defaultModel,
  keyUrl,
  maxTokensParam: "max_tokens",
  xApiKey: false,
  needsKey: group !== "local",
  ...extra,
});

export const PROVIDERS: ProviderInfo[] = [
  p("gemini", "Google Gemini", "openai", "free", "https://generativelanguage.googleapis.com/v1beta/openai", "gemini-3.8-flash", "https://aistudio.google.com/apikey"),
  p("groq", "Groq", "openai", "free", "https://api.groq.com/openai/v1", "qwen/qwen3.8-27b", "https://console.groq.com/keys"),
  p("openrouter", "OpenRouter", "openai", "free", "https://openrouter.ai/api/v1", "openrouter/free", "https://openrouter.ai/keys"),
  p("nvidia", "NVIDIA NIM", "openai", "free", "https://integrate.api.nvidia.com/v1", undefined, "https://build.nvidia.com"),
  p("mistral", "Mistral", "openai", "free", "https://api.mistral.ai/v1", "mistral-small-latest", "https://console.mistral.ai/api-keys"),
  p("anthropic", "Anthropic Claude", "anthropic", "paid", "https://api.anthropic.com/v1", "claude-haiku-5-5", "https://console.anthropic.com/settings/keys"),
  p("openai", "OpenAI", "openai", "paid", "https://api.openai.com/v1", "gpt-4o-mini", "https://platform.openai.com/api-keys", {
    maxTokensParam: "max_completion_tokens",
  }),
  p("kimi", "Kimi (Moonshot)", "openai", "paid", "https://api.moonshot.ai/v1", "kimi-k2.6", "https://platform.moonshot.ai/console/api-keys"),
  p("xai", "xAI Grok", "openai", "paid", "https://api.x.ai/v1", undefined, "https://console.x.ai"),
  // Telefon "localhost"a kendi içinden erişir; PC'deki sunucu için ağ adresi (ör. http://192.168.1.20:11434/v1) yazılır.
  p("ollama", "Ollama (ağdaki PC)", "openai", "local", "http://localhost:11434/v1", undefined, "https://ollama.com/download"),
  p("lmstudio", "LM Studio (ağdaki PC)", "openai", "local", "http://localhost:1234/v1", undefined, "https://lmstudio.ai"),
  p("evren", "EVREN LLM", "openai", "other", "https://evren-llmapi.ssyz.org.tr/v1", undefined, "https://evren.ssyz.org.tr/llm-inference/", {
    xApiKey: true,
  }),
  p("alibaba", "Alibaba Qwen (Model Studio)", "openai", "other", undefined, undefined, "https://modelstudio.console.alibabacloud.com/"),
  p("custom", "OpenAI uyumlu (özel adres)", "openai", "other"),
];

export const getProvider = (id: string): ProviderInfo | undefined => PROVIDERS.find((x) => x.id === id);

/** Kullanıcı bu sağlayıcıda adresi yazabilir/değiştirebilir mi? */
export const baseUrlEditable = (info: ProviderInfo): boolean => !info.baseUrl || info.group === "local";

export interface AiConfig {
  provider: string;
  model: string;
  baseUrl: string;
  apiKeys: Record<string, string>;
}

export const DEFAULT_CONFIG: AiConfig = { provider: "gemini", model: "", baseUrl: "", apiKeys: {} };

export interface Creds {
  info: ProviderInfo;
  apiKey: string;
  model: string;
  baseUrl: string;
}

export type AiErrorCode = "NO_PROVIDER" | "NO_KEY" | "BAD_URL" | "NO_MODEL" | "HTTP" | "BAD_RESPONSE";

export class AiError extends Error {
  constructor(
    public code: AiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AiError";
  }
}

const URL_RE = /^(https?):\/\/([^/?#]+)([/?#].*)?$/i;

const isLoopback = (host: string) =>
  host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host.endsWith(".localhost");

/** Anahtarlar düz metin gitmemeli: https, yalnızca loopback ve yerel-ağ grubunda http. */
export function validateBaseUrl(raw: string, info: ProviderInfo): void {
  const m = URL_RE.exec(raw);
  if (!m) throw new AiError("BAD_URL", "Geçerli bir adres değil (https://… olmalı).");
  const [, scheme, authority] = m;
  if (authority.includes("@")) throw new AiError("BAD_URL", "Adres içinde kullanıcı/parola olamaz.");
  const host = authority.replace(/:\d+$/, "").toLowerCase();
  if (scheme.toLowerCase() === "http" && !isLoopback(host) && info.group !== "local") {
    throw new AiError("BAD_URL", "http yalnızca yerel ağ sunucuları için; https kullanın.");
  }
}

/** Kayıtlı ayarı kullanılabilir kimliğe çevirir. */
export function resolve(cfg: AiConfig): Creds {
  const info = getProvider(cfg.provider);
  if (!info) throw new AiError("NO_PROVIDER", "Sağlayıcı seçilmemiş.");
  const typed = cfg.baseUrl.trim().replace(/\/+$/, "");
  // Başka bir sağlayıcıya ait eski adres geçersiz kılma sayılmaz
  const isOverride = typed !== "" && !PROVIDERS.some((x) => x.baseUrl === typed);
  const baseUrl = info.baseUrl && !(info.group === "local" && isOverride) ? info.baseUrl : typed;
  if (!baseUrl) throw new AiError("BAD_URL", "Bu sağlayıcı için adres gerekli.");
  validateBaseUrl(baseUrl, info);
  const model = cfg.model.trim() || info.defaultModel || "";
  const apiKey = (cfg.apiKeys[info.id] ?? "").trim();
  if (info.needsKey && !apiKey) throw new AiError("NO_KEY", `${info.label} için API anahtarı gerekli.`);
  return { info, apiKey, model, baseUrl };
}

export function authHeaders(c: Creds): Record<string, string> {
  if (!c.apiKey) return {};
  if (c.info.kind === "anthropic") return { "x-api-key": c.apiKey, "anthropic-version": "2023-06-01" };
  if (c.info.xApiKey) return { "x-api-key": c.apiKey };
  return { Authorization: `Bearer ${c.apiKey}` };
}

export const chatUrl = (c: Creds) => `${c.baseUrl}${c.info.kind === "anthropic" ? "/messages" : "/chat/completions"}`;

export type ChatTurn = { role: "user" | "model"; text: string };

// Gemini 3.x gibi "düşünen" modeller token bütçesini önce düşünmeye harcar; küçük sınırda yanıt boş döner.
export const MAX_TOKENS = 2048;
const CHECK_TOKENS = 256;

export function requestBody(c: Creds, system: string, turns: ChatTurn[], maxTokens = MAX_TOKENS) {
  if (c.info.kind === "anthropic") {
    return {
      model: c.model,
      max_tokens: maxTokens,
      system,
      messages: turns.map((t) => ({ role: t.role === "model" ? "assistant" : "user", content: t.text })),
    };
  }
  return {
    model: c.model,
    [c.info.maxTokensParam]: maxTokens,
    stream: false,
    messages: [
      { role: "system", content: system },
      ...turns.map((t) => ({ role: t.role === "model" ? "assistant" : "user", content: t.text })),
    ],
  };
}

export function parseResponse(kind: Kind, v: any): string {
  const text: unknown = kind === "anthropic" ? v?.content?.[0]?.text : v?.choices?.[0]?.message?.content;
  const finish = kind === "anthropic" ? v?.stop_reason : v?.choices?.[0]?.finish_reason;
  if ((typeof text !== "string" || !text.trim()) && (finish === "length" || finish === "max_tokens")) {
    throw new AiError("BAD_RESPONSE", "Yanıt token sınırına takıldı (model önce düşünüyor olabilir). Sınırı artırıp tekrar deneyin.");
  }
  if (typeof text !== "string" || !text.trim()) {
    throw new AiError("BAD_RESPONSE", "Beklenmeyen yanıt: " + JSON.stringify(v).slice(0, 200));
  }
  return text.trim();
}

/** `GET /models` gövdesinden model kimlikleri: {data:[{id}]}, {models:[{name:"models/x"}]}, {models:[{id}]} */
export function parseModelList(v: any): string[] {
  const arr: any[] = Array.isArray(v?.data) ? v.data : Array.isArray(v?.models) ? v.models : [];
  const ids = arr
    .map((m) => (typeof m?.id === "string" ? m.id : typeof m?.name === "string" ? m.name : ""))
    .map((s: string) => (s.startsWith("models/") ? s.slice(7) : s))
    .filter((s: string) => s && s.length <= 200);
  return [...new Set(ids)].sort().slice(0, 300);
}

/** Sağlayıcı hata gövdeleri anahtarı yansıtabilir; asla gösterme. */
export function redact(text: string, key: string): string {
  const t = key.length >= 8 ? text.split(key).join("***") : text;
  return t.slice(0, 200);
}

async function request(url: string, init: RequestInit, key: string, timeoutMs: number): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { ...init, signal: ctrl.signal });
    const text = await resp.text();
    if (!resp.ok) throw new AiError("HTTP", `${resp.status}: ${redact(text, key)}`);
    try {
      return JSON.parse(text);
    } catch {
      throw new AiError("BAD_RESPONSE", redact(text, key));
    }
  } catch (e) {
    if (e instanceof AiError) throw e;
    const msg = (e as Error).name === "AbortError" ? "zaman aşımı" : (e as Error).message;
    throw new AiError("HTTP", redact(msg, key));
  } finally {
    clearTimeout(timer);
  }
}

export async function chat(c: Creds, system: string, turns: ChatTurn[], maxTokens = MAX_TOKENS): Promise<string> {
  if (!c.model) throw new AiError("NO_MODEL", "Model seçilmemiş: “Modelleri getir” ile seçin veya adını yazın.");
  const body = await request(
    chatUrl(c),
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(c) },
      body: JSON.stringify(requestBody(c, system, turns, maxTokens)),
    },
    c.apiKey,
    60_000,
  );
  return parseResponse(c.info.kind, body);
}

export async function listModels(c: Creds): Promise<string[]> {
  const url = c.info.kind === "anthropic" ? `${c.baseUrl}/models?limit=100` : `${c.baseUrl}/models`;
  const body = await request(url, { method: "GET", headers: authHeaders(c) }, c.apiKey, 30_000);
  return parseModelList(body);
}

/** Küçük gerçek istek (anahtar + model kontrolü). Süreyi ms olarak döndürür. */
export async function check(c: Creds): Promise<number> {
  const t0 = Date.now();
  await chat(c, "Reply with the single word OK.", [{ role: "user", text: "ping" }], CHECK_TOKENS);
  return Date.now() - t0;
}
