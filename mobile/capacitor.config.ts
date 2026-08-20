import type { CapacitorConfig } from '@capacitor/cli';

// ============================================================
// SET YOUR SERVER URL HERE
// - Local testing (phone on same Wi-Fi as your Mac):
//     url: 'http://192.168.1.5:3000'   <- your Mac's IP, keep cleartext: true
// - Production (after deploying SYM to Vercel or a VPS):
//     url: 'https://your-app.vercel.app'  and remove cleartext
// ============================================================
const SERVER_URL = 'http://192.168.5.247:3000';

const config: CapacitorConfig = {
  appId: 'com.shikshayogi.sym',
  appName: 'Shiksha Yogi',
  webDir: 'www',
  server: {
    url: SERVER_URL,
    cleartext: SERVER_URL.startsWith('http://'),
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#111827',
      showSpinner: false,
    },
  },
};

export default config;
