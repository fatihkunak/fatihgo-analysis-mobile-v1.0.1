import type { FastifyInstance } from "fastify";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import type { GoogleProfile } from "../src/google.js";

const withDb = (url: string, db: string) => {
  const u = new URL(url);
  u.pathname = `/${db}`;
  return u.toString();
};

const JWT = "test-secret-test-secret-test-secret-123456";
const APP = "nichevo://auth";
const WEB = "https://nichevo.fatihgo.com/auth/callback";

let appPool: pg.Pool;
let ownerPool: pg.Pool;
let app: FastifyInstance;
let profile: GoogleProfile;
let exchangeCalls: { code: string; redirectUri: string; nonce: string }[];

const build = () =>
  buildApp({
    pool: appPool,
    jwtSecret: JWT,
    google: {
      clientId: "client-id",
      clientSecret: "client-secret",
      publicUrl: "https://api.example.test",
      exchange: async (code, redirectUri, nonce) => {
        exchangeCalls.push({ code, redirectUri, nonce });
        if (code === "bad") throw new Error("Google reddetti");
        return profile;
      },
    },
  });

beforeAll(() => {
  process.loadEnvFile(".env");
  appPool = new pg.Pool({ connectionString: withDb(process.env.DATABASE_URL!, "nichevo_test") });
  ownerPool = new pg.Pool({ connectionString: withDb(process.env.OWNER_DATABASE_URL!, "nichevo_test") });
});

afterAll(async () => {
  await app.close();
  await appPool.end();
  await ownerPool.end();
});

beforeEach(async () => {
  await ownerPool.query("TRUNCATE users CASCADE");
  profile = { sub: "g-123", email: "kisi@gmail.com", emailVerified: true, name: "Kişi Test" };
  exchangeCalls = [];
  if (app) await app.close();
  app = build();
});

/** start → Google'a yönlendirme → callback'e state ile dönüş; istemciye yönlenen Location'ı verir */
async function flow(redirect = APP, code = "good") {
  const start = await app.inject({ method: "GET", url: `/v1/auth/google/start?redirect=${encodeURIComponent(redirect)}` });
  expect(start.statusCode).toBe(302);
  const g = new URL(start.headers.location as string);
  const cb = await app.inject({ method: "GET", url: `/v1/auth/google/callback?code=${code}&state=${encodeURIComponent(g.searchParams.get("state")!)}` });
  return { start: g, cb, location: cb.headers.location ? new URL(cb.headers.location as string) : null };
}

