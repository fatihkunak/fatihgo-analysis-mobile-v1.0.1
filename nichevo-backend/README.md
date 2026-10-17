# nichevo-backend

Nichevo'nun yerel hesap sunucusu. Scenefx'teki "her şey kendi makinemde" yaklaşımının hafif hali:
**Docker'da Postgres + küçük bir Fastify API** (Supabase yok, bulut yok).

```
telefon ──(adb reverse / Cloudflare Tunnel)──▶ Fastify :3102 ──▶ Postgres (Docker) :5545
```

## Ne yapar
Yalnızca **hesap**: kayıt, giriş, jeton yenileme, çıkış, profil, şifre değiştirme, hesap silme.
API anahtarları (YouTube/AI sağlayıcıları) **cihazda kalır**, sunucuya hiç gönderilmez.

| Uç nokta | Açıklama |
|---|---|
| `GET /healthz` | Sunucu + DB durumu |
| `POST /v1/auth/register` | `{email, password(≥8), name, channelName?}` → oturum |
| `POST /v1/auth/login` | `{email, password}` → oturum (10 deneme/15 dk sınırı) |
| `POST /v1/auth/refresh` | `{refreshToken}` → yeni oturum (jeton döndürülür; eski jeton yeniden kullanılırsa tüm aile kapanır) |
| `POST /v1/auth/logout` | `{refreshToken}` → 204 |
| `POST /v1/auth/change-password` | Bearer + `{currentPassword, newPassword}`; eski tüm oturumlar ölür |
| `GET/PATCH/DELETE /v1/me` | Profil; `DELETE` şifre ister, hesabı ve jetonları siler. `plan` istemciden değiştirilemez |

Oturum: 15 dk'lık erişim jetonu (HS256 JWT, `token_version` ile iptal edilebilir) + 60 gün'lük döndürülen yenileme jetonu (DB'de yalnızca SHA-256 özeti). Parolalar Node'un yerleşik `scrypt`'i ile (N=2¹⁵).

## Kurulum (bir kez)
```bash
# 1) Postgres konteyneri (yeniden başlatmada otomatik kalkar, yalnızca 127.0.0.1)
docker run -d --name nichevo-postgres --restart unless-stopped \
  -p 127.0.0.1:5545:5432 -v nichevo-postgres-data:/var/lib/postgresql/data \
  -e POSTGRES_USER=nichevo_owner -e POSTGRES_PASSWORD=<güçlü-şifre> -e POSTGRES_DB=nichevo \
  postgres:16-alpine

# 2) .env: .env.example'ı kopyala, değerleri doldur (JWT_SECRET ≥ 32 karakter)
# 3) Bağımlılıklar + şema
npm install
npm run migrate
```
Portlar bilerek `5545`/`3102`: `5544` (pmbot-postgres), `5432` (migren-research-db), `3101` (GramiqApi) başka projelerin.

## Çalıştırma
```bash
npm start          # http://127.0.0.1:3102 (elle, geliştirme)
npm test           # gerçek Postgres'e karşı (ayrı nichevo_test veritabanı)
npm run check      # tsc
```

### Açılışta otomatik başlatma (Görev Zamanlayıcı `NichevoApi`)
```powershell
powershell -File deploy\install-task.ps1     # bir kez; yönetici gerekmez
Start-ScheduledTask -TaskName NichevoApi      # hemen başlat
```
Gramiq'teki düzen: `wscript` + `run-hidden.vbs` (pencere yok) + S4U (oturum açmadan). `start-backend.cmd` Docker/Postgres henüz hazır değilse 15 sn bekleyip yeniden dener; günlük `logs/backend.log`.
**Durdurmak** (yalnız kendi sürecini): `deploy\stop.flag` dosyasını oluştur, sonra `Get-NetTCPConnection -LocalPort 3102` → `OwningProcess` sürecini durdur. Yeniden açmak için bayrağı sil ve görevi başlat. (Süreci bayraksız öldürürsen döngü 15 sn sonra yeniden başlatır; bu yeniden başlatmak için de işe yarar.)
Not: yeniden başlatma (reboot) ile açılış henüz denenmedi.

### Şifre sıfırlama (e-posta altyapısı yok)
```bash
npm run reset-password -- kisi@mail.com   # rastgele geçici şifreyi bir kez yazdırır, tüm oturumları kapatır
```
Kullanıcı girişten sonra Profil > Şifre'den değiştirir.

## Telefon bağlantısı
**Geliştirme (USB):** `adb reverse tcp:3102 tcp:3102`, uygulamayı şu ortamla derle:
`NICHEVO_ALLOW_CLEARTEXT=1` (prebuild) ve `EXPO_PUBLIC_API_URL=http://127.0.0.1:3102` (gradle/bundle).
`EXPO_PUBLIC_API_URL` paketleme anında gömülür; verilmezse uygulama **yerel moda** düşer (şifre doğrulanmaz, hesap yalnızca cihazda).

**Gerçek kullanım:** Cloudflare Tunnel ile https adresi (yayın sürümü cleartext olmadan, https ile derlenmeli).

## Tuzaklar (scenefx'ten ders)
- **GRANT unutma:** çalışma rolü `nichevo_app` süper kullanıcı değil; yeni tablo eklerken `002_grants.sql`'deki `DEFAULT PRIVILEGES` kapsar, yine de testte kontrol et. Test, uygulamayı bu rolle çalıştırır.
- Migrasyonlar `nichevo_owner` ile, sunucu `nichevo_app` ile çalışır.
- `.env` git'e girmez.
