# Android Studio ile Fatihgo Analysis APK Oluşturma Kılavuzu

## 📋 Ön Koşullar

- Windows 10/11 veya Mac/Linux
- En az 8GB RAM (16GB önerilen)
- 10GB boş disk alanı
- İnternet bağlantısı

---

## 1️⃣ ADIM 1: Android Studio Kurulumu

### Windows'ta Kurulum

1. **Android Studio İndir**
   - https://developer.android.com/studio adresine git
   - "Download Android Studio" butonuna tıkla
   - Windows installer'ı (.exe) indir

2. **Kurulum Sihirbazını Çalıştır**
   - İndirilen `.exe` dosyasını çift tıkla
   - "Next" butonuna tıkla
   - Kurulum konumunu seç (varsayılan: `C:\Program Files\Android\Android Studio`)
   - "Install" butonuna tıkla
   - Kurulum tamamlanana kadar bekle (~5-10 dakika)

3. **İlk Açılış**
   - Android Studio'yu aç
   - "Do not import settings" seçeneğini seç
   - "Next" butonuna tıkla
   - "Standard" kurulum tipini seç
   - "Next" → "Finish" butonlarına tıkla
   - SDK indirmesi başlayacak (~30 dakika)

### Mac'te Kurulum

```bash
# Homebrew kullanarak kurulum (önerilen)
brew install android-studio

# VEYA manuel kurulum:
# 1. https://developer.android.com/studio adresinden DMG dosyasını indir
# 2. DMG dosyasını aç
# 3. Android Studio simgesini Applications klasörüne sürükle
# 4. Applications klasöründen Android Studio'yu aç
```

### Linux'ta Kurulum

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install android-studio

# VEYA manuel:
# 1. https://developer.android.com/studio adresinden Linux ZIP'ini indir
# 2. Çıkart: unzip android-studio-*.zip
# 3. Çalıştır: ./android-studio/bin/studio.sh
```

---

## 2️⃣ ADIM 2: Android SDK Kurulumu

### Android Studio'da SDK Kurulumu

1. **SDK Manager'ı Aç**
   - Android Studio menüsünde: `Tools` → `SDK Manager`
   - VEYA: Sağ üstteki SDK Manager simgesine tıkla

2. **Gerekli SDK'ları Kur**
   - **SDK Platforms** sekmesine tıkla
   - Şu sürümleri işaretle:
     - ✅ Android 14 (API 34)
     - ✅ Android 13 (API 33)
     - ✅ Android 12 (API 31)
     - ✅ Android 11 (API 30)
   - "Apply" → "OK" butonlarına tıkla
   - İndirme başlayacak (~2-3 GB, 15-20 dakika)

3. **SDK Tools'u Kur**
   - **SDK Tools** sekmesine tıkla
   - Şu araçları işaretle:
     - ✅ Android SDK Build-Tools (latest)
     - ✅ Android Emulator
     - ✅ Android SDK Platform-Tools
     - ✅ Google Play services
   - "Apply" → "OK" butonlarına tıkla

4. **Kurulum Tamamla**
   - Tüm indirmeler tamamlanana kadar bekle
   - "Finish" butonuna tıkla

---

## 3️⃣ ADIM 3: Java Development Kit (JDK) Kurulumu

### Windows'ta JDK Kurulumu

1. **JDK İndir**
   - https://www.oracle.com/java/technologies/downloads/ adresine git
   - "JDK 17" (veya daha yeni) seç
   - Windows x64 installer'ı (.exe) indir

2. **Kurulum Yap**
   - İndirilen `.exe` dosyasını çift tıkla
   - "Next" butonuna tıkla
   - Kurulum konumunu seç (varsayılan: `C:\Program Files\Java\jdk-17`)
   - "Install" butonuna tıkla

3. **Ortam Değişkenlerini Ayarla**
   - Windows Arama çubuğuna "Environment Variables" yaz
   - "Edit the system environment variables" aç
   - "Environment Variables..." butonuna tıkla
   - "New..." butonuna tıkla (System variables altında)
   - **Variable name**: `JAVA_HOME`
   - **Variable value**: `C:\Program Files\Java\jdk-17` (kurulum yoluna göre değiştir)
   - "OK" butonlarına tıkla
   - Bilgisayarı yeniden başlat

### Mac/Linux'ta JDK Kurulumu

```bash
# Mac (Homebrew)
brew install openjdk@17

# Ubuntu/Debian
sudo apt-get install openjdk-17-jdk

# Kurulumu doğrula
java -version
```

---

## 4️⃣ ADIM 4: Proje Dosyalarını Hazırla

### Windows'ta

1. **ZIP Dosyasını Çıkart**
   - `fatihgo-mobile-final.zip` dosyasını indir
   - Sağ tıkla → "Extract All..." seç
   - Çıkarma konumunu seç (örn: `C:\Users\YourName\Projects\fatihgo-mobile`)
   - "Extract" butonuna tıkla

2. **Komut İstemini Aç**
   - Windows tuşu + R
   - `cmd` yaz ve Enter tuş
   - Proje klasörüne git:
     ```bash
     cd C:\Users\YourName\Projects\fatihgo-mobile
     ```

### Mac/Linux'ta

```bash
# ZIP dosyasını çıkart
unzip fatihgo-mobile-final.zip
cd fatihgo-mobile

