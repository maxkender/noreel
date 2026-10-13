import type { ExpoConfig } from 'expo/config';

const NIGHT = '#08090B';

/**
 * L'entitlement com.apple.developer.family-controls doit etre approuve par Apple
 * pour la DISTRIBUTION. Tant qu'il ne l'est pas, l'ajouter fait echouer le build
 * TestFlight : le profil de provisioning ne peut pas le contenir.
 * On l'active avec EXPO_PUBLIC_FAMILY_CONTROLS=1, une fois l'accord recu.
 *   https://developer.apple.com/contact/request/family-controls-distribution
 */
/*
  Le meme jeu de plugins des deux cotes, Android compris : ils n'ecrivent
  que dans le projet Xcode, et un build Android les ignore. Les exclure
  selon la plateforme changeait l'empreinte calculee ici de celle calculee
  chez EAS — et expo-updates refuse un build dont l'empreinte ne correspond pas.
*/
const FAMILY_CONTROLS = process.env.EXPO_PUBLIC_FAMILY_CONTROLS === '1';

const config: ExpoConfig = {
  name: 'UnSwipe',
  slug: 'noreel',
  scheme: ['unswipe', 'noreel'],
  version: '1.1.3',
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
      // Les langues de l'app, déclarées à iOS : c'est ce qui fait que le
      // réglage « Langue préférée » de l'app apparaît, et que l'App Store les liste.
      CFBundleDevelopmentRegion: 'en',
      CFBundleLocalizations: [
        'en', 'fr', 'de', 'tr', 'it', 'es', 'pt', 'nl', 'pl', 'ru', 'sv', 'nb', 'fi',
        'cs', 'sk', 'hu', 'ro', 'el', 'hr', 'sl', 'sr', 'bg', 'et', 'he', 'ar',
      ],
    },
  },
  android: {
    package: 'com.vikstudios.noreel',
    // Rien de plus que ce qu'Expo demande : la WebView, les notifications locales et le reseau.
    permissions: [],
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: NIGHT,
    },
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-localization',
    'expo-apple-authentication',
    // expo-notifications est applique automatiquement ; celui-ci nettoie apres lui.
    './plugins/withoutPushEntitlement',
    // JCenter a ferme : la bibliotheque de cookies ne compile plus sur Android sans ca.
    './plugins/withCookiesGradleFix',
    // Pas d'image : l'icone apparaissait une fraction de seconde avant
    // l'animation d'ouverture, ce qui faisait un a-coup. Noir plein, et
    // l'animation enchaine sans couture.
    // Android exige une image sur l'ecran de lancement — son theme la
    // reference, et sans elle les ressources ne se lient pas. La marque,
    // petite, sur le meme noir. iOS reste sans image.
    ['expo-splash-screen', {
      backgroundColor: NIGHT,
      android: { image: './assets/brand/mark.png', imageWidth: 140, backgroundColor: NIGHT },
    }],
    /*
      Le rapport Temps d'ecran : une extension de plus, derriere son propre
      flag. Ce plugin copie la cible dans targets/ quand
      EXPO_PUBLIC_SCREEN_TIME_REPORT=1 et l'en retire sinon ; il doit passer
      AVANT la bibliotheque, qui ramasse targets/ au moment ou elle s'evalue.
      Avant d'activer le flag : creer l'App ID
      com.vikstudios.noreel.ScreenTimeReport dans le portail Apple, avec
      Family Controls et le groupe group.com.vikstudios.noreel.
    */
    ...(FAMILY_CONTROLS ? ['./plugins/withScreenTimeReport'] : []),
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
  // Mises a jour par-dessus l'air.
  //
  // Apple limite le nombre de binaires qu'une app peut recevoir dans une
  // fenetre courte, et on a atteint cette limite : treize envois dans la
  // journee. Avec expo-updates, tout changement qui ne touche PAS au natif
  // part en quelques secondes sans repasser par Apple. A partir du prochain
  // binaire installe, on ne rebuilde plus que pour du natif.
  runtimeVersion: { policy: 'fingerprint' as const },
  updates: { url: 'https://u.expo.dev/9223efc1-91e7-4011-9441-7d2d8db87422' },

  experiments: { typedRoutes: true },
  extra: { eas: { projectId: '9223efc1-91e7-4011-9441-7d2d8db87422' } },
  owner: 'nutria25',
};

export default config;
