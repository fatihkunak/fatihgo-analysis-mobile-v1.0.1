import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import type pg from "pg";
import { z } from "zod";

import { dummyVerify, hashPassword, verifyPassword } from "./password.js";
import {
  ACCESS_TTL_SEC,
  REFRESH_TTL_SEC,
  hashRefreshToken,
  newRefreshToken,
  signAccessToken,
  verifyAccessToken,
} from "./tokens.js";

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
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
const deleteBody = z.object({ password: z.string().min(1).max(200) });

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
}

export function buildApp({ pool, jwtSecret, logger = false, now = Date.now }: AppOptions): FastifyInstance {
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
    const ok = user ? await verifyPassword(b.password, user.password_hash) : (await dummyVerify(b.password), false);
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
    if (!(await verifyPassword(b.password, req.user!.password_hash))) {
      return fail(reply, 403, "BAD_CREDENTIALS", "Şifre hatalı");
    }
    await pool.query("DELETE FROM users WHERE id = $1", [req.user!.id]); // refresh_tokens ON DELETE CASCADE
    return reply.code(204).send();
  });

  return app;
}
