# SYM Mobile App (Capacitor)

A real Android/iOS app (installable APK, Play Store-ready) that runs the SYM ERP inside a
native shell. All features — logins, dashboard, fees, attendance, WhatsApp sharing — work
exactly as on the web, because it IS the same app, served from your SYM server.

## How it works

The app is a native shell whose screen is your SYM server. Set the server address once in
`capacitor.config.ts` (the `SERVER_URL` constant at the top):

- **Testing on your own Wi-Fi:** `http://YOUR-MAC-IP:3000` (find it with `ipconfig getifaddr en0`),
  and keep the SYM dev server running on your Mac (`npm run dev`).
- **Production:** deploy SYM to Vercel or a VPS, then set `https://your-app.vercel.app`.
  This is what you ship to real users.

After changing the URL, run `npx cap sync android` in this folder.

## Build the Android APK

One-time setup:

1. Install **Android Studio** from https://developer.android.com/studio (includes the Android SDK).
2. In this folder: `npm install` then `npx cap sync android`.

Build:

```bash
npx cap open android     # opens the project in Android Studio
```

In Android Studio: **Build → Build App Bundles / APK(s) → Build APK(s)**.
The APK appears at `android/app/build/outputs/apk/debug/app-debug.apk` —
copy it to any Android phone and install (allow "unknown sources").

Command-line alternative (after Android Studio is installed):

```bash
cd android && ./gradlew assembleDebug
```

## Publish to Play Store

1. In Android Studio: **Build → Generate Signed App Bundle** (create a keystore when prompted — keep it safe).
2. Create a developer account at https://play.google.com/console (one-time $25).
3. Upload the `.aab` file, fill in the store listing, submit for review.

## iOS (optional, needs a Mac + Xcode)

```bash
npm install @capacitor/ios
npx cap add ios
npx cap open ios
```

Then build/archive in Xcode. App Store distribution needs an Apple Developer account ($99/yr).

## Checklist before shipping

- [ ] SYM deployed online (Vercel/VPS) with HTTPS
- [ ] `SERVER_URL` in `capacitor.config.ts` points to that HTTPS URL (and `cleartext` becomes false automatically)
- [ ] `npx cap sync android` run after the change
- [ ] Signed release build, tested on a real phone
