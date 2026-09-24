import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.igembesacco.app',
  appName: 'Igembe SACCO',
  webDir: 'dist',
  plugins: {
    // Branded launch splash (android/app/src/main/res/drawable/splash.xml)
    // shown while the web app loads, instead of a blank screen.
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#15803d',
      androidSplashResourceName: 'splash',
      showSpinner: false
    }
  }
};

export default config;
