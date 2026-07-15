# Android Prebuild Hatası Çözümü

## 🔴 Hata Mesajı

```
Error: [android.dangerous]: withAndroidDangerousBaseMod: ENOENT: no such file or directory, open 
'C:\Users\Fatih\Downloads\fatihgo-mobile (2)\assets\images\android-icon-foreground.png'
```

## ✅ Çözüm

Eksik dosyalar ZIP'e dahil edilmemiş. Aşağıdaki adımları takip et:

### Seçenek 1: Yeni ZIP Dosyasını Kullan (Önerilen)

1. **Yeni ZIP'i İndir**
   - `fatihgo-mobile-complete.zip` dosyasını indir
   - Eski klasörü sil: `fatihgo-mobile (2)`
   - Yeni ZIP'i çıkart

2. **Komutları Çalıştır**
   ```bash
   cd fatihgo-mobile
   pnpm install
   npx expo prebuild --clean --platform android
   ```

### Seçenek 2: Eksik Dosyaları Manuel Ekle

Eğer yeni ZIP indirmek istemiyorsan:

1. **Dosyaları Kopyala**
   - Şu dosyaları bul ve kopyala:
     - `assets/images/android-icon-foreground.png`
     - `assets/images/android-icon-background.png`
     - `assets/images/android-icon-monochrome.png`
     - `assets/images/logo.png`
     - `assets/images/favicon.png`

2. **Proje Klasörüne Yapıştır**
   - `C:\Users\Fatih\Downloads\fatihgo-mobile (2)\assets\images\` klasörüne yapıştır

3. **Yeniden Dene**
   ```bash
   cd C:\Users\Fatih\Downloads\fatihgo-mobile (2)
   npx expo prebuild --clean --platform android
   ```

### Seçenek 3: Hızlı Düzeltme (Terminal)

Eğer dosyaların nerede olduğunu biliyorsan:

```bash
# Dosyaları kopyala
copy "C:\source\android-icon-foreground.png" "C:\Users\Fatih\Downloads\fatihgo-mobile (2)\assets\images\"
copy "C:\source\android-icon-background.png" "C:\Users\Fatih\Downloads\fatihgo-mobile (2)\assets\images\"
copy "C:\source\android-icon-monochrome.png" "C:\Users\Fatih\Downloads\fatihgo-mobile (2)\assets\images\"
copy "C:\source\logo.png" "C:\Users\Fatih\Downloads\fatihgo-mobile (2)\assets\images\"
copy "C:\source\favicon.png" "C:\Users\Fatih\Downloads\fatihgo-mobile (2)\assets\images\"

# Yeniden dene
npx expo prebuild --clean --platform android
```

## 📁 Gerekli Dosyalar

Şu dosyaların `assets/images/` klasöründe olması gerekir:

| Dosya Adı | Boyut | Açıklama |
|-----------|-------|----------|
| `logo.png` | 386 KB | Ana logo (Fatih Kunak) |
| `icon.png` | 243 KB | App icon |
| `favicon.png` | 386 KB | Web favicon |
| `android-icon-foreground.png` | 248 KB | Android adaptive icon (ön) |
| `android-icon-background.png` | 18 KB | Android adaptive icon (arka) |
| `android-icon-monochrome.png` | 4 KB | Android adaptive icon (monokrom) |
| `splash-icon.png` | 386 KB | Splash screen |

## ✅ Kontrol

Dosyaları kopyaladıktan sonra, `assets/images/` klasöründe şu dosyaları göreceksin:

```
assets/images/
├── android-icon-background.png
├── android-icon-foreground.png
├── android-icon-monochrome.png
├── favicon.png
├── icon.png
├── logo.png
├── splash-icon.png
└── [diğer dosyalar]
```

## 🚀 Sonraki Adım

Dosyaları ekledikten sonra:

```bash
npx expo prebuild --clean --platform android
```

Başarılı olursa:

```
✓ Created native directory
✓ Updated package.json
✓ Prebuild successful
```

## 💡 İpucu

Eğer hala sorun yaşarsan:

1. **Klasörü Temizle**
   ```bash
   npx expo prebuild --clean
   ```

2. **Yeniden Dene**
   ```bash
   npx expo prebuild --clean --platform android
   ```

3. **Hata Mesajını Bana Gönder**
   - Hata mesajını kopyala ve bana gönder
   - Hangi dosyaların eksik olduğunu söyleyeceğim

---

**Hazırlayan**: Manus AI Agent
**Tarih**: 10 Mayıs 2026
