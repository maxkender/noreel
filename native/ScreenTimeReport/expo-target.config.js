/*
 * La cible du rapport Temps d'ecran.
 *
 * C'est une extension ExtensionKit — Apple le verifie a l'envoi sur
 * TestFlight, et refuse un rapport empaquete comme une extension classique.
 * L'outil de cibles ne sait produire ce genre d'extension que sous le type
 * « app-intent » : on le lui declare, et on fournit NOUS-MEMES le Info.plist
 * qui dit a iOS de quel point d'extension il s'agit. L'outil ne recrit ce
 * fichier que s'il manque. Ce que le type fige de travers (iOS 17, un
 * produit nomme .app) est corrige par plugins/withScreenTimeReport.js.
 *
 * Ce dossier vit dans native/ et non dans targets/ : la bibliotheque de
 * blocage ramasse tout ce qui est dans targets/, sans option pour trier.
 * C'est plugins/withScreenTimeReport.js qui l'y copie, seulement quand
 * EXPO_PUBLIC_SCREEN_TIME_REPORT=1 — chaque extension demande son propre
 * profil de provisioning, et on ne l'impose pas a un build qui n'en veut pas.
 */
module.exports = () => ({
  type: 'app-intent',
  name: 'ScreenTimeReport',
  // DeviceActivityReport n'existe qu'a partir d'iOS 16.
  deploymentTarget: '16.0',
  frameworks: ['SwiftUI', 'DeviceActivity', 'FamilyControls', 'ManagedSettings'],
  entitlements: {
    'com.apple.developer.family-controls': true,
    'com.apple.security.application-groups': ['group.com.vikstudios.noreel'],
  },
});
