import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

export const ACCESS_TTL_SEC = 15 * 60;
export const REFRESH_TTL_SEC = 60 * 60 * 24 * 60; // 60 gün
const ISSUER = "nichevo";

const key = (secret: string) => new TextEncoder().encode(secret);

export async function signAccessToken(secret: string, userId: string, tokenVersion: number): Promise<string> {
  return new SignJWT({ tv: tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SEC}s`)
    .sign(key(secret));
}

export async function verifyAccessToken(
  secret: string,
  token: string,
): Promise<{ userId: string; tokenVersion: number } | null> {
  try {
    const { payload } = await jwtVerify(token, key(secret), { issuer: ISSUER, algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.tv !== "number") return null;
    return { userId: payload.sub, tokenVersion: payload.tv };
  } catch {
    return null;
  }
}

// Kısa ömürlü, amaca bağlı jetonlar (Google akışında `state` ve tek kullanımlık geçiş kodu).
// `pur` alanı farklı amaçların birbiri yerine kullanılmasını engeller.
export async function signPurposeToken(
  secret: string,
  purpose: string,
  claims: Record<string, unknown>,
  ttlSec: number,
  subject?: string,
): Promise<string> {
  const jwt = new SignJWT({ ...claims, pur: purpose })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setJti(randomBytes(12).toString("base64url"))
    .setExpirationTime(`${ttlSec}s`);
  if (subject) jwt.setSubject(subject);
  return jwt.sign(key(secret));
}

export async function verifyPurposeToken(
  secret: string,
  purpose: string,
  token: string,
): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, key(secret), { issuer: ISSUER, algorithms: ["HS256"] });
    return payload.pur === purpose ? (payload as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export const newRefreshToken = (): string => randomBytes(32).toString("base64url");
export const hashRefreshToken = (t: string): string => createHash("sha256").update(t).digest("hex");
