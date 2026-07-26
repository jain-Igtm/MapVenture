/// <reference types="@capacitor/splash-screen" />
/// <reference types="@capacitor/status-bar" />

import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.jainigtm.mapventure.moon',
  appName: 'MapVenture Moon',
  webDir: 'dist',
  backgroundColor: '#0b1514',
  loggingBehavior: 'debug',
  android: {
    allowMixedContent: false,
    appendUserAgent: ' MapVenture-Moon/1.0 (+https://github.com/jain-Igtm/MapVenture)',
    backgroundColor: '#0b1514'
  },
  server: {
    hostname: 'localhost',
    androidScheme: 'https',
    cleartext: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 900,
      launchAutoHide: true,
      launchFadeOutDuration: 220,
      backgroundColor: '#0b1514',
      androidScaleType: 'CENTER_INSIDE',
      showSpinner: false
    },
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK'
    },
    SystemBars: {
      insetsHandling: 'css',
      style: 'DARK'
    }
  }
}

export default config
