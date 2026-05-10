\# 📱 Fatihgo Analysis Mobile



\*\*YouTube Video Analiz ve Niş Tarama Aracı\*\* — Profesyonel içerik yaratıcıları için mobil uygulama



!\[Version](https://img.shields.io/badge/version-1.0.0-blue.svg)

!\[Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android-green.svg)

!\[License](https://img.shields.io/badge/license-MIT-brightgreen.svg)

!\[React Native](https://img.shields.io/badge/React%20Native-0.81-blue.svg)

!\[Expo](https://img.shields.io/badge/Expo-54-black.svg)



\---



\## 🎯 Özellikler



\### 📊 Video Analizi

\- YouTube video URL'lerinden otomatik bilgi çıkarma

\- 6-aşama video analiz sistemi (Sahne, Süre, Açıklama, Script, Yoğunluk, İlerleme)

\- Video istatistikleri ve kanal bilgileri

\- Desteklenen URL formatları:

&#x20; - `youtube.com/watch?v=...`

&#x20; - `youtu.be/...`

&#x20; - `youtube.com/live/...` (canlı yayınlar)

&#x20; - `youtube.com/embed/...`



\### 🔍 Niş Tarama

\- YouTube kanallarında arama ve filtreleme

\- Abone sayısı filtresi (min/max)

\- Kanal yaşı filtresi

\- Aykırı değer (outlier) tespiti

\- Sonuçları tablo formatında görüntüleme



\### 📝 Video Planner

\- Niş ve konu seçerek video planı oluşturma

\- 6-aşama video prodüksiyon planı

\- Detaylı adım adım rehber



\### ⚙️ Ayarlar

\- YouTube Data API v3 anahtarı yönetimi

\- Gemini API anahtarı (opsiyonel)

\- API bağlantı testi

\- Kaydedilen anahtarları güvenli şekilde saklama (AsyncStorage)



\---



\## 🛠️ Teknoloji Stack



| Teknoloji | Sürüm | Kullanım |

|-----------|-------|---------|

| \*\*React Native\*\* | 0.81 | Mobil uygulama framework'ü |

| \*\*Expo\*\* | 54 | Build ve deployment |

| \*\*Expo Router\*\* | 6 | Navigasyon ve routing |

| \*\*TypeScript\*\* | 5.9 | Tip güvenliği |

| \*\*NativeWind\*\* | 4 | Tailwind CSS for React Native |

| \*\*React Query\*\* | 5.90 | Sunucu veri yönetimi |

| \*\*AsyncStorage\*\* | 2.2 | Yerel veri saklama |

| \*\*Expo Audio\*\* | 1.1 | Ses oynatma |

| \*\*Expo Video\*\* | 3.0 | Video oynatma |



\---



\## 📋 Gereksinimler



\### Geliştirme Ortamı

\- \*\*Node.js\*\* 16+ veya \*\*pnpm\*\* 9.12.0

\- \*\*Expo CLI\*\* (`npm install -g expo-cli`)

\- \*\*Android Studio\*\* (APK oluşturma için)

\- \*\*Xcode\*\* (iOS IPA oluşturma için, macOS gerekli)



\### API Anahtarları

\- \*\*YouTube Data API v3\*\* (Google Cloud Console)

\- \*\*Gemini API\*\* (opsiyonel, gelişmiş özellikler için)



\---



\## 🚀 Hızlı Başlangıç



\### 1. Projeyi Klonla

```bash

git clone https://github.com/fatihkunak/fatihgo-analysis-mobile.git

cd fatihgo-analysis-mobile

```



\### 2. Bağımlılıkları Yükle

```bash

pnpm install

```



\### 3. Geliştirme Sunucusunu Başlat

```bash

pnpm dev

```



Bu komut aynı anda Metro bundler'ı ve backend sunucusunu başlatacak.



\### 4. Uygulamayı Çalıştır



\*\*iOS (macOS gerekli):\*\*

```bash

pnpm ios

```



\*\*Android:\*\*

```bash

pnpm android

```



\*\*Web:\*\*

```bash

pnpm dev:metro

```



\---



\## 📱 APK/IPA Oluşturma



\### Android APK



\#### Seçenek 1: EAS Build (Bulut)

```bash

eas build --platform android

```



\#### Seçenek 2: Yerel Build (Android Studio)

```bash

\# 1. Native dosyaları oluştur

npx expo prebuild --clean --platform android



\# 2. Android Studio'da aç

\# File → Open → android/ klasörünü seç



\# 3. Build menüsünden APK oluştur

\# Build → Build APK(s)



\# 4. APK dosyası

\# android/app/build/outputs/apk/release/app-release.apk

```



\### iOS IPA (macOS gerekli)



```bash

\# 1. Native dosyaları oluştur

npx expo prebuild --clean --platform ios



\# 2. Xcode'da aç

\# open ios/fatihgoAnalysisMobile.xcworkspace



\# 3. Build ve Archive yap

\# Product → Archive



\# 4. App Store Connect'e yükle

```



\---



\## 📁 Proje Yapısı



```

fatihgo-analysis-mobile/

├── app/                          # Expo Router sayfaları

│   ├── \_layout.tsx              # Root layout (providers)

│   ├── (tabs)/

│   │   ├── \_layout.tsx          # Tab bar navigasyonu

│   │   ├── index.tsx            # Video Analizi ekranı

│   │   ├── niche.tsx            # Niş Tarama ekranı

│   │   ├── planner.tsx          # Video Planner ekranı

│   │   ├── settings.tsx         # Ayarlar ekranı

│   │   └── \_\_tests\_\_/           # Ekran testleri

│   └── oauth/

│       └── callback.tsx         # OAuth callback

├── components/                   # Yeniden kullanılabilir bileşenler

│   ├── screen-container.tsx     # SafeArea wrapper

│   ├── app-watermark.tsx        # Watermark ve footer

│   ├── watermark.tsx            # Watermark bileşeni

│   └── ui/

│       └── icon-symbol.tsx      # Tab bar ikonları

├── lib/                          # Yardımcı fonksiyonlar

│   ├── youtube-api.ts           # YouTube API entegrasyonu

│   ├── trpc.ts                  # tRPC client

│   ├── utils.ts                 # Utility fonksiyonlar (cn)

│   ├── theme-provider.tsx       # Tema context

│   └── \_core/                   # Core utilities

├── hooks/                        # Custom React hooks

│   ├── use-colors.ts            # Tema renkleri

│   ├── use-color-scheme.ts      # Dark/light mode

│   └── use-auth.ts              # Auth state

├── constants/                    # Sabitler

│   └── theme.ts                 # Tema konfigürasyonu

├── assets/                       # Statik dosyalar

│   └── images/

│       ├── icon.png             # App icon (512x512)

│       ├── logo.png             # Fatih Kunak logosu

│       ├── splash-icon.png      # Splash screen

│       └── favicon.png          # Web favicon

├── app.json                      # Expo konfigürasyonu

├── app.config.ts                # Dinamik Expo konfigürasyonu

├── package.json                 # Bağımlılıklar

├── pnpm-lock.yaml               # Dependency lock file

├── tailwind.config.js           # Tailwind CSS konfigürasyonu

├── theme.config.js              # Tema renkleri

├── global.css                   # Global Tailwind directives

└── README.md                    # Bu dosya

```



\---



\## 🔑 API Anahtarı Kurulumu



\### YouTube Data API v3



1\. \*\*Google Cloud Console'a git:\*\* https://console.cloud.google.com/



2\. \*\*Yeni proje oluştur:\*\*

&#x20;  - "Select a Project" → "New Project"

&#x20;  - Proje adı: "Fatihgo Analysis"

&#x20;  - "Create" tıkla



3\. \*\*YouTube Data API v3'ü etkinleştir:\*\*

&#x20;  - Arama: "YouTube Data API v3"

&#x20;  - "Enable" tıkla



4\. \*\*API Key oluştur:\*\*

&#x20;  - Sol menü → "Credentials"

&#x20;  - "Create Credentials" → "API Key"

&#x20;  - Key'i kopyala (AIza... ile başlar)



5\. \*\*Uygulamada ayarla:\*\*

&#x20;  - Ayarlar sekmesine git

&#x20;  - YouTube API Key alanına yapıştır

&#x20;  - "Kaydet" tıkla

&#x20;  - "Test Et" butonu ile doğrula



\### Gemini API (Opsiyonel)



1\. \*\*Google AI Studio'ya git:\*\* https://makersuite.google.com/app/apikey



2\. \*\*API Key oluştur:\*\*

&#x20;  - "Create API Key" tıkla

&#x20;  - Key'i kopyala



3\. \*\*Uygulamada ayarla:\*\*

&#x20;  - Ayarlar sekmesine git

&#x20;  - Gemini API Key alanına yapıştır

&#x20;  - "Kaydet" tıkla



\---



\## 🧪 Testler



\### Tüm Testleri Çalıştır

```bash

pnpm test

```



\### Belirli Bir Test Dosyasını Çalıştır

```bash

pnpm test app/(tabs)/\_\_tests\_\_/screens.test.ts

```



\### Watch Modunda Testler

```bash

pnpm test --watch

```



\### Test Kapsamı Raporu

```bash

pnpm test --coverage

```



\---



\## 📊 Ekran Görüntüleri



\### Video Analizi

\- YouTube URL giriş alanı

\- Video bilgileri (başlık, kanal, ID)

\- 6-aşama analiz tablosu

\- Yükleme göstergesi



\### Niş Tarama

\- Arama terimi ve filtreler

\- Sonuçlar tablosu

\- Aykırı değer göstergesi

\- Kanal istatistikleri



\### Video Planner

\- Niş ve konu seçimi

\- 6-aşama prodüksiyon planı

\- Detaylı adım rehberi



\### Ayarlar

\- API anahtarı yönetimi

\- Bağlantı testi

\- Uygulama bilgileri



\---



\## 🎨 Tasarım Sistemi



\### Renkler

| Token | Light | Dark |

|-------|-------|------|

| `primary` | #0a7ea4 | #0a7ea4 |

| `background` | #ffffff | #151718 |

| `surface` | #f5f5f5 | #1e2022 |

| `foreground` | #11181C | #ECEDEE |

| `muted` | #687076 | #9BA1A6 |

| `border` | #E5E7EB | #334155 |

| `success` | #22C55E | #4ADE80 |

| `warning` | #F59E0B | #FBBF24 |

| `error` | #EF4444 | #F87171 |



\### Tipografi

\- \*\*Başlık:\*\* 24px, Bold (font-bold)

\- \*\*Alt Başlık:\*\* 18px, Semibold (font-semibold)

\- \*\*Gövde:\*\* 14px, Regular

\- \*\*Küçük:\*\* 12px, Regular

\- \*\*Çok Küçük:\*\* 10px, Regular



\---



\## 🔒 Güvenlik



\### API Anahtarları

\- AsyncStorage'da şifreli olarak saklanır

\- Hiçbir zaman log'a yazılmaz

\- Sadece HTTPS bağlantılarında gönderilir

\- Düzenli olarak döndürülmesi önerilir



\### Veri Gizliliği

\- Hiçbir kişisel veri sunucuya gönderilmez

\- Tüm veriler cihazda işlenir

\- AsyncStorage'da yerel olarak saklanır



\---



\## 🐛 Bilinen Sorunlar



\- Hiçbir bilinen sorun yok (v1.0.0)



\---



\## 📝 Yapılacaklar



\- \[ ] PDF/ZIP indirme özellikleri

\- \[ ] Grafik gösterim (Chart.js)

\- \[ ] Niş Tarama API entegrasyonu

\- \[ ] Video thumbnail gösterimi

\- \[ ] Gelişmiş filtreleme seçenekleri

\- \[ ] Favoriler ve geçmiş kayıt

\- \[ ] Çok dilli destek (EN, TR, DE)

\- \[ ] Çevrimdışı mod

\- \[ ] Push notifications



\---



\## 🤝 Katkıda Bulunma



Katkılarınız hoş karşılanır! Lütfen şu adımları izleyin:



1\. Fork yap

2\. Feature branch oluştur (`git checkout -b feature/AmazingFeature`)

3\. Değişiklikleri commit et (`git commit -m 'Add some AmazingFeature'`)

4\. Branch'e push et (`git push origin feature/AmazingFeature`)

5\. Pull Request aç



\---



\## 📄 Lisans



Bu proje MIT Lisansı altında lisanslanmıştır. Detaylar için \[LICENSE](LICENSE) dosyasına bakın.



\---



\## 👨‍💻 Geliştirici



\*\*Fatih Kunak\*\*

\- Website: \[www.fatihgo.com](https://www.fatihgo.com)

\- Email: \[info@fatihgo.com](mailto:info@fatihgo.com)

\- GitHub: \[@fatihkunak](https://github.com/Neutrale35)



\---



\## 📞 Destek



Sorun mu yaşıyorsunuz? Lütfen:

1\. \[Issues](https://github.com/fatihkunak/fatihgo-analysis-mobile/issues) sayfasında arayın

2\. Yeni bir issue oluşturun

3\. Email gönderin: info@fatihgo.com



\---



\## 🙏 Teşekkürler



Bu proje aşağıdaki harika kütüphaneler tarafından desteklenmektedir:



\- \[React Native](https://reactnative.dev/)

\- \[Expo](https://expo.dev/)

\- \[NativeWind](https://www.nativewind.dev/)

\- \[TanStack Query](https://tanstack.com/query/)

\- \[tRPC](https://trpc.io/)



\---



\*\*Son Güncelleme:\*\* 10 Mayıs 2026



\*\*Sürüm:\*\* 1.0.0

