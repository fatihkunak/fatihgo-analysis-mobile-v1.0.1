import pg from "pg";

import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

const cfg = loadConfig();
const pool = new pg.Pool({ connectionString: cfg.databaseUrl, max: 10 });
const app = buildApp({ pool, jwtSecret: cfg.jwtSecret, logger: true });

const shutdown = async () => {
  await app.close();
  await pool.end();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await pool.query("SELECT 1"); // veritabanına ulaşılamıyorsa hemen düş
await app.listen({ port: cfg.port, host: cfg.host });
