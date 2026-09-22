# ReelsFree — mise en ligne sur TestFlight

Instagram web dans une app iOS, avec les Reels masqués.

## Ce qui est déjà fait

- Projet Xcode complet et validé (`ReelsFree.xcodeproj`)
- Icône 1024×1024 sans canal alpha (obligatoire, sinon Apple rejette la build)
- `ITSAppUsesNonExemptEncryption = NO` — évite la question sur le chiffrement à chaque upload
- `ExportOptions.plist` réglé pour un envoi direct vers App Store Connect
- `upload-testflight.sh` — archive et envoie en une commande

## Ce que tu dois faire toi

Ces étapes demandent ton mot de passe, ton identité ou ta carte bancaire.
Je ne peux pas les faire à ta place.

### 1. Installer Xcode
Mac App Store → chercher « Xcode » → Obtenir. ~10 Go, compte une bonne heure.
Puis, dans le Terminal :

    sudo xcode-select -s /Applications/Xcode.app/Contents/Developer

### 2. S'inscrire au Apple Developer Program
https://developer.apple.com/programs/enroll/ — 99 €/an.
Vérification d'identité : 24 à 48 h. Sans ça, pas de TestFlight, il n'y a pas d'offre gratuite.

### 3. Récupérer ton Team ID
https://developer.apple.com/account → Membership details → Team ID (10 caractères).
Remplace `REMPLACER_PAR_TON_TEAM_ID` dans `ExportOptions.plist`.

### 4. Choisir un Bundle ID unique
Dans Xcode : clique le projet → onglet Signing & Capabilities.
- **Team** : sélectionne ton compte
- **Bundle Identifier** : remplace `com.reelsfree.app` par ex. `com.tonnom.reelsfree`
  (il doit être unique au monde — celui par défaut est sûrement déjà pris)

### 5. Créer l'app dans App Store Connect
https://appstoreconnect.apple.com → Mes apps → **+** → Nouvelle app
- Plateforme : iOS
- Nom : quelque chose d'unique (le nom est global à tout l'App Store)
- Bundle ID : celui de l'étape 4

⚠️ Ne l'appelle pas « Instagram » et n'utilise pas leur logo : c'est une marque déposée.

### 6. Créer une clé API
App Store Connect → Users and Access → Integrations → App Store Connect API → **+**
- Rôle : App Manager
- Télécharge le fichier `.p8` (**téléchargeable une seule fois**)
- Note le **Key ID** et l'**Issuer ID**

Place le fichier :

    mkdir -p ~/.appstoreconnect/private_keys
    mv ~/Downloads/AuthKey_*.p8 ~/.appstoreconnect/private_keys/

### 7. Envoyer

    export ASC_KEY_ID=TON_KEY_ID
    export ASC_ISSUER_ID=TON_ISSUER_ID
    ./upload-testflight.sh

La build apparaît dans TestFlight après 5–15 min de traitement.

### 8. L'installer sur ton iPhone
App Store Connect → TestFlight → Internal Testing → ajoute-toi comme testeur.
Installe **TestFlight** sur ton iPhone, connecte-toi, l'app est là.

En test **interne**, aucune revue Apple n'est nécessaire.

## À savoir

- Une build TestFlight expire au bout de **90 jours**. Relance le script pour repartir pour 90 jours.
- Le login Instagram se fait dans la page d'Instagram elle-même, à l'intérieur de l'app.
  L'app ne voit jamais ton mot de passe.
- Les carrousels « Reels suggérés » du feed n'ont pas d'attribut stable et peuvent passer
  à travers. Les règles de masquage sont toutes dans `ReelsFree/ReelsBlocker.swift`.
