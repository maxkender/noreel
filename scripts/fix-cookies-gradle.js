/**
 * Retire `jcenter()` du build.gradle de @react-native-cookies/cookies.
 *
 * JCenter a ferme et Gradle 9 ne connait plus cette methode : le build
 * Android s'arretait sur « Could not find method jcenter() ». La bibliotheque
 * n'a pas publie de correctif (6.2.1, derniere version).
 *
 * Le correctif tourne a l'INSTALLATION (postinstall), pas a la generation du
 * projet natif : ainsi node_modules est identique sur ce Mac et chez EAS, pour
 * iOS comme pour Android, et l'empreinte expo-updates est la meme partout.
 * Applique pendant la generation Android, il ne touchait que les builds
 * Android chez EAS, et les empreintes divergeaient selon la plateforme.
 */
const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'node_modules', '@react-native-cookies', 'cookies', 'android', 'build.gradle');
if (fs.existsSync(file)) {
  const src = fs.readFileSync(file, 'utf8');
  const out = src.replace(/jcenter\(\)/g, 'mavenCentral()');
  if (out !== src) fs.writeFileSync(file, out);
}
