// Yerel şifre sıfırlama: e-posta altyapısı olmadığı için sunucuyu çalıştıran kişi (sen) terminalden yapar.
//   npm run reset-password -- kisi@mail.com
// Rastgele geçici şifre üretir ve BİR KEZ yazdırır; kullanıcının tüm oturumları kapanır.
import { randomBytes } from "node:crypto";
import pg from "pg";

import { hashPassword } from "./password.js";

export async function resetPassword(ownerUrl: string, email: string): Promise<string | null> {
  const temp = randomBytes(12).toString("base64url");
  const pool = new pg.Pool({ connectionString: ownerUrl, max: 1 });
  try {
    const { rowCount } = await pool.query(
      `UPDATE users SET password_hash = $2, token_version = token_version + 1, updated_at = now()
        WHERE email = $1`,
      [email.trim().toLowerCase(), await hashPassword(temp)],
    );
    if (!rowCount) return null;
    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, now())
        WHERE user_id = (SELECT id FROM users WHERE email = $1)`,
      [email.trim().toLowerCase()],
    );
    return temp;
  } finally {
    await pool.end();
  }
}

const email = process.argv[2];
if (!email) {
  console.error("Kullanım: npm run reset-password -- kisi@mail.com");
  process.exit(1);
}
const owner = process.env.OWNER_DATABASE_URL;
if (!owner) throw new Error("OWNER_DATABASE_URL tanımlı değil (.env)");
const temp = await resetPassword(owner, email);
if (!temp) {
  console.error(`Kullanıcı bulunamadı: ${email}`);
  process.exit(2);
}
console.log(`Geçici şifre: ${temp}`);
console.log("Kullanıcı giriş yaptıktan sonra Profil > Şifre bölümünden değiştirmeli.");
