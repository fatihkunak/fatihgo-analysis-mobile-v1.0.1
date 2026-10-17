import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";

// Node'un yerleşik scrypt'i: ek bağımlılık yok. Biçim: scrypt$N$r$p$salt$hash (base64url)
const N = 2 ** 15;
const R = 8;
const P = 1;
const KEYLEN = 64;

const derive = (password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> =>
  new Promise((resolve, reject) =>
    scryptCb(password.normalize("NFKC"), salt, KEYLEN, { N: n, r, p, maxmem: 128 * n * r * 2 }, (e, k) =>
      e ? reject(e) : resolve(k),
    ),
  );

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, N, R, P);
  return ["scrypt", N, R, P, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !n || !r || !p || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = await derive(password, Buffer.from(salt, "base64url"), Number(n), Number(r), Number(p));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// Var olmayan e-posta ile girişte de aynı maliyeti öde (zamanlamayla kullanıcı keşfini zorlaştırır)
let dummy: Promise<string> | undefined;
export const dummyVerify = async (password: string): Promise<void> => {
  dummy ??= hashPassword("nichevo-dummy-password");
  await verifyPassword(password, await dummy);
};
