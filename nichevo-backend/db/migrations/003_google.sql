-- Google ile giriş: Google hesabıyla açılan kullanıcının şifresi yoktur.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN google_sub text UNIQUE;
