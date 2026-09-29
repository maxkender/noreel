/*
 * La cible du rapport Temps d'ecran.
 *
 * L'outil de cibles ne connait pas le type « rapport » : on la declare
 * comme une extension de suivi (« device-activity-monitor »), qui a les
 * memes frameworks et les memes droits, et on fournit NOUS-MEMES le
 * Info.plist qui dit a iOS qu'il s'agit d'un rapport. L'outil ne recrit ce
 * fichier que s'il manque.
 *
 * Ce dossier vit dans native/ et non dans targets/ : la bibliotheque de
 * blocage ramasse tout ce qui est dans targets/, sans option pour trier.
 * C'est plugins/withScreenTimeReport.js qui l'y copie, seulement quand
 * EXPO_PUBLIC_SCREEN_TIME_REPORT=1 — chaque extension demande son propre
 * profil de provisioning, et on ne l'impose pas a un build qui n'en veut pas.
 */
module.exports = () => ({
  type: 'device-activity-monitor',
  name: 'ScreenTimeReport',
  // DeviceActivityReport n'existe qu'a partir d'iOS 16.
  deploymentTarget: '16.0',
  frameworks: ['SwiftUI'],
  entitlements: {
    'com.apple.developer.family-controls': true,
    'com.apple.security.application-groups': ['group.com.vikstudios.noreel'],
  },
});
