# ReelsFree — Instagram sans les Reels (Expo)

Instagram web dans une app iOS, avec les Reels masqués.
**Aucun Xcode nécessaire.**

## Installation

    npm install

---

## Voie A — Tester tout de suite (5 min, gratuit)

1. Sur ton iPhone : installe **Expo Go** depuis l'App Store.
2. Sur le Mac, dans ce dossier :

       npx expo start

3. Scanne le QR code avec l'appareil photo de l'iPhone.
4. L'app s'ouvre. Connecte-toi à Instagram **dans la page d'Instagram** qui s'affiche.

⚠️ En mode Expo Go, le Mac doit rester allumé avec `expo start` en cours, et
l'iPhone sur le même Wi-Fi. C'est fait pour développer, pas pour un usage quotidien.
Pour une app autonome, passe à la voie B.

---

## Voie B — TestFlight, sans Xcode (usage réel)

La compilation se fait sur les serveurs d'Expo. Ton Mac ne sert qu'à lancer les commandes.

### 1. Choisis un Bundle ID unique
Dans `app.json`, remplace `com.CHANGEME.reelsfree` par ex. `com.tonnom.reelsfree`
(deux endroits : `ios.bundleIdentifier` et `android.package`).

### 2. Connecte-toi à Expo (compte gratuit)

    npx eas-cli login

### 3. Lance le build dans le cloud

    npx eas-cli build --platform ios --profile production

EAS va te demander tes identifiants Apple et créer tout seul les certificats et
profils de provisioning. C'est **toi** qui saisis ces identifiants, directement
dans le terminal — ils ne passent ni par moi ni par ce projet.

Sur le plan gratuit, le build est mis en file d'attente : compte de 10 minutes
à quelques heures selon la charge.

### 4. Envoie sur TestFlight

    npx eas-cli submit --platform ios --latest

### 5. Installe
App Store Connect → TestFlight → Internal Testing → ajoute-toi comme testeur.
Puis l'app **TestFlight** sur ton iPhone.

En test interne, aucune revue Apple n'est nécessaire.

---

## Structure

    App.js             l'interface : webview, chargement, erreurs
    reelsBlocker.js    TOUTE la logique de masquage — le seul fichier à retoucher
    app.json           nom, bundle ID, réglages iOS
    eas.json           profils de build cloud

## À savoir

- Le login Instagram se fait dans la page d'Instagram elle-même. L'app ne voit
  jamais ton mot de passe.
- `sharedCookiesEnabled` garde la session d'un lancement à l'autre.
- Les carrousels « Reels suggérés » du feed n'ont pas d'attribut stable et
  peuvent passer à travers. Instagram change son HTML régulièrement : quand
  quelque chose repasse, c'est `reelsBlocker.js` qu'il faut ajuster.
- Ne nomme pas l'app « Instagram » et n'utilise pas leur logo : marque déposée.
