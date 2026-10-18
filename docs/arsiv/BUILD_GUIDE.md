# Fatihgo Analysis Mobile - APK/IPA Build Guide

## Problem
Expo EAS CLI requires interactive authentication in the Manus sandbox environment, which causes build failures.

## Solution
Build APK/IPA locally on your computer using Expo CLI.

---

## Option 1: Build APK on Your Computer (Recommended)

### Prerequisites
- Node.js 18+ installed
- npm or pnpm installed
- Git installed
- Expo CLI installed: `npm install -g expo-cli`

### Steps

1. **Clone or Download Project**
   ```bash
   # Download the project files from Manus
   # Extract to a folder on your computer
   cd fatihgo-mobile
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   # or
   npm install
   ```

3. **Build APK for Android**
   ```bash
   # Option A: Build APK directly (requires Android SDK)
   eas build --platform android --local
   
   # Option B: Build using Expo Cloud (requires Expo account)
   eas build --platform android
   ```

4. **Build IPA for iOS**
   ```bash
   # Requires macOS and Xcode
   eas build --platform ios --local
   ```

---

## Option 2: Use Expo Go for Testing (Fastest)

### Steps

1. **Install Expo Go on Your Phone**
   - iOS: Download from App Store
   - Android: Download from Google Play Store

2. **Start Development Server**
   ```bash
   pnpm dev
   ```

3. **Scan QR Code**
   - Open Expo Go app
   - Tap "Scan QR code"
   - Scan the QR code from terminal output
   - App opens on your phone

### Benefits
- ✓ No build needed
- ✓ Hot reload while developing
- ✓ Test all features immediately
- ✓ No APK/IPA file needed

---

## Option 3: Use Expo Cloud Build (Easiest)

### Prerequisites
- Expo account (free at https://expo.dev)
- EAS CLI installed: `npm install -g eas-cli`

### Steps

1. **Login to Expo**
   ```bash
   eas login
   # Enter your Expo credentials
   ```

2. **Initialize EAS (if not done)**
   ```bash
   eas init
   ```

3. **Build APK**
   ```bash
   eas build --platform android
   ```

4. **Build IPA**
   ```bash
   eas build --platform ios
   ```

5. **Download**
   - Wait for build to complete
   - Download APK/IPA from Expo dashboard
   - Install on your device

---

## Project Configuration

### Current Settings
- **App Name:** Fatihgo Analysis Mobile
- **Version:** 1.0.0
- **Bundle ID:** space.manus.fatihgo.mobile.t20260508105023
- **Platforms:** Android (APK) + iOS (IPA)
- **Build System:** EAS (Expo Application Services)

### Files
- `app.config.ts` - Main configuration
- `eas.json` - Build profiles
- `.eas/config.json` - EAS project ID

---

## Troubleshooting

### "EAS project not configured"
**Solution:** Run `eas init` with your Expo account

### "Cannot find Android SDK"
**Solution:** Install Android Studio or set ANDROID_HOME environment variable

### "Xcode not found"
**Solution:** Install Xcode on macOS or use Expo Cloud Build

### "Module not found"
**Solution:** Run `pnpm install` to install dependencies

---

## What's Included

✓ **4 Functional Screens**
- Video Analysis (URL input, 6-phase table)
- Niche Scanning (search, filters, results)
- Video Planner (plan generation)
- Settings (API key management)

✓ **Features**
- Dark mode support
- Turkish localization
- AsyncStorage integration
- Responsive design
- Professional app icon

✓ **Ready for Phase 3**
- YouTube API integration
- PDF/ZIP export
- Chart visualization

---

## Next Steps

1. **Choose a build method** (Expo Go, Local, or Cloud)
2. **Test on your device**
3. **Report any issues**
4. **Proceed to Phase 3: YouTube API Integration**

---

## Support

For detailed Expo documentation, visit:
- https://docs.expo.dev
- https://docs.expo.dev/build/setup/
- https://docs.expo.dev/eas/build/

