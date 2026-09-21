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
