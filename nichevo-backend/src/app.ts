import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import type pg from "pg";
import { z } from "zod";

import {
  ALLOWED_REDIRECTS,
  exchangeCodeWithGoogle,
  googleAuthUrl,
  googleRedirectUri,
  type GoogleConfig,
} from "./google.js";
import { dummyVerify, hashPassword, verifyPassword } from "./password.js";
import {
  ACCESS_TTL_SEC,
  REFRESH_TTL_SEC,
  hashRefreshToken,
  newRefreshToken,
  signAccessToken,
  signPurposeToken,
  verifyAccessToken,
  verifyPurposeToken,
} from "./tokens.js";

interface UserRow {
  id: string;
  email: string;
  /** Google ile açılan hesaplarda null */
  password_hash: string | null;
  google_sub: string | null;
  name: string;
  channel_name: string;
  channel_id: string;
  plan: "free" | "pro";
  language: "tr" | "en";
  notifications: boolean;
  onboarded: boolean;
  token_version: number;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: UserRow;
  }
}

const publicUser = (u: UserRow) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  channelName: u.channel_name,
  channelId: u.channel_id,
  plan: u.plan,
  language: u.language,
  notifications: u.notifications,
  onboarded: u.onboarded,
  hasPassword: u.password_hash !== null,
});

const email = z.string().trim().toLowerCase().email().max(320);
const newPassword = z.string().min(8, "Şifre en az 8 karakter olmalı").max(200);

const registerBody = z.object({
  email,
  password: newPassword,
  name: z.string().trim().min(1).max(100),
  channelName: z.string().trim().max(120).optional(),
});
const loginBody = z.object({ email, password: z.string().min(1).max(200) });
const refreshBody = z.object({ refreshToken: z.string().min(10).max(200) });
const patchBody = z
  .object({
    name: z.string().trim().min(1).max(100),
    channelName: z.string().trim().max(120),
    channelId: z.string().trim().max(64),
    language: z.enum(["tr", "en"]),
    notifications: z.boolean(),
    onboarded: z.boolean(),
  })
  .partial()
  .strict(); // plan gibi sunucuya ait alanlar istemciden değiştirilemez
const changePasswordBody = z.object({ currentPassword: z.string().min(1).max(200), newPassword });
// Şifreli hesap şifresini, Google hesabı (şifresi yok) açık onayı gönderir
const deleteBody = z.object({ password: z.string().min(1).max(200).optional(), confirm: z.literal(true).optional() });
const exchangeBody = z.object({ code: z.string().min(20).max(2000) });

/** Basit bellek içi kayan pencere sınırlayıcı (tek süreçli sunucu için yeterli). */
class RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(private now: () => number) {}
  /** true → sınır aşıldı */
  hit(key: string, max: number, windowMs: number): boolean {
    const t = this.now();
    const arr = (this.hits.get(key) ?? []).filter((x) => t - x < windowMs);
    arr.push(t);
    this.hits.set(key, arr);
    if (this.hits.size > 10_000) for (const [k, v] of this.hits) if (!v.some((x) => t - x < windowMs)) this.hits.delete(k);
    return arr.length > max;
  }
  clear(key: string) {
    this.hits.delete(key);
  }
}

export interface AppOptions {
  pool: pg.Pool;
  jwtSecret: string;
  logger?: boolean;
  now?: () => number;
  /** Tanımlı değilse Google uç noktaları 503 döner ve istemci düğmeyi göstermez */
  google?: GoogleConfig;
}

