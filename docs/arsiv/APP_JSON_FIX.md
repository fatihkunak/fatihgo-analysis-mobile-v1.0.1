# app.json Android Package Hatası Çözümü

## 🔴 Hata Mesajı

```
Cannot automatically write to dynamic config at: app.config.ts
Add the following to your Expo config

{
  "android": {
    "package": "com.fatihkunak.apptemplate"
  }
}
```

## ✅ Çözüm

Expo, `app.config.ts` dosyasına otomatik olarak yazamıyor. Bunun yerine `app.json` dosyasını kullan.

### Adım 1: app.json'ı Kontrol Et

`app.json` dosyasında şu satırlar olmalı (satır 27):

```json
"android": {
  "adaptiveIcon": {
    "backgroundColor": "#FFC107",
    "foregroundImage": "./assets/images/logo.png",
    "backgroundImage": "./assets/images/android-icon-background.png",
    "monochromeImage": "./assets/images/android-icon-monochrome.png"
  },
  "edgeToEdgeEnabled": true,
  "predictiveBackGestureEnabled": false,
  "package": "space.manus.fatihgo.mobile.t20260508105023",
  "permissions": ["POST_NOTIFICATIONS"],
  "intentFilters": [...]
}
```

### Adım 2: app.config.ts'i Devre Dışı Bırak

`app.config.ts` dosyasının sonunda (satır 137):

```typescript
// Using app.json instead for EAS compatibility
// export default config;
```

Bu zaten yapılmış olmalı.

### Adım 3: Yeniden Dene

```bash
npx expo prebuild --clean --platform android
```

## 🚀 Beklenen Sonuç

Başarılı olursa:

```
√ Created native directory
√ Updated package.json
✓ Prebuild successful
```

## 💡 İpucu

Eğer hala sorun yaşarsan:

1. **app.json'ı Sil ve Yeniden Oluştur**
   ```bash
   rm app.json
   npx expo prebuild --clean --platform android
   ```

2. **Klasörü Temizle**
   ```bash
   rm -rf android
   npx expo prebuild --clean --platform android
   ```

3. **Hata Mesajını Bana Gönder**

---

**Hazırlayan**: Manus AI Agent
**Tarih**: 10 Mayıs 2026
