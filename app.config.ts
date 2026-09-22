import type { ExpoConfig } from 'expo/config';

const NIGHT = '#08090B';

/**
 * L'entitlement com.apple.developer.family-controls doit etre approuve par Apple
 * pour la DISTRIBUTION. Tant qu'il ne l'est pas, l'ajouter fait echouer le build
 * TestFlight : le profil de provisioning ne peut pas le contenir.
 * On l'active avec EXPO_PUBLIC_FAMILY_CONTROLS=1, une fois l'accord recu.
 *   https://developer.apple.com/contact/request/family-controls-distribution
 */
const FAMILY_CONTROLS = process.env.EXPO_PUBLIC_FAMILY_CONTROLS === '1';

const config: ExpoConfig = {
  name: 'UnSwipe',
  slug: 'noreel',
  scheme: ['unswipe', 'noreel'],
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'dark',
  backgroundColor: NIGHT,
  icon: './assets/images/icon.png',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.vikstudios.noreel',
    // Exige par @bacons/apple-targets (via react-native-device-activity) pour
    // generer les cibles d'extension. Sans lui : echec a "Configure Xcode project".
    appleTeamId: 'K792T8TQ4X',
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
    // expo-notifications est applique automatiquement ; celui-ci nettoie apres lui.
    './plugins/withoutPushEntitlement',
    // Pas d'image : l'icone apparaissait une fraction de seconde avant
    // l'animation d'ouverture, ce qui faisait un a-coup. Noir plein, et
    // l'animation enchaine sans couture.
    ['expo-splash-screen', { backgroundColor: NIGHT }],
    ...(FAMILY_CONTROLS
      ? [[
          'react-native-device-activity',
          {
            appGroup: 'group.com.vikstudios.noreel',
            appleTeamId: 'K792T8TQ4X',
            // Aucune extension : la signature multi-cible d'EAS echouait en
            // silence avec 4 cibles. Le blocage de base (choisir des apps,
            // les bloquer) se fait depuis l'app principale seule. On perd
            // l'ecran de blocage personnalise et le suivi programme.
            copyToTargetFolder: false,
          },
        ] as [string, Record<string, unknown>]]
      : []),
  ],
  experiments: { typedRoutes: true },
  extra: { eas: { projectId: '9223efc1-91e7-4011-9441-7d2d8db87422' } },
  owner: 'nutria25',
};

export default config;
