import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";

import {
  AiError,
  PROVIDERS,
  authHeaders,
  chat,
  chatUrl,
  check,
  getProvider,
  listModels,
  parseModelList,
  parseResponse,
  redact,
  requestBody,
  resolve,
  type AiConfig,
} from "../lib/ai-providers";

const cfg = (provider: string, over: Partial<AiConfig> = {}, key = "sk-test-12345678"): AiConfig => ({
  provider,
  model: "",
  baseUrl: "",
  apiKeys: { [provider]: key },
  ...over,
});

describe("sağlayıcı kaydı", () => {
  it("kimlikler benzersiz, adresler https (yerel grup hariç)", () => {
    const ids = PROVIDERS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of PROVIDERS) {
      if (p.baseUrl) expect(p.baseUrl.startsWith("https://") || p.group === "local").toBe(true);
      expect(p.needsKey).toBe(p.group !== "local");
    }
    expect(getProvider("custom")).toBeDefined();
    expect(getProvider("yok")).toBeUndefined();
  });
});

describe("resolve", () => {
  it("sabit sağlayıcı yabancı adresi yok sayar, varsayılan modeli kullanır", () => {
    const c = resolve(cfg("openai", { baseUrl: "https://evil.example" }));
    expect(c.baseUrl).toBe("https://api.openai.com/v1");
    expect(resolve(cfg("mistral")).model).toBe("mistral-small-latest");
  });

  it("ücretli sağlayıcı anahtarsız reddedilir", () => {
    expect(() => resolve(cfg("openai", {}, ""))).toThrowError(AiError);
    try {
      resolve(cfg("openai", {}, "  "));
    } catch (e) {
      expect((e as AiError).code).toBe("NO_KEY");
    }
  });

  it("özel sağlayıcı adres ister; http yalnızca loopback/yerel grupta", () => {
    expect(() => resolve(cfg("custom"))).toThrowError(/adres/i);
    expect(() => resolve(cfg("custom", { baseUrl: "http://example.com/v1" }))).toThrowError(/https/);
    expect(resolve(cfg("custom", { baseUrl: "http://127.0.0.1:8080/v1/", model: "m" })).baseUrl).toBe(
      "http://127.0.0.1:8080/v1",
    );
    expect(() => resolve(cfg("custom", { baseUrl: "https://u:p@example.com/v1" }))).toThrowError(/kullanıcı/);
    expect(() => resolve(cfg("custom", { baseUrl: "ftp://example.com" }))).toThrowError(AiError);
  });

  it("yerel sağlayıcı anahtarsız çalışır ve ağdaki adrese yönlendirilebilir", () => {
    expect(resolve(cfg("ollama", {}, "")).baseUrl).toBe("http://localhost:11434/v1");
    expect(resolve(cfg("ollama", { baseUrl: "http://192.168.1.20:11434/v1" }, "")).baseUrl).toBe(
      "http://192.168.1.20:11434/v1",
    );
    // başka sağlayıcıya ait eski adres geçersiz kılma sayılmaz
    expect(resolve(cfg("ollama", { baseUrl: "https://api.openai.com/v1" }, "")).baseUrl).toBe(
      "http://localhost:11434/v1",
    );
  });

  it("her sağlayıcının anahtarı ayrı tutulur", () => {
    const c = resolve({
      provider: "groq",
      model: "m",
      baseUrl: "",
      apiKeys: { groq: "gsk_groqkey123", openai: "sk-other-key-1" },
    });
    expect(c.apiKey).toBe("gsk_groqkey123");
  });
});

