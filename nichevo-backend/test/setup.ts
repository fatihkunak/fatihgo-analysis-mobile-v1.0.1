import pg from "pg";

import { runMigrations } from "../src/migrate.js";

const withDb = (url: string, db: string) => {
  const u = new URL(url);
  u.pathname = `/${db}`;
  return u.toString();
};

// Testler ayrı bir veritabanında (nichevo_test) çalışır; geliştirme verisine dokunulmaz.
export default async function setup() {
  process.loadEnvFile(".env");
  const owner = process.env.OWNER_DATABASE_URL!;
  const admin = new pg.Client({ connectionString: withDb(owner, "postgres") });
  await admin.connect();
  try {
    const { rowCount } = await admin.query("SELECT 1 FROM pg_database WHERE datname = 'nichevo_test'");
    if (!rowCount) await admin.query("CREATE DATABASE nichevo_test");
  } finally {
    await admin.end();
  }
  await runMigrations(withDb(owner, "nichevo_test"), process.env.APP_DB_PASSWORD!);
}
