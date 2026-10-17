import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "db", "migrations");

/** Çalışma zamanı rolünü oluşturur/şifresini ayarlar, sonra bekleyen migrasyonları sırayla uygular. */
export async function runMigrations(ownerUrl: string, appPassword: string): Promise<string[]> {
  const c = new pg.Client({ connectionString: ownerUrl });
  await c.connect();
  const applied: string[] = [];
  try {
    // Rol süper kullanıcı DEĞİL; tablo yetkileri 002_grants.sql'de açıkça verilir.
    await c.query(
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nichevo_app') THEN
           CREATE ROLE nichevo_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
         END IF;
       END $$;`,
    );
    await c.query(`ALTER ROLE nichevo_app PASSWORD '${appPassword.replace(/'/g, "''")}'`);
    await c.query(`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
    const done = new Set((await c.query<{ name: string }>("SELECT name FROM schema_migrations")).rows.map((r) => r.name));
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
      if (done.has(file)) continue;
      await c.query("BEGIN");
      try {
        await c.query(readFileSync(join(dir, file), "utf8"));
        await c.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        await c.query("COMMIT");
        applied.push(file);
      } catch (e) {
        await c.query("ROLLBACK");
        throw new Error(`${file} uygulanamadı: ${(e as Error).message}`);
      }
    }
  } finally {
    await c.end();
  }
  return applied;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const owner = process.env.OWNER_DATABASE_URL;
  const pw = process.env.APP_DB_PASSWORD;
  if (!owner || !pw) throw new Error("OWNER_DATABASE_URL ve APP_DB_PASSWORD gerekli (.env)");
  runMigrations(owner, pw).then(
    (a) => console.log(a.length ? `Uygulandı: ${a.join(", ")}` : "Bekleyen migrasyon yok"),
    (e) => {
      console.error(e.message);
      process.exit(1);
    },
  );
}