# Terminal'de proje klasörüne git
```

---

## 5️⃣ ADIM 5: Bağımlılıkları Yükle

### pnpm Kurulumu

**Windows (PowerShell'de)**
```powershell
npm install -g pnpm
```

**Mac/Linux**
```bash
npm install -g pnpm
```

### Proje Bağımlılıklarını Yükle

```bash
cd fatihgo-mobile
pnpm install
```

Kurulum tamamlanana kadar bekle (~5-10 dakika).

---

## 6️⃣ ADIM 6: Native Dosyaları Oluştur

```bash
npx expo prebuild --clean --platform android
```

Bu komut:
- `android/` klasörünü oluşturur
- Tüm native konfigürasyonları hazırlar
- Gradle build dosyalarını oluşturur

Tamamlanması ~5 dakika sürer.

---

## 7️⃣ ADIM 7: Android Studio'da Proje Aç

1. **Android Studio'yu Aç**
   - Android Studio başlat
   - "Open an existing Android Studio project" seç

2. **Proje Klasörünü Seç**
   - Proje klasöründeki `android/` klasörünü seç
   - (Örn: `C:\Users\YourName\Projects\fatihgo-mobile\android`)
   - "Open" butonuna tıkla

3. **Gradle Senkronizasyonunu Bekle**
   - Android Studio, Gradle dosyalarını senkronize edecek
   - Sağ üstteki "Sync Now" mesajına tıkla (eğer görünürse)
   - Senkronizasyon tamamlanana kadar bekle (~5 dakika)

---

## 8️⃣ ADIM 8: APK Oluştur (Build)

### Yöntem 1: Android Studio GUI'den

1. **Build Menüsünü Aç**
   - Menüde: `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`

2. **Build Başlasın**
   - Alt kısımda "Build" paneli açılacak
   - Derleme başlayacak (~10-15 dakika)
   - İlerleme çubuğu göreceksin

3. **Build Tamamlandı**
   - "Build successful" mesajı görünecek
   - "Locate" butonuna tıkla
   - APK dosyasının konumunu göreceksin

### Yöntem 2: Komut Satırından (Daha Hızlı)

```bash
cd android
./gradlew assembleRelease
```

**Windows'ta:**
```bash
cd android
gradlew.bat assembleRelease
```

Tamamlandığında:
```
BUILD SUCCESSFUL in XXs
```

---

## 9️⃣ ADIM 9: APK Dosyasını Bul

### Build Başarılı Olursa

APK dosyası şu konumda olacak:

**Android Studio GUI'den build ettiysen:**
- Windows: `android\app\release\app-release.apk`
- Mac/Linux: `android/app/release/app-release.apk`

**Komut satırından build ettiysen:**
- Windows: `android\app\build\outputs\apk\release\app-release.apk`
- Mac/Linux: `android/app/build/outputs/apk/release/app-release.apk`

---

## 🔟 ADIM 10: APK'yı Test Et

### Android Telefonuna Yükle

**USB Bağlantısı ile:**
1. Android telefonunu USB kablosu ile bilgisayara bağla
2. Telefonda "USB Debugging" özelliğini aç
   - Ayarlar → Geliştirici Seçenekleri → USB Debugging
3. APK dosyasını telefonun depolama alanına kopyala
4. Telefonda dosya yöneticisini aç
5. APK dosyasını tap et
6. "Install" butonuna tap et

**Android Emülatörü ile:**
1. Android Studio'da: `Tools` → `AVD Manager`
2. Bir emülatör seç ve "Play" butonuna tıkla
3. Emülatör başladıktan sonra:
   ```bash
   adb install android/app/release/app-release.apk
   ```

---

## ⚠️ Sık Karşılaşılan Sorunlar

### Sorun 1: "JAVA_HOME not set"
**Çözüm:**
```bash
# Windows PowerShell'de
$env:JAVA_HOME = "C:\Program Files\Java\jdk-17"

# Mac/Linux'ta
export JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home
```

### Sorun 2: "Gradle build failed"
**Çözüm:**
```bash
cd android
./gradlew clean
./gradlew assembleRelease
```

### Sorun 3: "SDK not found"
**Çözüm:**
1. Android Studio → `Tools` → `SDK Manager`
2. "Android SDK Location" kontrol et
3. Gerekli SDK'ları yeniden kur

### Sorun 4: "Insufficient storage"
**Çözüm:**
- Disk alanı kontrol et (en az 10GB boş)
- Gereksiz dosyaları sil
- `android/build/` klasörünü sil ve yeniden build et

---

## ✅ Kontrol Listesi

- [ ] Android Studio kurulu
- [ ] Android SDK kurulu (API 30+)
- [ ] JDK 17+ kurulu
- [ ] JAVA_HOME ortam değişkeni ayarlandı
- [ ] pnpm kurulu
- [ ] Proje bağımlılıkları yüklendi (`pnpm install`)
- [ ] Native dosyalar oluşturuldu (`npx expo prebuild`)
- [ ] Android Studio'da proje açıldı
- [ ] Gradle senkronizasyonu tamamlandı
- [ ] APK build başarılı
- [ ] APK dosyası bulundu

---

## 📞 Yardım

**Daha fazla bilgi:**
- Android Studio Docs: https://developer.android.com/studio/intro
- Expo Prebuild: https://docs.expo.dev/build/setup/
- Gradle Build: https://docs.gradle.org/

**Sorun varsa:**
1. Hata mesajını oku
2. Google'da ara: `[hata mesajı] android studio`
3. Stack Overflow'da ara: https://stackoverflow.com/questions/tagged/android-studio

---

**Hazırlayan**: Manus AI Agent
**Tarih**: 10 Mayıs 2026
**Proje**: Fatihgo Analysis Mobile
