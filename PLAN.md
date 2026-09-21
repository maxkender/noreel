# NoReel — PLAN.md

Phase 0 (reconnaissance) terminée. Ce plan attend un feu vert avant la phase 1.

---

## 1. État des lieux

| Point | Constat |
|---|---|
| Expo SDK | 57.0.24 installé sur la machine (projet ReelsFreeExpo) |
| Libs du doc | **Toutes** gérées par Expo 57 — `npx expo install` donnera des versions alignées |
| Reanimated | 4.5.1 → `react-native-worklets` 0.10.1 séparé, et New Architecture obligatoire |
| Projet existant | `~/ReelsFreeExpo` : Expo **JavaScript**, pas de TypeScript, pas d'expo-router |
| Xcode | **absent** — pas de `simctl` |
| SDK Android | **absent** — pas d'`adb` |

---

## 2. Le blocage principal : je ne peux voir aucun écran

Le document définit sa boucle qualité en §2.5 : typecheck → lint → tests → simulateur →
**capture d'écran** → « regarde-la vraiment » → critique contre le brief → corrige.

Sans Xcode ni SDK Android, je n'ai ni `xcrun simctl io booted screenshot` ni
`adb exec-out screencap`. **Je ne peux pas voir une seule frame rendue.**

Ce n'est pas un détail d'outillage. La définition de « terminé » du document est
entièrement visuelle : « on doit avoir envie de faire une capture de chaque écran »,
« aucun écran qui ressemble à un template », « rien de générique ». Un timing de
280 ms, un liseré chaud, une vague diagonale : ça se juge à l'œil, pas au typecheck.

Trois issues possibles :

- **A · Xcode** (~1 h de téléchargement). Débloque `simctl` : la boucle du document
  fonctionne telle qu'elle est écrite. C'est la seule option qui permet d'atteindre
  le niveau demandé.
- **B · Expo Go + toi.** Tu lances, tu captures, tu m'envoies. Ça marche, mais chaque
  itération visuelle passe par toi — sur ~30 moments d'animation, c'est lourd.
- **C · À l'aveugle.** Je code, tu découvres. Le code compilera ; le niveau
  « Apple Design Award » ne sera pas au rendez-vous. Je le déconseille.

---

## 3. Risque technique à lever en phase 1 : Skia dans Expo Go

Skia est géré par Expo 57, mais « géré » ≠ « inclus dans Expo Go ». Si Skia n'y est
pas, il faut un **development build** — donc EAS Build (le compte est déjà configuré),
soit ~15 à 40 min par itération native au lieu du rechargement à chaud.

À vérifier empiriquement dès le début de la phase 1 : un canvas Skia minimal, lancé
dans Expo Go sur ton iPhone. 10 minutes, et ça conditionne tout le rythme du projet.

---

## 4. Décision : nouveau projet, pas une transposition

`~/ReelsFreeExpo` est en JavaScript sans routeur ; NoReel exige TypeScript strict +
expo-router. Ce n'est pas le même produit non plus : ReelsFree **est** le client
webview, NoReel est la coquille (onboarding + Home) autour d'un mécanisme de blocage
laissé en stub.

→ Nouveau projet dans `~/noreel`.

Et les deux s'emboîtent : le §5.6 définit
`FilteredAppsService.open(app)` comme un TODO produit. **La webview de ReelsFree est
exactement l'implémentation de ce service.** On garde le stub en phase 1 et on branche
ReelsFree plus tard, sans rien réécrire.

---

## 5. Phases et livrables

| Phase | Contenu | Livrable vérifiable |
|---|---|---|
| 1 · Fondations | projet TS + expo-router, config, polices, tokens, i18n FR/EN complet, store zustand, services mock, haptique, `useTimeline`, `useTilt`, playground | typecheck vert, playground qui s'ouvre, **test Skia/Expo Go** |
| 2 · Ciel et verre | `SkyBackground` + shader + 11 presets, `Glass` (4 rendus), boutons, chrome, logo animable, splash et icônes | ciel qui passe de la nuit au matin dans le playground |
| 3 · Écrans 1–4 | accueil, ce que fait NoReel, les excuses, la solution + transition 3→4 | 4 écrans + la transition la plus lente du produit |
| 4 · Écrans 5–6 | cadran, règle d'âge, grille de vie (2e shader) + `calculations.ts` | **tests des calculs au vert** (6 cas du §9) |
| 5 · Écrans 7–9 | cerveau, amour, écran d'accueil + transitions 8→9 et 9→Home + `SourcesSheet` | onboarding complet bout en bout |
| 6 · Home | ciel suivant l'heure, héros, tuiles, protection, année en 365 carreaux, tab bar | Home complète |
| 7 · Finitions | accessibilité, reduced motion/transparency, perf release, mode démo, README | checklist du §14 |

Phases 1 et 4 sont les seules dont je peux garantir la qualité sans voir l'écran
(logique pure, tests). Les phases 2, 3, 5, 6 sont du ressort visuel.

---

## 6. Ce que je ne pourrai pas valider moi-même

- **60 fps sur Android milieu de gamme** (§11, §14) — aucun appareil, aucun `adb`.
- **Le flou Android sur `BlurTargetView`** (§4.4) — le doc le désigne lui-même comme
  « le plus gros risque technique », à vérifier « sur un vrai appareil ».
- **120 fps ProMotion**.
- Tout jugement esthétique, tant que le point 2 n'est pas tranché.

Ces points iront dans `DECISIONS.md` marqués « non vérifié », pas passés sous silence.

---

## 7. Ce qu'il me faut pour démarrer

1. Ton choix sur le point 2 (A, B ou C).
2. Le fichier `NOREEL_PROMPT.md` déposé dans `~/noreel/` — c'est la source de vérité
   des 7 phases, et je dois pouvoir m'y référer sans dépendre du fil de conversation.
