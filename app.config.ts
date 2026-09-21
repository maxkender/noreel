import type { ExpoConfig } from 'expo/config';

const NIGHT = '#0B0D1F';

const config: ExpoConfig = {
  name: 'NoReel',
  slug: 'noreel',
  scheme: 'noreel',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'dark',
  backgroundColor: NIGHT,
  icon: './assets/images/icon.png',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.nutria25.noreel',
    infoPlist: {
      // Débloque le 120 Hz sur ProMotion (§3).
      CADisableMinimumFrameDurationOnPhone: true,
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.nutria25.noreel',
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: NIGHT,
    },
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-localization',
    ['expo-splash-screen', { backgroundColor: NIGHT, image: './assets/images/splash-icon.png', imageWidth: 180 }],
  ],
  experiments: { typedRoutes: true },
  extra: { eas: { projectId: '9223efc1-91e7-4011-9441-7d2d8db87422' } },
  owner: 'nutria25',
};

export default config;
