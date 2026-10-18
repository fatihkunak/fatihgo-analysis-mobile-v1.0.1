import type { FastifyInstance } from "fastify";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";

const withDb = (url: string, db: string) => {
  const u = new URL(url);
  u.pathname = `/${db}`;
  return u.toString();
};

let app: FastifyInstance;
let appPool: pg.Pool; // çalışma zamanı rolü (nichevo_app): yetkiler gerçekten test edilir
let ownerPool: pg.Pool; // temizlik ve doğrulama
let clock = Date.now();

const JWT = "test-secret-test-secret-test-secret-123456";
const creds = { email: "Test@Nichevo.App", password: "correct-horse-1", name: "Test Kullanıcı" };

beforeAll(() => {
  process.loadEnvFile(".env");
  appPool = new pg.Pool({ connectionString: withDb(process.env.DATABASE_URL!, "nichevo_test") });
  ownerPool = new pg.Pool({ connectionString: withDb(process.env.OWNER_DATABASE_URL!, "nichevo_test") });
  app = buildApp({ pool: appPool, jwtSecret: JWT, now: () => clock });
});

afterAll(async () => {
  await app.close();
  await appPool.end();
  await ownerPool.end();
});

beforeEach(async () => {
  clock = Date.now();
  await ownerPool.query("TRUNCATE users CASCADE");
  // Sınırlayıcı süreç içinde; her test temiz başlasın diye yeni uygulama
  await app.close();
  app = buildApp({ pool: appPool, jwtSecret: JWT, now: () => clock });
});

const post = (url: string, payload: unknown, token?: string) =>
  app.inject({ method: "POST", url, payload: payload as object, headers: token ? { authorization: `Bearer ${token}` } : {} });
const send = (method: "GET" | "PATCH" | "DELETE", url: string, token?: string, payload?: unknown) =>
  app.inject({ method, url, payload: payload as object | undefined, headers: token ? { authorization: `Bearer ${token}` } : {} });

const register = async () => (await post("/v1/auth/register", creds)).json();

describe("kayıt", () => {
  it("hesap açar, e-postayı küçük harfe çevirir, jeton döner", async () => {
    const res = await post("/v1/auth/register", creds);
    expect(res.statusCode).toBe(201);
    const b = res.json();
    expect(b.user).toMatchObject({ email: "test@nichevo.app", name: "Test Kullanıcı", plan: "free", onboarded: false });
    expect(b.user.password_hash).toBeUndefined();
    expect(b.accessToken.split(".")).toHaveLength(3);
    expect(b.refreshToken.length).toBeGreaterThan(30);
    const { rows } = await ownerPool.query("SELECT password_hash FROM users");
    expect(rows[0].password_hash).toMatch(/^scrypt\$/);
    expect(rows[0].password_hash).not.toContain(creds.password);
  });

  it("aynı e-postayı (büyük/küçük harf fark etmez) ikinci kez kabul etmez", async () => {
    await register();
    const res = await post("/v1/auth/register", { ...creds, email: "TEST@nichevo.app" });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("EMAIL_TAKEN");
  });

  it("kısa şifre ve geçersiz e-postayı reddeder", async () => {
    expect((await post("/v1/auth/register", { ...creds, password: "kisa" })).statusCode).toBe(400);
    expect((await post("/v1/auth/register", { ...creds, email: "yok" })).statusCode).toBe(400);
  });
});

describe("giriş", () => {
  it("doğru şifreyle girer; yanlış şifre ile bilinmeyen e-posta aynı mesajı verir", async () => {
    await register();
    const ok = await post("/v1/auth/login", { email: creds.email, password: creds.password });
    expect(ok.statusCode).toBe(200);
    const bad = await post("/v1/auth/login", { email: creds.email, password: "yanlis-sifre" });
    const unknown = await post("/v1/auth/login", { email: "yok@nichevo.app", password: "yanlis-sifre" });
    expect(bad.statusCode).toBe(401);
    expect(unknown.statusCode).toBe(401);
    expect(bad.json()).toEqual(unknown.json());
  });

  it("çok sayıda başarısız denemeden sonra 429 verir ve doğru girişte sayaç sıfırlanır", async () => {
    await register();
    for (let i = 0; i < 10; i++) {
      expect((await post("/v1/auth/login", { email: creds.email, password: "x" })).statusCode).toBe(401);
    }
    expect((await post("/v1/auth/login", { email: creds.email, password: "x" })).statusCode).toBe(429);
    expect((await post("/v1/auth/login", { email: creds.email, password: creds.password })).statusCode).toBe(429);
    clock += 16 * 60_000; // pencere geçti
    expect((await post("/v1/auth/login", { email: creds.email, password: creds.password })).statusCode).toBe(200);
  });
});

describe("profil", () => {
  it("jetonsuz / bozuk jetonla 401", async () => {
    expect((await send("GET", "/v1/me")).statusCode).toBe(401);
    const { accessToken } = await register();
    expect((await send("GET", "/v1/me", accessToken + "x")).statusCode).toBe(401);
    expect((await send("GET", "/v1/me", accessToken)).statusCode).toBe(200);
  });

  it("izinli alanları günceller, plan gibi sunucu alanlarını reddeder", async () => {
    const { accessToken } = await register();
    const res = await send("PATCH", "/v1/me", accessToken, { channelName: "Kanalım", language: "en", onboarded: true });
    expect(res.json().user).toMatchObject({ channelName: "Kanalım", language: "en", onboarded: true, name: "Test Kullanıcı" });
    expect((await send("PATCH", "/v1/me", accessToken, { plan: "pro" })).statusCode).toBe(400);
    expect((await send("PATCH", "/v1/me", accessToken, { language: "de" })).statusCode).toBe(400);
    expect((await send("GET", "/v1/me", accessToken)).json().user.plan).toBe("free");
  });
});

