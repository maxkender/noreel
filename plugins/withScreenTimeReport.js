const fs = require('fs');
const path = require('path');

/**
 * Pose (ou retire) la cible du rapport Temps d'ecran.
 *
 * La bibliotheque de blocage ramasse TOUT ce qui se trouve dans targets/ au
 * moment ou la config s'evalue, sans option pour trier. Notre extension vit
 * donc ailleurs, dans native/, et n'est copiee dans targets/ que quand
 * EXPO_PUBLIC_SCREEN_TIME_REPORT=1 — sinon elle est retiree, pour qu'une
 * copie laissee par un essai precedent ne s'invite pas dans un build qui ne
 * la veut pas.
 *
 * Pourquoi un flag : chaque extension exige son propre profil de
 * provisioning avec le droit family-controls, cree a la main dans le portail
 * Apple (la synchronisation des capacites est desactivee cote EAS parce
 * qu'Apple refuse ce droit par l'API). Tant que ce profil n'existe pas, un
 * build avec la cible echoue a la signature.
 *
 * Ce plugin doit etre liste AVANT react-native-device-activity : la copie se
 * fait de facon synchrone, ici, comme le fait la bibliotheque pour ses
 * propres cibles.
 */
module.exports = function withScreenTimeReport(config) {
  const root = config._internal?.projectRoot ?? process.cwd();
  const src = path.join(root, 'native', 'ScreenTimeReport');
  const dst = path.join(root, 'targets', 'ScreenTimeReport');
  const on = process.env.EXPO_PUBLIC_SCREEN_TIME_REPORT === '1';

  if (!on) {
    if (fs.existsSync(dst)) fs.rmSync(dst, { recursive: true, force: true });
    return config;
  }

  /*
    On COPIE, on n'efface jamais.

    La config s'evalue plusieurs fois : au prebuild, puis de nouveau pendant
    la compilation Xcode, quand Expo relit le manifeste. Entre les deux,
    l'outil de cibles a ecrit dans ce dossier un fichier de droits genere
    (generated.entitlements) dont la signature depend. Vider le dossier a
    chaque passage l'emportait, et le build 90 est mort a la signature :
    « generated.entitlements could not be opened ». Chaque fichier source est
    donc pose un par un, par-dessus, et tout ce que l'outil y a ajoute reste.
  */
  fs.mkdirSync(dst, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    fs.copyFileSync(path.join(src, name), path.join(dst, name));
  }
  return config;
};
