const fs = require('fs');
const path = require('path');
const { withMod } = require('@expo/config-plugins');

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
 * propres cibles. Et c'est aussi ce qui place sa retouche du projet Xcode
 * APRES celle de l'outil de cibles — les retouches s'executent dans l'ordre
 * inverse de leur enregistrement.
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

  /*
    Un rapport Temps d'ecran est une extension ExtensionKit.

    Apple l'exige a la validation : « it must be built as an ExtensionKit
    extension » — dans le dossier Extensions/ de l'app, pas PlugIns/, avec
    la cle EXAppExtensionAttributes. L'outil de cibles ne sait produire ce
    genre d'extension que pour un type, « app-intent », qu'on lui declare
    donc. Mais ce type fige deux choses qu'on corrige ici, une fois la cible
    creee : il vise iOS 17 alors que le rapport existe depuis iOS 16, et il
    nomme le produit « .app » alors qu'une extension, meme ExtensionKit,
    est un « .appex ».

    Le nom du mod est celui que l'outil de cibles donne au sien : c'est le
    meme projet, ouvert une fois, que les deux retouchent.
  */
  return withMod(config, {
    platform: 'ios',
    mod: 'xcodeProjectBeta2',
    action(cfg) {
      const project = cfg.modResults;
      const target = project?.rootObject?.props?.targets?.find(
        (t) => t?.props?.name === 'ScreenTimeReport',
      );
      if (!target) {
        throw new Error('withScreenTimeReport : la cible ScreenTimeReport manque au projet Xcode.');
      }
      target.setBuildSetting('IPHONEOS_DEPLOYMENT_TARGET', '16.0');
      const ref = target.props.productReference;
      if (ref?.props?.path?.endsWith('.app')) {
        ref.props.path = `${ref.props.path.slice(0, -'.app'.length)}.appex`;
      }
      return cfg;
    },
  });
};
