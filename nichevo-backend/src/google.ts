import { createRemoteJWKSet, jwtVerify } from "jose";

// Google ile giriş: sunucu tarafı yetkilendirme kodu akışı. İstemci yalnızca tarayıcıyı açar; kod değişimi ve
// kimlik doğrulaması burada yapılır, Google gizli anahtarı cihaza hiç inmez.

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
}

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  /** Google'a kayıtlı geri dönüş adresinin kökü, ör. https://nichevo-api.fatihgo.com */
  publicUrl: string;
  /** Testlerde Google'a gitmeden profil döndürmek için */
  exchange?: (code: string, redirectUri: string, nonce: string) => Promise<GoogleProfile>;
}

// Açık yönlendirme olmasın: giriş sonucu yalnızca bu adreslere döner.
export const ALLOWED_REDIRECTS = new Set([
  "nichevo://auth",
  "https://nichevo.fatihgo.com/auth/callback",
  "http://localhost:8081/auth/callback",
]);

export const googleRedirectUri = (g: GoogleConfig) => `${g.publicUrl.replace(/\/+$/, "")}/v1/auth/google/callback`;

export function googleAuthUrl(g: GoogleConfig, state: string, nonce: string): string {
  const q = new URLSearchParams({
    client_id: g.clientId,
    redirect_uri: googleRedirectUri(g),
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q.toString()}`;
}

const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export async function exchangeCodeWithGoogle(g: GoogleConfig, code: string, redirectUri: string, nonce: string): Promise<GoogleProfile> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: g.clientId,
      client_secret: g.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google kod değişimi reddedildi (${res.status})`);
  const idToken = (await res.json()).id_token as string | undefined;
  if (!idToken) throw new Error("Google kimlik jetonu vermedi");
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: g.clientId,
  });
  if (payload.nonce !== nonce) throw new Error("Google nonce uyuşmuyor");
  if (typeof payload.sub !== "string" || typeof payload.email !== "string") throw new Error("Google profili eksik");
  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    emailVerified: payload.email_verified === true,
    name: typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : payload.email.split("@")[0]!,
  };
}
