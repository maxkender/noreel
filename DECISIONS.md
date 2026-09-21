# DECISIONS.md

Chaque choix non trivial, une ligne de justification (§2 règle 3).

## Phase 0

- **Boucle visuelle : option B.** Ni Xcode ni SDK Android sur la machine → ni `simctl`
  ni `adb`. Je ne peux voir aucune frame. L'utilisateur lance via Expo Go / TestFlight
  et renvoie les captures. Conséquence assumée : les jugements esthétiques du §2.5
  passent par lui.
- **Nouveau projet plutôt que transposition de `~/ReelsFreeExpo`.** Celui-ci est en
  JavaScript sans routeur ; NoReel exige TypeScript strict + expo-router. La webview
  de ReelsFree deviendra l'implémentation de `FilteredAppsService.open()` (§5.6).

## Phase 1

- **`src/app/` au lieu de `app/` à la racine** (§5.1). C'est la disposition du template
  Expo par défaut ; expo-router la détecte nativement. Déplacer aurait créé un écart
  avec les outils Expo pour zéro bénéfice.
- **`calculations.ts` + tests avancés de la phase 4 à la phase 1.** C'est de la logique
  pure, entièrement vérifiable sans écran — le seul livrable dont je peux garantir la
  justesse dans les conditions de l'option B. Ça dérisque aussi les écrans 5 et 6, qui
  en dépendent entièrement.
- **`livedMonths` plafonné à `totalMonths - 12`.** Le brief ne tranche pas le cas d'un
  âge proche ou supérieur à 80. Une grille entièrement vécue n'a rien à raconter : on
  garde toujours au moins 12 mois devant. Testé.
- **Approche typographique convertie de % en points.** Le §4.3 donne l'approche en
  pourcentage ; React Native attend `letterSpacing` en points. Conversion
  `size × pct / 100`, appliquée après la mise à l'échelle.
- **Postinstall de Skia bloqué par npm (`allow-scripts`).** Sans effet sur le bundling
  Metro ni sur EAS Build (qui réinstalle côté serveur). À approuver seulement si un
  build natif local devient nécessaire.

## Non vérifié (option B)

- 60 fps sur Android milieu de gamme (§11, §14) — aucun appareil, aucun `adb`.
- 120 fps ProMotion.
- Flou Android via `BlurTargetView` sur canvas Skia (§4.4) — désigné par le brief
  lui-même comme le plus gros risque technique.
- Skia dans Expo Go : géré par Expo 57, mais l'inclusion dans Expo Go reste à vérifier
  empiriquement. Si absent → development build EAS obligatoire.

## Blocage d'apps (hors périmètre du brief, demandé ensuite)

- **Écart au §0 assumé.** Le brief exclut explicitement le mécanisme de blocage
  (« stubs propres derrière des interfaces »). Demandé en cours de route, donc
  implémenté — mais sans casser ce qui marche.
- **`react-native-device-activity` 0.6.1** plutôt qu'un module natif maison :
  fournit les trois extensions qu'Apple exige (ActivityMonitorExtension,
  ShieldConfiguration, ShieldAction), qu'il faudrait sinon écrire en Swift avec
  des cibles Xcode générées à la main.
- **Plugin verrouillé derrière `EXPO_PUBLIC_FAMILY_CONTROLS=1`.** L'entitlement
  `com.apple.developer.family-controls` n'est accordé pour la distribution
  qu'après examen par Apple. L'ajouter avant l'accord ferait échouer le build
  TestFlight (le profil de provisioning ne peut pas le contenir). Vérifié des
  deux côtés : `expo config` ne contient pas le plugin par défaut, le contient
  avec le drapeau.
- **`services/index.ts` bascule tout seul** du mock au vrai blocage selon ce même
  drapeau. Aucun autre fichier à toucher le jour de l'accord.
- **API vérifiée avant usage.** `getAuthorizationStatus` (synchrone),
  `requestAuthorization`, `isShieldActive`, `enableBlockAllMode`, `resetBlocks`
  et la constante runtime `AuthorizationStatus` existent bien dans le paquet
  installé — contrôlé dans les `.d.ts`, pas supposé.

## En attente d'une action humaine

- [ ] **Demander l'entitlement Family Controls à Apple** :
      https://developer.apple.com/contact/request/family-controls-distribution
      Sans accord, le blocage iOS reste inopérant, quel que soit le code.
- [ ] Blocage Android (service d'accessibilité) : non implémenté. Policy Play
      Store restrictive depuis 2023, à traiter séparément.
