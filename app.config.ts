import type { ExpoConfig } from 'expo/config';

const NIGHT = '#0B0D1F';

/**
 * L'entitlement com.apple.developer.family-controls doit etre approuve par Apple
 * pour la DISTRIBUTION. Tant qu'il ne l'est pas, l'ajouter fait echouer le build
 * TestFlight : le profil de provisioning ne peut pas le contenir.
 * On l'active avec EXPO_PUBLIC_FAMILY_CONTROLS=1, une fois l'accord recu.
 *   https://developer.apple.com/contact/request/family-controls-distribution
 */
const FAMILY_CONTROLS = process.env.EXPO_PUBLIC_FAMILY_CONTROLS === '1';

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
    bundleIdentifier: 'com.vikstudios.noreel',
    infoPlist: {
      // Débloque le 120 Hz sur ProMotion (§3).
      CADisableMinimumFrameDurationOnPhone: true,
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.vikstudios.noreel',
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
    ...(FAMILY_CONTROLS
      ? [[
          'react-native-device-activity',
          {
            appGroup: 'group.com.vikstudios.noreel',
            // Les trois extensions requises par FamilyControls.
            shieldConfiguration: { backgroundColor: { red: 11, green: 13, blue: 31, alpha: 1 } },
          },
        ] as [string, Record<string, unknown>]]
      : []),
  ],
  experiments: { typedRoutes: true },
  extra: { eas: { projectId: '9223efc1-91e7-4011-9441-7d2d8db87422' } },
  owner: 'nutria25',
};

export default config;
