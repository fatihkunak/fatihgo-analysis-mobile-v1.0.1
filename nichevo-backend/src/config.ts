export interface Config {
  port: number;
  host: string;
  databaseUrl: string;
  jwtSecret: string;
  /** İkisi de tanımlı değilse Google ile giriş kapalıdır */
  google?: { clientId: string; clientSecret: string; publicUrl: string };
}

const need = (env: NodeJS.ProcessEnv, k: string): string => {
  const v = env[k]?.trim();
  if (!v) throw new Error(`${k} tanımlı değil (nichevo-backend/.env)`);
  return v;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const jwtSecret = need(env, "JWT_SECRET");
  if (jwtSecret.length < 32) throw new Error("JWT_SECRET en az 32 karakter olmalı");
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  return {
    port: Number(env.PORT ?? 3102),
    host: env.HOST ?? "127.0.0.1",
    databaseUrl: need(env, "DATABASE_URL"),
    jwtSecret,
    google:
      clientId && clientSecret
        ? { clientId, clientSecret, publicUrl: env.PUBLIC_URL?.trim() || "https://nichevo-api.fatihgo.com" }
        : undefined,
  };
}
