# Expo Cloud Build - Adım Adım Rehber

## Adım 1: Expo Hesabı Oluşturun
1. https://expo.dev adresine gidin
2. "Sign up" butonuna tıklayın
3. Email ve şifre ile kayıt olun
4. Email adresinizi doğrulayın

## Adım 2: Proje Dosyalarını İndirin
1. Manus Management UI'de "Code" panelini açın
2. "Download all files" butonuna tıklayın
3. ZIP dosyasını bilgisayarınıza indirin
4. Klasöre çıkartın: `fatihgo-mobile`

## Adım 3: Node.js Yükleyin (Eğer yoksa)
- https://nodejs.org adresinden Node.js 18+ indirin
- Yükleyin ve terminali yeniden açın

## Adım 4: Terminalde Proje Klasörüne Gidin
```bash
cd fatihgo-mobile
```

## Adım 5: EAS CLI Yükleyin
```bash
npm install -g eas-cli
```

## Adım 6: Expo'ya Giriş Yapın
```bash
eas login
```
- Email adresinizi girin
- Şifrenizi girin

## Adım 7: Bağımlılıkları Yükleyin
```bash
npm install
# veya
pnpm install
```

## Adım 8: APK Oluşturun
```bash
eas build --platform android
```

### Sorular Sorulacak:
- "Build type?" → **apk** seçin
- "Compression level?" → **default** seçin

## Adım 9: Build Tamamlanmasını Bekleyin
- Build 5-15 dakika sürer
- Terminal'de ilerleme göreceksiniz
- Tamamlandığında indirme linki verilecek

## Adım 10: APK İndirin
```
✓ Build finished!
📱 APK: https://...
```

Linke tıklayın ve APK'yı indirin.

## Adım 11: Android Cihazınıza Yükleyin
1. APK dosyasını Android telefonunuza gönderin
2. Dosya yöneticisinde APK'ya tıklayın
3. "Yükle" butonuna tıklayın
4. Uygulamayı açın ve test edin

---

## iOS için (macOS gerekli)
```bash
eas build --platform ios
```

---

## Sorun Giderme

### "eas: command not found"
```bash
npm install -g eas-cli
```

### "Cannot find module"
```bash
npm install
```

### "Authentication failed"
```bash
eas logout
eas login
```

### "Build failed"
- Expo Cloud Build dashboard'u kontrol edin: https://expo.dev
- Hata mesajını okuyun

---

## İlk Build Sonrası

✓ APK'yı test edin
✓ Tüm 4 tab'ı kontrol edin
✓ Dark mode'u test edin
✓ API key input'unu test edin

Sorun yoksa, Phase 3'e geçebiliriz: YouTube API entegrasyonu

