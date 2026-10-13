const { withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

/**
 * Retire `jcenter()` du build.gradle de @react-native-cookies/cookies.
 *
 * JCenter a ferme, et Gradle 9 ne connait plus cette methode : le build
 * Android s'arretait net sur « Could not find method jcenter() ». La
 * bibliotheque n'a pas publie de correctif (6.2.1, derniere version), donc
 * on corrige le fichier nous-memes, a la generation du projet natif —
 * c'est-a-dire aussi chez EAS, ou node_modules est reinstalle a chaque
 * build. Maven Central heberge tout ce que JCenter hebergeait.
 */
module.exports = function withCookiesGradleFix(config) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const file = path.join(cfg.modRequest.projectRoot, 'node_modules', '@react-native-cookies', 'cookies', 'android', 'build.gradle');
      if (fs.existsSync(file)) {
        const src = fs.readFileSync(file, 'utf8');
        const out = src.replace(/jcenter\(\)/g, 'mavenCentral()');
        if (out !== src) fs.writeFileSync(file, out);
      }
      return cfg;
    },
  ]);
};
