-- Nichevo hesap şeması
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         citext NOT NULL UNIQUE,
  password_hash text   NOT NULL,
  name          text   NOT NULL,
  channel_name  text   NOT NULL DEFAULT '',
  channel_id    text   NOT NULL DEFAULT '',
  plan          text   NOT NULL DEFAULT 'free'  CHECK (plan IN ('free', 'pro')),
  language      text   NOT NULL DEFAULT 'tr'    CHECK (language IN ('tr', 'en')),
  notifications boolean NOT NULL DEFAULT true,
  onboarded     boolean NOT NULL DEFAULT false,
  -- Şifre değişince artar: eski erişim jetonları anında geçersiz olur
  token_version integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE refresh_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Jetonun kendisi saklanmaz, yalnızca SHA-256 özeti
  token_hash  text NOT NULL UNIQUE,
  -- Aynı oturumun döndürülmüş jetonları aynı aileyi paylaşır (yeniden kullanım tespiti)
  family_id   uuid NOT NULL,
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  user_agent  text
);

CREATE INDEX refresh_tokens_user_idx   ON refresh_tokens (user_id);
CREATE INDEX refresh_tokens_family_idx ON refresh_tokens (family_id);