describe("istek biçimleri", () => {
  it("kimlik başlıkları sağlayıcıya göre", () => {
    expect(Object.keys(authHeaders(resolve(cfg("openai"))))).toEqual(["Authorization"]);
    expect(Object.keys(authHeaders(resolve(cfg("evren"))))).toEqual(["x-api-key"]);
    expect(Object.keys(authHeaders(resolve(cfg("anthropic")))).sort()).toEqual(["anthropic-version", "x-api-key"]);
    expect(authHeaders(resolve(cfg("ollama", {}, "")))).toEqual({});
  });

  it("gövde ve adres her API'nin biçimine uyar", () => {
    const turns = [{ role: "user" as const, text: "U" }];
    const o = requestBody(resolve(cfg("openai")), "S", turns, 200) as any;
    expect(o.max_completion_tokens).toBe(200);
    expect(o.max_tokens).toBeUndefined();
    expect(o.messages[0]).toEqual({ role: "system", content: "S" });
    expect(requestBody(resolve(cfg("groq")), "S", turns, 200)).toMatchObject({ max_tokens: 200 });
    const a = requestBody(resolve(cfg("anthropic")), "S", [{ role: "model", text: "x" }], 50) as any;
    expect(a.system).toBe("S");
    expect(a.messages[0].role).toBe("assistant");
    expect(chatUrl(resolve(cfg("anthropic")))).toBe("https://api.anthropic.com/v1/messages");
    expect(chatUrl(resolve(cfg("openai")))).toBe("https://api.openai.com/v1/chat/completions");
  });

  it("yanıt ve model listesi ayrıştırma", () => {
    expect(parseResponse("openai", { choices: [{ message: { content: " OK " } }] })).toBe("OK");
    expect(parseResponse("anthropic", { content: [{ type: "text", text: "KEEP" }] })).toBe("KEEP");
    expect(() => parseResponse("openai", { choices: [] })).toThrowError(AiError);
    expect(parseModelList({ data: [{ id: "b" }, { id: "a" }, { id: "a" }] })).toEqual(["a", "b"]);
    expect(parseModelList({ models: [{ name: "models/gemini-x" }, { name: "models/gemini-a" }] })).toEqual([
      "gemini-a",
      "gemini-x",
    ]);
    expect(parseModelList({ error: "x" })).toEqual([]);
  });

  it("redact anahtarı gizler", () => {
    expect(redact("bad key sk-test-12345678 here", "sk-test-12345678")).toBe("bad key *** here");
  });
});

describe("ağ (yerel sahte sunucu)", () => {
  let server: http.Server | undefined;
  afterEach(() => new Promise<void>((r) => (server ? server.close(() => r()) : r())));

  const serve = (body: string, status = 200) =>
    new Promise<{ url: string; seen: { method?: string; url?: string; auth?: string; body: string }[] }>((resolveP) => {
      const seen: { method?: string; url?: string; auth?: string; body: string }[] = [];
      server = http.createServer((req, res) => {
        let data = "";
        req.on("data", (c) => (data += c));
        req.on("end", () => {
          seen.push({ method: req.method, url: req.url, auth: req.headers.authorization, body: data });
          res.writeHead(status, { "content-type": "application/json" });
          res.end(body);
        });
      });
      server.listen(0, "127.0.0.1", () =>
        resolveP({ url: `http://127.0.0.1:${(server!.address() as AddressInfo).port}/v1`, seen }),
      );
    });

  it("listModels anahtarla /models çağırır", async () => {
    const { url, seen } = await serve('{"data":[{"id":"zeta"},{"id":"alpha"}]}');
    const c = resolve(cfg("custom", { baseUrl: url }));
    expect(await listModels(c)).toEqual(["alpha", "zeta"]);
    expect(seen[0].method).toBe("GET");
    expect(seen[0].url).toBe("/v1/models");
    expect(seen[0].auth).toBe("Bearer sk-test-12345678");
  });

  it("check küçük bir sohbet isteği atar", async () => {
    const { url, seen } = await serve('{"choices":[{"message":{"content":"OK"}}]}');
    const c = resolve(cfg("custom", { baseUrl: url, model: "m1" }));
    expect(await check(c)).toBeGreaterThanOrEqual(0);
    expect(seen[0].method).toBe("POST");
    expect(seen[0].url).toBe("/v1/chat/completions");
    expect(JSON.parse(seen[0].body).model).toBe("m1");
  });

  it("HTTP hatasında anahtar sızmaz", async () => {
    const { url } = await serve('{"error":"invalid key sk-test-12345678"}', 401);
    const c = resolve(cfg("custom", { baseUrl: url, model: "m" }));
    await expect(chat(c, "s", [{ role: "user", text: "u" }])).rejects.toThrowError(/401: .*\*\*\*/);
  });

  it("model yoksa ağa çıkmadan reddeder", async () => {
    const c = resolve(cfg("custom", { baseUrl: "http://127.0.0.1:1/v1" }));
    await expect(chat(c, "s", [{ role: "user", text: "u" }])).rejects.toMatchObject({ code: "NO_MODEL" });
  });
});