describe("yenileme jetonu", () => {
  it("jetonu döndürür; eski jeton yeniden kullanılırsa tüm oturum ailesi kapanır", async () => {
    const first = await register();
    const r1 = await post("/v1/auth/refresh", { refreshToken: first.refreshToken });
    expect(r1.statusCode).toBe(200);
    const second = r1.json();
    expect(second.refreshToken).not.toBe(first.refreshToken);

    // eski jeton tekrar → çalınmış sayılır
    expect((await post("/v1/auth/refresh", { refreshToken: first.refreshToken })).statusCode).toBe(401);
    // aynı aileden yeni jeton da artık geçersiz
    expect((await post("/v1/auth/refresh", { refreshToken: second.refreshToken })).statusCode).toBe(401);
  });

  it("çıkış oturumu kapatır", async () => {
    const s = await register();
    expect((await post("/v1/auth/logout", { refreshToken: s.refreshToken })).statusCode).toBe(204);
    expect((await post("/v1/auth/refresh", { refreshToken: s.refreshToken })).statusCode).toBe(401);
  });
});

describe("şifre değiştirme ve hesap silme", () => {
  it("şifre değişince eski erişim/yenileme jetonları ölür, yeni şifre çalışır", async () => {
    const s = await register();
    expect((await post("/v1/auth/change-password", { currentPassword: "yanlis", newPassword: "yeni-sifre-123" }, s.accessToken)).statusCode).toBe(403);
    const res = await post("/v1/auth/change-password", { currentPassword: creds.password, newPassword: "yeni-sifre-123" }, s.accessToken);
    expect(res.statusCode).toBe(200);
    expect((await send("GET", "/v1/me", s.accessToken)).statusCode).toBe(401); // token_version arttı
    expect((await post("/v1/auth/refresh", { refreshToken: s.refreshToken })).statusCode).toBe(401);
    expect((await send("GET", "/v1/me", res.json().accessToken)).statusCode).toBe(200);
    expect((await post("/v1/auth/login", { email: creds.email, password: creds.password })).statusCode).toBe(401);
    expect((await post("/v1/auth/login", { email: creds.email, password: "yeni-sifre-123" })).statusCode).toBe(200);
  });

  it("hesabı siler: şifre ister, kullanıcı ve jetonları kaybolur", async () => {
    const s = await register();
    expect((await send("DELETE", "/v1/me", s.accessToken, { password: "yanlis" })).statusCode).toBe(403);
    expect((await send("DELETE", "/v1/me", s.accessToken, { password: creds.password })).statusCode).toBe(204);
    expect((await ownerPool.query("SELECT count(*)::int AS n FROM users")).rows[0].n).toBe(0);
    expect((await ownerPool.query("SELECT count(*)::int AS n FROM refresh_tokens")).rows[0].n).toBe(0);
    expect((await post("/v1/auth/login", { email: creds.email, password: creds.password })).statusCode).toBe(401);
  });
});

describe("veritabanı", () => {
  it("çalışma zamanı rolü süper kullanıcı değil ve şema değiştiremez, ama tablolara erişebilir", async () => {
    const { rows } = await ownerPool.query("SELECT rolsuper FROM pg_roles WHERE rolname = 'nichevo_app'");
    expect(rows[0].rolsuper).toBe(false);
    await expect(appPool.query("CREATE TABLE x_deneme (a int)")).rejects.toThrow();
    await expect(appPool.query("SELECT count(*) FROM users")).resolves.toBeTruthy();
  });

  it("healthz çalışır", async () => {
    const res = await send("GET", "/healthz");
    expect(res.json()).toMatchObject({ ok: true, db: true });
  });
});

describe("CORS (web sürümü)", () => {
  const web = "https://nichevo.fatihgo.com";

  it("bilinen kökene izin verir ve ön kontrole 204 döner", async () => {
    const pre = await app.inject({ method: "OPTIONS", url: "/v1/auth/login", headers: { origin: web, "access-control-request-method": "POST" } });
    expect(pre.statusCode).toBe(204);
    expect(pre.headers["access-control-allow-origin"]).toBe(web);
    expect(pre.headers["access-control-allow-headers"]).toContain("Authorization");
    const res = await app.inject({ method: "GET", url: "/healthz", headers: { origin: web } });
    expect(res.headers["access-control-allow-origin"]).toBe(web);
  });

  it("bilinmeyen kökene başlık vermez; Origin'siz (native) istek etkilenmez", async () => {
    const evil = await app.inject({ method: "GET", url: "/healthz", headers: { origin: "https://evil.example" } });
    expect(evil.statusCode).toBe(200);
    expect(evil.headers["access-control-allow-origin"]).toBeUndefined();
    const native = await app.inject({ method: "GET", url: "/healthz" });
    expect(native.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