export function buildApp({ pool, jwtSecret, logger = false, now = Date.now, google }: AppOptions): FastifyInstance {
  const app = Fastify({
    logger: logger ? { level: "info", redact: ["req.headers.authorization"] } : false,
    bodyLimit: 16 * 1024,
    trustProxy: true, // yalnızca 127.0.0.1'e bağlı; önünde cloudflared olabilir (cf-connecting-ip)
  });
  const limiter = new RateLimiter(now);
  const startedAt = now();

  const ipOf = (req: FastifyRequest) => String(req.headers["cf-connecting-ip"] ?? req.ip);
  const fail = (reply: FastifyReply, status: number, code: string, message: string) =>
    reply.code(status).send({ error: { code, message } });

  app.setErrorHandler((err: Error & { statusCode?: number }, _req, reply) => {
    if (err instanceof z.ZodError) {
      return fail(reply, 400, "VALIDATION", err.issues[0]?.message ?? "Geçersiz istek");
    }
    if (err.statusCode && err.statusCode < 500) return fail(reply, err.statusCode, "BAD_REQUEST", err.message);
    app.log.error(err);
    return fail(reply, 500, "INTERNAL", "Sunucu hatası");
  });

  // Web sürümü (nichevo.fatihgo.com) farklı kökenden çağırır; kimlik doğrulama Bearer jetonuyla olduğundan
  // çerez yok, yine de yalnızca bilinen kökenlere izin verilir. Native istemci Origin göndermez.
  const WEB_ORIGINS = new Set(["https://nichevo.fatihgo.com", "http://localhost:8081", "http://localhost:19006"]);
  app.addHook("onRequest", async (req, reply) => {
    const origin = req.headers.origin;
    if (!origin || !WEB_ORIGINS.has(origin)) return;
    reply.header("Access-Control-Allow-Origin", origin).header("Vary", "Origin");
    if (req.method === "OPTIONS") {
      return reply
        .header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
        .header("Access-Control-Allow-Headers", "Content-Type,Authorization")
        .header("Access-Control-Max-Age", "600")
        .code(204)
        .send();
    }
  });

  async function issueSession(user: UserRow, req: FastifyRequest, familyId?: string) {
    const refreshToken = newRefreshToken();
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at, user_agent)
       VALUES ($1, $2, COALESCE($3::uuid, gen_random_uuid()), now() + make_interval(secs => $4), $5)`,
      [user.id, hashRefreshToken(refreshToken), familyId ?? null, REFRESH_TTL_SEC, String(req.headers["user-agent"] ?? "").slice(0, 200)],
    );
    return {
      user: publicUser(user),
      accessToken: await signAccessToken(jwtSecret, user.id, user.token_version),
      refreshToken,
      expiresIn: ACCESS_TTL_SEC,
    };
  }

  const getUserById = async (id: string) =>
    (await pool.query<UserRow>("SELECT * FROM users WHERE id = $1", [id])).rows[0];

  async function authenticate(req: FastifyRequest, reply: FastifyReply) {
    const m = /^Bearer (.+)$/.exec(String(req.headers.authorization ?? ""));
    const claims = m?.[1] ? await verifyAccessToken(jwtSecret, m[1]) : null;
    const user = claims ? await getUserById(claims.userId) : undefined;
    if (!claims || !user || user.token_version !== claims.tokenVersion) {
      return fail(reply, 401, "UNAUTHORIZED", "Oturum geçersiz");
    }
    req.user = user;
  }

  app.get("/", async (_req, reply) => {
    reply.type("text/html; charset=utf-8");
    return "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><title>Nichevo API</title><body style='font-family:system-ui;background:#14101f;color:#e8e4f5;display:grid;place-items:center;height:100vh;margin:0'><div style='text-align:center'><h1>Nichevo API</h1><p>Sunucu çalışıyor. Bu adres uygulama içindir.</p></div>";
  });

  app.get("/healthz", async () => {
    await pool.query("SELECT 1");
    return { ok: true, db: true, uptimeSec: Math.round((now() - startedAt) / 1000) };
  });

  app.post("/v1/auth/register", async (req, reply) => {
    if (limiter.hit(`reg:${ipOf(req)}`, 5, 60 * 60_000)) return fail(reply, 429, "RATE_LIMIT", "Çok fazla deneme, sonra tekrar deneyin");
    const b = registerBody.parse(req.body);
    const hash = await hashPassword(b.password);
    try {
      const { rows } = await pool.query<UserRow>(
        `INSERT INTO users (email, password_hash, name, channel_name) VALUES ($1, $2, $3, $4) RETURNING *`,
        [b.email, hash, b.name, b.channelName ?? ""],
      );
      return reply.code(201).send(await issueSession(rows[0]!, req));
    } catch (e) {
      if ((e as { code?: string }).code === "23505") return fail(reply, 409, "EMAIL_TAKEN", "Bu e-posta zaten kayıtlı");
      throw e;
    }
  });

  app.post("/v1/auth/login", async (req, reply) => {
    const b = loginBody.parse(req.body);
    const ip = ipOf(req);
    const key = `login:${ip}:${b.email}`;
    if (limiter.hit(key, 10, 15 * 60_000) || limiter.hit(`login-ip:${ip}`, 40, 15 * 60_000)) {
      return fail(reply, 429, "RATE_LIMIT", "Çok fazla deneme, 15 dakika sonra tekrar deneyin");
    }
    const user = (await pool.query<UserRow>("SELECT * FROM users WHERE email = $1", [b.email])).rows[0];
    // Google hesabında şifre yoktur; yine de aynı maliyeti öder ve aynı hatayı verir
    const ok = user?.password_hash ? await verifyPassword(b.password, user.password_hash) : (await dummyVerify(b.password), false);
    if (!user || !ok) return fail(reply, 401, "BAD_CREDENTIALS", "E-posta veya şifre hatalı");
    limiter.clear(key);
    return issueSession(user, req);
  });

  app.post("/v1/auth/refresh", async (req, reply) => {
    const { refreshToken } = refreshBody.parse(req.body);
    const hash = hashRefreshToken(refreshToken);
    // Tek atomik güncelleme: aynı jeton iki kez kullanılamaz
    const used = await pool.query<{ user_id: string; family_id: string }>(
      `UPDATE refresh_tokens SET revoked_at = now()
        WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()
        RETURNING user_id, family_id`,
      [hash],
    );
    const row = used.rows[0];
    if (!row) {
      // Daha önce kullanılmış (iptal edilmiş) jeton tekrar geldi → çalınmış olabilir, tüm aileyi kapat
      await pool.query(
        `UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, now())
          WHERE family_id = (SELECT family_id FROM refresh_tokens WHERE token_hash = $1)`,
        [hash],
      );
      return fail(reply, 401, "UNAUTHORIZED", "Oturum süresi doldu, tekrar giriş yapın");
    }
    const user = await getUserById(row.user_id);
    if (!user) return fail(reply, 401, "UNAUTHORIZED", "Oturum geçersiz");
    return issueSession(user, req, row.family_id);
  });

  app.post("/v1/auth/logout", async (req, reply) => {
    const { refreshToken } = refreshBody.parse(req.body);
    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, now())
        WHERE family_id = (SELECT family_id FROM refresh_tokens WHERE token_hash = $1)`,
      [hashRefreshToken(refreshToken)],
    );
    return reply.code(204).send();
  });

  // ---- Google ile giriş (sunucu tarafı kod akışı) ----
  // start → Google → callback → istemciye tek kullanımlık kod → exchange → normal oturum
  const usedCodes = new Map<string, number>(); // jti → bitiş (ms); tek kullanımı sağlar
  const redirectWith = (base: string, params: Record<string, string>) => {
    const u = new URL(base);
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    return u.toString();
  };

  app.get("/v1/auth/providers", async () => ({ google: Boolean(google) }));

  app.get("/v1/auth/google/start", async (req, reply) => {
    if (!google) return fail(reply, 503, "GOOGLE_OFF", "Google girişi bu sunucuda kapalı");
    if (limiter.hit(`gstart:${ipOf(req)}`, 30, 15 * 60_000)) return fail(reply, 429, "RATE_LIMIT", "Çok fazla deneme");
    const { redirect } = z.object({ redirect: z.string().max(300) }).parse(req.query);
    if (!ALLOWED_REDIRECTS.has(redirect)) return fail(reply, 400, "BAD_REDIRECT", "Geçersiz dönüş adresi");
    const nonce = newRefreshToken();
    const state = await signPurposeToken(jwtSecret, "gstate", { redirect, nonce }, 600);
    return reply.redirect(googleAuthUrl(google, state, nonce));
  });

  app.get("/v1/auth/google/callback", async (req, reply) => {
    if (!google) return fail(reply, 503, "GOOGLE_OFF", "Google girişi bu sunucuda kapalı");
    const q = z.object({ code: z.string().optional(), state: z.string().max(2000), error: z.string().optional() }).parse(req.query);
    const st = await verifyPurposeToken(jwtSecret, "gstate", q.state);
    if (!st || typeof st.redirect !== "string" || typeof st.nonce !== "string" || !ALLOWED_REDIRECTS.has(st.redirect)) {
      return reply.code(400).type("text/plain; charset=utf-8").send("Giriş isteği geçersiz ya da süresi dolmuş. Uygulamadan tekrar deneyin.");
    }
    const back = (params: Record<string, string>) => reply.redirect(redirectWith(st.redirect as string, params));
    if (q.error || !q.code) return back({ error: "GOOGLE_DENIED" });

    let profile;
    try {
      const exchange = google.exchange ?? ((c: string, r: string, n: string) => exchangeCodeWithGoogle(google, c, r, n));
      profile = await exchange(q.code, googleRedirectUri(google), st.nonce);
    } catch (e) {
      app.log.warn({ err: (e as Error).message }, "google kod değişimi başarısız");
      return back({ error: "GOOGLE_FAILED" });
    }
    if (!profile.emailVerified) return back({ error: "EMAIL_UNVERIFIED" });

    let user = (await pool.query<UserRow>("SELECT * FROM users WHERE google_sub = $1", [profile.sub])).rows[0];
    if (!user) {
      // Aynı e-postayla şifreli hesap varsa ÇOK dikkat: kayıtta e-posta doğrulaması yok, başkası bu adresle
      // önceden hesap açmış olabilir. Sessizce bağlamak ele geçirmeye yol açar, bu yüzden reddedilir.
      const existing = (await pool.query<UserRow>("SELECT id FROM users WHERE email = $1", [profile.email])).rows[0];
      if (existing) return back({ error: "EMAIL_EXISTS" });
      try {
        user = (
          await pool.query<UserRow>(
            `INSERT INTO users (email, password_hash, google_sub, name) VALUES ($1, NULL, $2, $3) RETURNING *`,
            [profile.email, profile.sub, profile.name.slice(0, 100)],
          )
        ).rows[0];
      } catch (e) {
        if ((e as { code?: string }).code === "23505") return back({ error: "EMAIL_EXISTS" });
        throw e;
      }
    }
    return back({ code: await signPurposeToken(jwtSecret, "gcode", {}, 120, user!.id) });
  });

  app.post("/v1/auth/google/exchange", async (req, reply) => {
    if (limiter.hit(`gex:${ipOf(req)}`, 30, 15 * 60_000)) return fail(reply, 429, "RATE_LIMIT", "Çok fazla deneme");
    const { code } = exchangeBody.parse(req.body);
    const claims = await verifyPurposeToken(jwtSecret, "gcode", code);
    if (!claims || typeof claims.sub !== "string" || typeof claims.jti !== "string" || typeof claims.exp !== "number") {
      return fail(reply, 401, "UNAUTHORIZED", "Giriş kodu geçersiz ya da süresi dolmuş");
    }
    for (const [j, exp] of usedCodes) if (exp < Date.now()) usedCodes.delete(j);
    if (usedCodes.has(claims.jti)) return fail(reply, 401, "UNAUTHORIZED", "Giriş kodu daha önce kullanılmış");
    usedCodes.set(claims.jti, claims.exp * 1000);
    const user = await getUserById(claims.sub);
    if (!user) return fail(reply, 401, "UNAUTHORIZED", "Oturum geçersiz");
    return issueSession(user, req);
  });

  app.get("/v1/me", { preHandler: authenticate }, async (req) => ({ user: publicUser(req.user!) }));

  app.patch("/v1/me", { preHandler: authenticate }, async (req) => {
    const b = patchBody.parse(req.body);
    const cols: Record<string, unknown> = {
      name: b.name,
      channel_name: b.channelName,
      channel_id: b.channelId,
      language: b.language,
      notifications: b.notifications,
      onboarded: b.onboarded,
    };
    const entries = Object.entries(cols).filter(([, v]) => v !== undefined);
    if (!entries.length) return { user: publicUser(req.user!) };
    const sets = entries.map(([k], i) => `${k} = $${i + 2}`).join(", "); // sütun adları sabit listeden, değerler parametreli
    const { rows } = await pool.query<UserRow>(
      `UPDATE users SET ${sets}, updated_at = now() WHERE id = $1 RETURNING *`,
      [req.user!.id, ...entries.map(([, v]) => v)],
    );
    return { user: publicUser(rows[0]!) };
  });

  app.post("/v1/auth/change-password", { preHandler: authenticate }, async (req, reply) => {
    const b = changePasswordBody.parse(req.body);
    if (!req.user!.password_hash) return fail(reply, 409, "NO_PASSWORD", "Bu hesap Google ile açıldı; şifresi yok");
    if (!(await verifyPassword(b.currentPassword, req.user!.password_hash))) {
      return fail(reply, 403, "BAD_CREDENTIALS", "Mevcut şifre hatalı");
    }
    const hash = await hashPassword(b.newPassword);
    const { rows } = await pool.query<UserRow>(
      `UPDATE users SET password_hash = $2, token_version = token_version + 1, updated_at = now()
        WHERE id = $1 RETURNING *`,
      [req.user!.id, hash],
    );
    await pool.query("UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, now()) WHERE user_id = $1", [req.user!.id]);
    return issueSession(rows[0]!, req);
  });

  app.delete("/v1/me", { preHandler: authenticate }, async (req, reply) => {
    const b = deleteBody.parse(req.body);
    if (req.user!.password_hash) {
      if (!b.password || !(await verifyPassword(b.password, req.user!.password_hash))) {
        return fail(reply, 403, "BAD_CREDENTIALS", "Şifre hatalı");
      }
    } else if (b.confirm !== true) {
      return fail(reply, 403, "CONFIRM_REQUIRED", "Hesabı silmek için onay gerekir");
    }
    await pool.query("DELETE FROM users WHERE id = $1", [req.user!.id]); // refresh_tokens ON DELETE CASCADE
    return reply.code(204).send();
  });

  return app;
}