describe("Google girişi", () => {
  it("sağlayıcı listesi Google'ı açık gösterir", async () => {
    expect((await app.inject({ method: "GET", url: "/v1/auth/providers" })).json()).toEqual({ google: true });
  });

  it("start: doğru Google adresine, doğru geri dönüş ve nonce ile yönlendirir", async () => {
    const { start } = await flow();
    expect(start.origin + start.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(start.searchParams.get("client_id")).toBe("client-id");
    expect(start.searchParams.get("redirect_uri")).toBe("https://api.example.test/v1/auth/google/callback");
    expect(start.searchParams.get("scope")).toBe("openid email profile");
    expect(start.searchParams.get("nonce")!.length).toBeGreaterThan(20);
  });

  it("yeni kullanıcı açar, tek kullanımlık kodu oturuma çevirir", async () => {
    const { location } = await flow();
    expect(location!.protocol).toBe("nichevo:");
    const code = location!.searchParams.get("code")!;
    expect(exchangeCalls).toHaveLength(1);
    expect(exchangeCalls[0]!.nonce.length).toBeGreaterThan(20);

    const ex = await app.inject({ method: "POST", url: "/v1/auth/google/exchange", payload: { code } });
    expect(ex.statusCode).toBe(200);
    const s = ex.json();
    expect(s.user).toMatchObject({ email: "kisi@gmail.com", name: "Kişi Test", hasPassword: false, plan: "free" });
    expect(s.accessToken.split(".")).toHaveLength(3);

    const me = await app.inject({ method: "GET", url: "/v1/me", headers: { authorization: `Bearer ${s.accessToken}` } });
    expect(me.statusCode).toBe(200);
    const { rows } = await ownerPool.query("SELECT password_hash, google_sub FROM users");
    expect(rows).toEqual([{ password_hash: null, google_sub: "g-123" }]);
  });

  it("aynı kod ikinci kez kullanılamaz", async () => {
    const code = (await flow()).location!.searchParams.get("code")!;
    expect((await app.inject({ method: "POST", url: "/v1/auth/google/exchange", payload: { code } })).statusCode).toBe(200);
    expect((await app.inject({ method: "POST", url: "/v1/auth/google/exchange", payload: { code } })).statusCode).toBe(401);
  });

  it("ikinci girişte aynı kullanıcıyı bulur (çoğaltmaz)", async () => {
    await flow();
    await flow();
    expect((await ownerPool.query("SELECT count(*)::int AS n FROM users")).rows[0].n).toBe(1);
  });

  it("web geri dönüş adresine de yönlendirir", async () => {
    const { location } = await flow(WEB);
    expect(location!.origin + location!.pathname).toBe(WEB);
    expect(location!.searchParams.get("code")).toBeTruthy();
  });

  it("izin verilmeyen geri dönüş adresini reddeder (açık yönlendirme yok)", async () => {
    const r = await app.inject({ method: "GET", url: `/v1/auth/google/start?redirect=${encodeURIComponent("https://evil.example/x")}` });
    expect(r.statusCode).toBe(400);
  });

  it("sahte ya da bozuk state ile callback 400 verir ve Google'a gitmez", async () => {
    const r = await app.inject({ method: "GET", url: "/v1/auth/google/callback?code=x&state=bozuk" });
    expect(r.statusCode).toBe(400);
    expect(exchangeCalls).toHaveLength(0);
  });

  it("e-postası şifreli bir hesapta kayıtlıysa bağlamaz (ele geçirme koruması)", async () => {
    await app.inject({ method: "POST", url: "/v1/auth/register", payload: { email: "kisi@gmail.com", password: "correct-horse-1", name: "Önceki" } });
    const { location } = await flow();
    expect(location!.searchParams.get("error")).toBe("EMAIL_EXISTS");
    expect(location!.searchParams.get("code")).toBeNull();
    const { rows } = await ownerPool.query("SELECT google_sub FROM users");
    expect(rows).toEqual([{ google_sub: null }]);
  });

  it("doğrulanmamış Google e-postasını reddeder", async () => {
    profile = { ...profile, emailVerified: false };
    expect((await flow()).location!.searchParams.get("error")).toBe("EMAIL_UNVERIFIED");
    expect((await ownerPool.query("SELECT count(*)::int AS n FROM users")).rows[0].n).toBe(0);
  });

  it("Google kod değişimi başarısızsa hata koduyla uygulamaya döner", async () => {
    expect((await flow(APP, "bad")).location!.searchParams.get("error")).toBe("GOOGLE_FAILED");
  });

  it("kullanıcı izni reddederse GOOGLE_DENIED", async () => {
    const g = new URL((await app.inject({ method: "GET", url: `/v1/auth/google/start?redirect=${encodeURIComponent(APP)}` })).headers.location as string);
    const cb = await app.inject({ method: "GET", url: `/v1/auth/google/callback?error=access_denied&state=${encodeURIComponent(g.searchParams.get("state")!)}` });
    expect(new URL(cb.headers.location as string).searchParams.get("error")).toBe("GOOGLE_DENIED");
  });

  it("bir amaç için üretilen jeton başka amaçta işe yaramaz", async () => {
    const g = new URL((await app.inject({ method: "GET", url: `/v1/auth/google/start?redirect=${encodeURIComponent(APP)}` })).headers.location as string);
    // state jetonu geçiş kodu olarak sunulamaz
    const ex = await app.inject({ method: "POST", url: "/v1/auth/google/exchange", payload: { code: g.searchParams.get("state") } });
    expect(ex.statusCode).toBe(401);
  });
});

describe("şifresiz (Google) hesap", () => {
  const session = async () => {
    const code = (await flow()).location!.searchParams.get("code")!;
    return (await app.inject({ method: "POST", url: "/v1/auth/google/exchange", payload: { code } })).json();
  };

  it("şifreyle girilemez, e-posta/şifre girişi genel hata verir", async () => {
    await session();
    const r = await app.inject({ method: "POST", url: "/v1/auth/login", payload: { email: "kisi@gmail.com", password: "herhangi-bir-sifre" } });
    expect(r.statusCode).toBe(401);
    expect(r.json().error.code).toBe("BAD_CREDENTIALS");
  });

  it("şifre değiştirme 409 NO_PASSWORD verir", async () => {
    const s = await session();
    const r = await app.inject({
      method: "POST",
      url: "/v1/auth/change-password",
      headers: { authorization: `Bearer ${s.accessToken}` },
      payload: { currentPassword: "x", newPassword: "yeni-sifre-12345" },
    });
    expect(r.statusCode).toBe(409);
    expect(r.json().error.code).toBe("NO_PASSWORD");
  });

  it("hesap silme açık onay ister, onayla siler", async () => {
    const s = await session();
    const h = { authorization: `Bearer ${s.accessToken}` };
    expect((await app.inject({ method: "DELETE", url: "/v1/me", headers: h, payload: {} })).statusCode).toBe(403);
    expect((await app.inject({ method: "DELETE", url: "/v1/me", headers: h, payload: { confirm: true } })).statusCode).toBe(204);
    expect((await ownerPool.query("SELECT count(*)::int AS n FROM users")).rows[0].n).toBe(0);
  });
});

describe("Google kapalıyken", () => {
  it("uç noktalar 503 döner ve sağlayıcı listesi google:false der", async () => {
    await app.close();
    app = buildApp({ pool: appPool, jwtSecret: JWT });
    expect((await app.inject({ method: "GET", url: "/v1/auth/providers" })).json()).toEqual({ google: false });
    expect((await app.inject({ method: "GET", url: `/v1/auth/google/start?redirect=${encodeURIComponent(APP)}` })).statusCode).toBe(503);
  });
});
