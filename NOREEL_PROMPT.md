# NoReel · Onboarding + Home — spécification

> Source de vérité du projet. Toute divergence doit être notée dans DECISIONS.md.

## 0. Mission

Design engineer senior React Native + motion design, niveau Apple Design Award.
Construire : (1) l'onboarding complet, 9 écrans en glassmorphisme, chacun avec un
moment d'animation signature ; (2) la Home.

Niveau attendu : on doit avoir envie de capturer chaque écran. 60 fps partout
(120 sur ProMotion), aucune animation sur le thread JS, aucun écran qui ressemble
à un template.

**Hors scope** : le mécanisme de blocage (version filtrée, Screen Time, service
d'accessibilité Android). Représenté par des services stub derrière interfaces (§5.6).

## 1. Le produit

NoReel = Instagram et TikTok sans les Reels, sans Explorer, sans « Pour toi ».
On garde messages, stories et posts des gens qu'on suit. On perd le scroll infini.

- Cible : 16–30 ans. Ils ne veulent pas supprimer Insta/TikTok (potes + DM), mais
  en ont marre de perdre 2 à 5 h par jour.
- Promesse : « Garde tes potes. Vire les reels. »
- Ton : tutoiement, direct, lucide, jamais moralisateur. Comme un ami qui a arrêté
  avant toi. Phrases courtes. Humour sec autorisé. Zéro jargon.
- Arc émotionnel : émerveillement → compréhension → reconnaissance → soulagement →
  implication → choc → lucidité → émotion → pouvoir d'agir → Home.
- Langues : FR et EN dès le départ. Langue de l'appareil, repli sur l'anglais.
- `APP_NAME = 'NoReel'`, facile à changer.

## 2. Règles de travail

1. Reconnaissance d'abord. Repo vide → `npx create-expo-app@latest` (dernier SDK
   stable, TypeScript, expo-router). Autre stack → s'arrêter et proposer.
2. **La doc avant l'API.** Lire la page de doc de la version installée avant
   d'utiliser une API Expo (docs.expo.dev sert chaque page en Markdown : ajouter
   `.md` à l'URL ; index dans `/llms.txt`). Idem Reanimated et Skia. Ne jamais
   inventer une prop : flou Android, Liquid Glass et worklets bougent vite.
3. Plan, puis phases. `PLAN.md`, feu vert, puis phase par phase. `DECISIONS.md` :
   chaque choix non trivial, une ligne de justification.
4. Pas de questions pour rien. Détail manquant → décision la plus cohérente avec
   ce document, notée dans DECISIONS.md, et on avance.
5. Boucle qualité par écran : `npx tsc --noEmit` → lint → tests → simulateur →
   **capture** → la regarder vraiment → critiquer contre ce brief → corriger.
   Vidéo courte pour juger le rythme. Un commit par écran terminé.
6. Playground : route `/playground`, `__DEV__` seulement. Galerie des composants,
   et chaque scène avec un slider qui **scrubbe sa timeline**.
7. TypeScript strict, composants courts, pas de `any`, aucune valeur magique hors
   tokens, zéro warning console.

## 3. Stack

Tout via `npx expo install`.

| Rôle | Paquet |
|---|---|
| Navigation | `expo-router` |
| Animations (thread UI) | `react-native-reanimated` (+ `react-native-worklets`) |
| Gestes | `react-native-gesture-handler` |
| GPU (shaders, particules, tracés) | `@shopify/react-native-skia` |
| Verre | `expo-blur`, `expo-glass-effect` (Liquid Glass iOS 26+) |
| Dégradés | `expo-linear-gradient`, `@react-native-masked-view/masked-view` |
| Haptique | `expo-haptics` |
| Gyroscope | `expo-sensors` |
| Polices | `expo-font` (+ TTF OFL dans `assets/fonts`) |
| Icônes | `lucide-react-native` + `react-native-svg` (trait 1,5, jamais d'emoji) |
| État | `zustand` + `@react-native-async-storage/async-storage` |
| Langue | `expo-localization` |
| Système | `expo-splash-screen`, `expo-system-ui`, `expo-status-bar` |
| Safe areas | `react-native-safe-area-context` |
| Tests | `jest-expo` |

**app.config.ts**
- `userInterfaceStyle: "dark"`, portrait, fond `night` (#0B0D1F) partout : splash,
  root view, `expo-system-ui`. Aucun flash blanc, jamais.
- iOS : `infoPlist.CADisableMinimumFrameDurationOnPhone = true` (120 Hz ProMotion).
- Splash : fond `night`, logo centré. `SplashScreen.preventAutoHideAsync()` jusqu'au
  chargement des polices. La première frame de l'écran 1 reproduit **exactement** le
  splash (même taille, même position).
- Android : edge-to-edge, barres système transparentes, icônes claires.

## 4. Direction artistique — « De l'écran à l'horizon »

### 4.1 Concept
Il est 1 h 47, la chambre est noire, la seule lumière vient du téléphone : froide,
bleue, verticale. NoReel raconte le passage de cette lumière-là à celle du jour.

- **Le vertical, c'est le feed** : rectangles 9:16, lumière froide, vitesse, bruit.
- **L'horizontal, c'est la vie** : ligne d'horizon, soleil qui se lève, chaleur, calme.

Fil rouge : **un lever de soleil qui progresse d'écran en écran.** L'app s'ouvre en
pleine nuit ; chaque étape fait monter le jour ; la Home, c'est le matin. Le fond
n'est pas une décoration, c'est la narration.

Motifs récurrents :
- **Ligne d'horizon** : barre de progression, règle de l'âge, sol de la scène amour,
  base du logo.
- **Soleil** : anneau lumineux, qui est aussi la bobine du reel. Il tourne quand
  c'est le chaos, il se lève quand c'est la vie.
- **Basculement vertical → horizontal** à chaque libération.
- **Froid = temps perdu, chaud = temps récupéré.**

### 4.2 Couleurs

| Token | Hex | Rôle |
|---|---|---|
| `night` | `#0B0D1F` | Nuit profonde : fond, splash, zénith nocturne |
| `screenGlow` | `#8FB8FF` | Lumière froide d'écran : reels, temps perdu, chaos. Nulle part ailleurs |
| `sun` | `#FFB37D` | Soleil abricot : temps récupéré, CTA, réussites |
| `dawn` | `#F4A0B5` | Rose de l'aube : chaleur, lien, amour |
| `haze` | `#9D95E8` | Lilas du ciel : transitions, secondaire |
| `mist` | `#EEF0FA` | Texte principal |

Dérivés : texte secondaire `mist` 68 %, tertiaire 44 % ; `fog` `#7E8299` (écran 7) ;
`ground` `#070814`.

Règles : jamais de rouge alarme (le danger, c'est la lumière froide). Les dégradés
viennent du ciel, pas d'aplats décoratifs. Contraste texte ≥ 4,5:1 sur le verre,
pour **tous** les états du ciel.

### Presets du ciel

| Preset | Zénith | Horizon | `horizonY` | `sunrise` | `glowAmt` | `energy` | Écran |
|---|---|---|---|---|---|---|---|
| `introChaos` | `#05060F` | `#0B0D1F` | 0.46 | 0 | 0.9 | 1 | intro 1 |
| `welcome` | `#0B0D1F` | `#2A2458` | 0.46 | 0.35 | 0 | 0.1 | 1 |
| `explain` | `#0E1030` | `#3A2F6B` | 0.90 | 0.40 | 0.15 | 0.15 | 2 |
| `lateNight` | `#04050C` | `#0B0D1F` | 1.05 | 0 | 0.75 | 0.6 | 3 |
| `firstLight` | `#121538` | `#6B4A8A` | 0.88 | 0.55 | 0 | 0.05 | 4 |
| `input` | `#0E1030` | `#3A2F6B` | 0.90 | réactif | réactif | 0.2 | 5 |
| `lifeGrid` | `#07081A` | `#1C1B3F` | 0.92 | 0.20→0.60 | 0.35→0 | 0.2 | 6 |
| `fog` | `#14151F` | `#3B3D4F` | 0.90 | 0.30 | 0 | 0.2 | 7 (soleil désaturé `#C9B8A8`) |
| `rose` | `#1A0F2E` | `#7A3B6E` | 0.88 | 0.70 | 0 | 0.05 | 8 |
| `morning` | `#1B2352` | `#8C6AA8` | 0.86 | 0.85 | 0 | 0.05 | 9 |

Détail : de l'écran 1 à 2, l'horizon descend de 0.46 à 0.90 → impression physique de
**lever les yeux**. C'est voulu.

### 4.3 Typographie

- **Newsreader** (serif, OFL) : titres, grands chiffres, voix intérieure. Italique
  **uniquement** pour les citations de la voix intérieure.
- **Geist** (sans, OFL) : UI, corps, boutons, labels, `fontVariant: ['tabular-nums']`.

| Style | Famille | Taille / interligne | Graisse | Approche |
|---|---|---|---|---|
| `hero` | Newsreader | 96 / 0.95 | 500 | −2 % |
| `displayL` | Newsreader | 44 / 1.02 | 500 | −1,5 % |
| `displayM` | Newsreader | 34 / 1.08 | 500 | −1 % |
| `title` | Newsreader | 24 / 1.15 | 500 | 0 |
| `quote` | Newsreader italique | 26 / 1.25 | 400 | 0 |
| `lead` | Geist | 19 / 1.45 | 400 | 0 |
| `body` | Geist | 16 / 1.5 | 400 | 0 |
| `label` | Geist | 13 / 1.3 | 500 | +1 % |
| `button` | Geist | 17 / 1 | 600 | 0 |

- `scale = clamp(largeurÉcran / 390, 0.88, 1.1)` sur toutes les tailles.
- Alignement **à gauche** partout. Centré seulement écran 1 et révélations de chiffres.
- Pas de capitales, pas de sur-titres. Casse de phrase.
- Typo FR : espace fine insécable (U+202F) avant `? ! ;`, insécable (U+00A0) avant `:`
  et dans « ». Nombres via `Intl.NumberFormat`.
- `maxFontSizeMultiplier` : 1,15 display, 1,3 corps.

### 4.4 Le verre

Une vitre dépolie au lever du soleil : on voit le ciel à travers, flou, la lumière
vient d'un côté.

- **Flou** fort (40–60), teinte sombre.
- **Remplissage** `mist` 6–10 % + `night` 20–30 % si le contraste l'exige.
- **Lumière** : reflet froid 1 pt en haut (dégradé horizontal transparent → `mist`
  45 % → transparent) + **liseré chaud du côté du soleil** (en bas le plus souvent).
  Ce liseré chaud en bas est la signature.
- **Bordure** 1 pt, dégradé `mist` 28 % côté lumière → 5 % à l'opposé (canvas Skia
  en overlay ; repli bordure unie `mist` 18 % si trop de canvas).
- **Ombre** large et douce, halo coloré optionnel (abricot positif, bleu négatif).
- **Rayons** : panneaux 28, tuiles 22, chips 14, pilules 999, téléphones 44.
- **Pression** : échelle 0,97 + éclaircissement + haptique.

Quatre rendus, une seule API :
1. **iOS 26+ Liquid Glass** (`isLiquidGlassAvailable()` ET `isGlassEffectAPIAvailable()`)
   → `GlassView` pour le chrome interactif. Pas d'`opacity < 1` sur un `GlassView`
   ni ses parents (désactivé → changer `tintColor`) ; `isInteractive` non dynamique
   (remonter avec une nouvelle `key`).
2. **Autres panneaux iOS** → `BlurView` teinte sombre + couches.
3. **Android** → `BlurView` avec cible : tout ce qui doit être flouté est enveloppé
   dans un `BlurTargetView` racine, ref passée aux `BlurView`. Méthode
   `dimezisBlurViewSdk31Plus`. **Vérifier sur appareil réel que le flou capte le
   canvas Skia.** Plan B : `BackdropBlur` de Skia dans le canvas du fond.
4. **Réduire la transparence** / Android < 12 → surface `#171A33` à 94 %, même
   bordure, même lumière. Ça doit rester beau.

Perf : sur un ciel lisse, un verre sans flou est presque identique à un vrai flou.
Réserver le vrai flou aux panneaux devant du détail. **Max 4 vues floutées visibles.**

### 4.5 Lumière globale
Position du soleil dans le shader + inclinaison (`DeviceMotion`, lissé, faible
amplitude). Bordures et liseré plus lumineux côté soleil. Reflet spéculaire (bande
diagonale `mist` 6 %) sur les grands panneaux. Parallaxe : ciel ±4 pt, soleil ±10 pt,
panneaux ±6 pt. Coupée si « Réduire les animations ». Shared value globale `useTilt()`,
en pause en arrière-plan.

### 4.6 Mouvement

1. **Un moment signature par écran.** Tout le reste est calme : texte en fondu simple
   (280 ms, sans glissement), chrome immobile. Aucun « fade + slide up » générique.
2. **Tout mouvement a une cause** : narration ou geste. Réponses aux gestes
   immédiates et physiques (springs).
3. **Tout est interruptible** : un tap amène à l'état final en 280 ms.
4. **Le silence compte** : 150–250 ms d'immobilité avant chaque révélation.

Tokens : springs `gentle` / `snappy` / `bouncy` / `heavy` ; durées `tap` 120,
`fast` 220, `base` 360, `slow` 640, `scene` 1200 ; courbes `out` = bezier(0.16,1,0.3,1),
`inOut` = bezier(0.65,0,0.35,1), `in` = bezier(0.7,0,0.84,0) ; décalages lettre 40,
mot 70, ligne 120, élément 80.

Haptique (`src/lib/haptics.ts`, point d'entrée unique, throttle 35 ms, désactivable) :

| Fonction | Implémentation | Usage |
|---|---|---|
| `tick()` | `selectionAsync` | cadran, règle, segmented, seuils |
| `tap()` | impact light | chips, swipe d'un reel, petits boutons |
| `press()` | impact medium | CTA |
| `stop()` | impact heavy | arrêts nets |
| `success()` | notification success | soleil passe l'horizon, temps récupéré |
| `heartbeat()` | medium puis light à +110 ms, ×2, 600 ms d'écart | écran amour |

Android : espacer les `tick()` (un sur deux) si le moteur est grossier.

### 4.7 Interdits
- **Aucun logo, icône, dégradé, capture ou UI d'Instagram ou TikTok.** UI abstraites
  originales. Les noms n'apparaissent qu'en texte descriptif. « NoReel Insta » /
  « NoReel TikTok » = constantes, à faire valider juridiquement.
- **Aucun chiffre inventé** : pas de faux compteur, faux avis, stat sans source.
- Pas de kit de cartes SaaS, pas de capitales décoratives, pas de « A · B · C »,
  pas de flèche sur les boutons, pas de mot isolé en italique ou en couleur.
- Pas d'emoji dans l'UI (sauf feed d'excuses écran 3 s'il imite une notif).
- Pas de Lottie : tout procédural (Reanimated + Skia).
- Avant de valider : retirer un accessoire. Si un élément n'aide pas le message, il sort.

### 4.8 Logo
Anneau (soleil = bobine) posé sur une ligne d'horizon qui le coupe à 18 % de sa
hauteur. Partie basse cachée : le soleil se lève.
Géométrie pour diamètre D : anneau 0,09 D ; ligne 0,045 D d'épaisseur, 2,6 D de long,
bouts arrondis ; anneau dégradé `sun` → `dawn` ; ligne `mist` 85 %.
Wordmark « NoReel » : Geist 600, approche −2 %.
SVG (`assets/brand/mark.svg`) **et** composant Skia animable (`<NoReelMark />` : props
rotation, pointillés, couleur, hauteur du soleil). Générer `icon.png`,
`adaptive-icon.png`, `splash-icon.png` par script Node. Vérifier par superposition que
splash et première frame ont la même taille en points.

## 5. Architecture

### 5.1 Arborescence
```
app/
  _layout.tsx    polices, splash, providers, Stack sans header
  index.tsx      redirige vers /onboarding ou /home (après hydratation)
  onboarding.tsx / home.tsx / playground.tsx (__DEV__)
src/
  theme/     colors, sky-presets, typography, motion, spacing, radii
  i18n/      fr.ts, en.ts, index.ts (useT, plural, formats)
  lib/       haptics, useTimeline, ease, useTilt, useReducedMotion,
             useReduceTransparency, format
  store/     onboarding.ts (zustand + persist)
  services/  filteredApps, homeScreen, shield, stats, analytics, index
    mocks/   profils day1 et day30
  components/
    brand/   NoReelMark, Wordmark
    glass/   Glass, GlassButton, GlassPill, GlassSegmented, GlassSheet
    sky/     SkyProvider, SkyBackground, sky.sksl
    type/    Text, Odometer, MaskReveal
    icons/   NoReelAppIcon, PlaceholderAppIcon
  features/
    onboarding/
      OnboardingFlow, OnboardingPager
      chrome/   HorizonProgress, BackButton, CtaBar
      screens/  S1Welcome … S9HomeScreenApps
      scenes/   ReelStorm, AppDemoPhone, ExcuseFeed, BeforeAfter, DayArcDial,
                AgeRuler, LifeGrid, lifegrid.sksl, ActivityCarousel,
                BrokenSentence, FadingWorld, TwoLights, HomeScreenMock
      sheets/   SourcesSheet, AddToHomeGuideSheet
      calculations.ts (+ .test.ts)
    home/  HomeScreen, HeroReclaimed, LaunchTile, ShieldPanel, StatsRow,
           YearGrid, IdeaCard, GlassTabBar
```

### 5.2 Le flux d'onboarding
Un seul arbre, pas une pile de routes. `OnboardingFlow` rend de bas en haut :
`SkyBackground` (plein écran, **ne se démonte jamais** : c'est lui la continuité) →
`OnboardingPager` (écran courant + précédent pendant une transition ; **jamais plus
de 2 montés**) → chrome.

```ts
type ScreenId = 'welcome' | 'explain' | 'pain' | 'solution' | 'input'
              | 'lifeGrid' | 'harms' | 'love' | 'homeApps';

type OnboardingScreen = {
  id: ScreenId;
  sky: SkyPresetName;
  Component: React.FC<ScreenProps>;
  exit?: CustomTransition;
};

type ScreenProps = {
  enter: SharedValue<number>;
  isActive: boolean;
  setCta: (cta: CtaConfig) => void;
  next: () => void;
  back: () => void;
};
```

**Transition par défaut** : sortant opacité 1→0 et échelle 1→0,97 (220 ms, `in`) ;
entrant opacité 0→1 et échelle 1,02→1 (spring `gentle`) ; ciel interpolé vers le
preset suivant en 1 200 ms (`inOut`). La timeline du nouvel écran démarre à la fin
de son entrée.

**Transitions spéciales** : 3→4 (le feed se couche), 5→6 (les valeurs deviennent une
pastille), 8→9 (les deux lumières deviennent le soleil du fond d'écran), 9→Home
(le téléphone devient l'écran).

**Retour** : bouton + swipe bord gauche. Pas de swipe avant. **CTA verrouillé pendant
les transitions** (pas de double navigation). **Reprise** : étape et saisies persistées,
sans rejouer l'intro de l'écran 1.

**Emplacements réservés** (slot + TODO, pas d'implémentation) : `permissions` et
`paywall`, entre l'écran 9 et la Home.

### 5.3 SkyBackground
Canvas Skia plein écran + runtime shader (annexe A) : dégradé zénith → horizon, soleil
et halo montant avec `sunrise`, ligne d'horizon lumineuse, nuages fbm très lents,
étoiles qui s'éteignent, lumière froide montant du bas (`glowAmt`), scintillement et
grain ∝ `energy`, vignette, parallaxe gyroscope.

Shader compilé **une seule fois au niveau module**, contrôle `null` qui logge en dev.
État = shared values : `zenith`, `horizon`, `sun`, `glow` (RGB 0–1), `sunrise`,
`glowAmt`, `energy`, `horizonY`. Changer de preset = animer chaque valeur (mélange des
couleurs dans un worklet). Un écran peut piloter le ciel en direct (écran 5).
Horloge `useClock()`, **en pause en arrière-plan** (`AppState`).
API `SkyProvider` : `sky.to(preset, { duration })`, `sky.set(partial)`, `sky.values`.
Android : ce canvas vit dans le `BlurTargetView` racine.

### 5.4 useTimeline
Une seule horloge par scène ; chaque élément dérive sa progression d'une fenêtre de
temps. Lisible comme une partition, scrubbable, annulable, skippable.
- Instants clés en ms déclarés en tête de fichier :
  `const T = { lift: [0, 350], spin: [350, 1100], freeze: 2000 } as const`
- Haptiques calées via `useAnimatedReaction` (franchissement) + `runOnJS`.
- `skip()` → fin en 280 ms. « Réduire les animations » → saut direct à la fin +
  fondu du conteneur.

### 5.5 État, langue, formats
```ts
type OnboardingState = {
  completed: boolean;
  step: number;
  minutesPerDay: number;   // défaut 150
  age: number;             // défaut 24
  painFrequency?: 'daily' | 'weekly' | 'lostCount';
  demoPlatform: 'instagram' | 'tiktok';
  startedAt?: number;
};
```
zustand + persist AsyncStorage, flag `hasHydrated`.
i18n : `useT()` → `t('pain.title')`, interpolation `{n}`, `plural(n, {one, other})`,
`formatHours(minutes)` (« 3 h 15 » / « 3h 15m »), `formatLifeDuration(months)`,
`formatNumber(n)`. **Aucun texte en dur dans les composants.**

### 5.6 Services (stubs)
```ts
export type SocialApp = 'instagram' | 'tiktok';

export interface FilteredAppsService {
  open(app: SocialApp): Promise<void>;          // TODO produit
}
export interface HomeScreenService {
  canPinNatively(): boolean;                    // Android : ShortcutManager
  add(app: SocialApp): Promise<'added' | 'guided' | 'unavailable'>;
}
export interface ShieldService {
  isActive(): Promise<boolean>;
  setActive(active: boolean): Promise<void>;
}
export interface StatsService {
  today(): Promise<{ reclaimedMinutes: number; goalMinutes: number }>;
  week(): Promise<number[]>;                    // lundi → dimanche
  year(): Promise<number[]>;                    // par jour depuis le 1er janvier
  reelsAvoidedThisWeek(): Promise<number>;
  streakDays(): Promise<number>;
}
export function track(event: AnalyticsEvent, props?: Record<string, unknown>): void;
```
Mocks : profils `day1` (vide) et `day30` (réaliste), sélectionnables au playground.
iOS : `HomeScreenService.add` → `'guided'`. Android → `'added'`.
Événements : `onboarding_started`, `step_viewed {step}`, `intro_skipped`,
`demo_platform_toggled {app}`, `pain_answered {answer}`, `screen_time_set {minutes}`,
`age_set {age}`, `life_reclaimed`, `sources_opened {screen}`, `home_add_tapped {result}`,
`onboarding_completed {durationSec}`. En dev, `track` logge.

## 6. Chrome commun

- **Progression = ligne d'horizon** en haut (sous safe area, marges 20 pt) : trait
  `mist` 18 % de 1 pt, petit soleil (point `sun` 6 pt + halo) qui avance (spring
  `gentle`). Partie parcourue éclairée (`mist` 60 %). Label : « Étape 3 sur 9 ».
  Masquée écran 1, fondu à l'écran 2.
- **Retour** : cercle de verre 40 pt, chevron lucide 18 pt, à gauche. Masqué écran 1.
- **CTA** : bas, pleine largeur − 2×20 pt, hauteur 56, pilule de verre teintée `sun`
  14 %, liseré chaud en bas, Geist 600 17 pt. Pression : 0,97 + `press()`. Désactivé :
  teinte neutre, label 44 % (jamais d'opacité sur un `GlassView`). Changement de
  label : fondu croisé 180 ms. Bouton secondaire (texte seul) possible en dessous.
- **Marges** 20 pt (24 au-delà de 414 pt). Titres en haut à gauche, 24 pt sous la
  progression. Le CTA est posé sur la lueur de l'horizon : le soleil se lève derrière
  « l'étape suivante ».

## 7. Les écrans

| # | Écran | Moment signature | Ciel |
|---|---|---|---|
| 1 | Accueil | la bobine s'emballe, s'arrête net, devient soleil | nuit → premières lueurs |
| 2 | Ce que fait NoReel | un balayage efface Reels, Explorer, Pour toi | aube naissante |
| 3 | « Combien de fois… » | feed d'excuses + horloge qui s'emballe | 1 h 47 |
| 4 | La solution | le feed se couche ; comparateur avant/après | premier jour |
| 5 | Temps d'écran + âge | l'arc de ta journée ; l'horizon devient règle | réagit à la saisie |
| 6 | Ta vie en carreaux | 960 mois, bloc bleu, puis vague de soleil | s'assombrit puis se lève |
| 7 | Le cerveau | la phrase jamais finie ; le monde qui se décolore | brume |
| 8 | L'amour | deux lumières séparées par le feed, qui se rejoignent | rose |
| 9 | Écran d'accueil | les apps NoReel prennent la place | matin |

---

### Écran 1 · Accueil
**Objectif** : le wow. En 4 s, tout le produit sans un mot.
**Layout final** : étoiles pâlissantes ; soleil = anneau du logo sur la ligne
d'horizon (46 % de hauteur) ; wordmark sortant de la ligne ; titre `displayL` centré ;
sous-titre `lead` `mist` 68 % ; CTA. **Le texte vit sous l'horizon**, dans la bande
sombre du sol.

**Partition (scène `ReelStorm`, Skia)** — total 4400 ms

| t (ms) | Ce qui se passe |
|---|---|
| 0 | Première frame = le splash, au pixel près. |
| 0–350 | La ligne d'horizon s'étire jusqu'aux bords (`out`). L'anneau se soulève de 12 pt, vire du chaud au bleu d'écran. |
| 350–1100 | L'anneau tourne comme une bobine : pointillés qui accélèrent (`in`). `tap()` à intervalles décroissants (180 → 60 ms, 8 max). Ciel → `introChaos`. |
| 700–2000 | L'anneau crache des cartes 9:16 (rayon 14, dégradés froids, contenu abstrait : tache floue, 2 barres de légende, 3 cercles d'action à droite). 3 colonnes à −8°, vitesses 900 / 1300 / 1100 pt/s, étirées selon la vitesse (flou de mouvement simulé). ~24 cartes recyclées. |
| 2000 | **Arrêt net.** Vitesses à zéro (spring `heavy`, ~120 ms). `stop()`. Puis **180 ms de silence absolu**. |
| 2180–2900 | Les cartes se couchent : rotation, écrasement (scaleY → 0,02), chute vers l'horizon, 30 ms de décalage. Chaque contact laisse 2–3 étincelles. `glowAmt` → 0. |
| 2400–3200 | L'anneau ralentit, pointillés → trait plein, redevient chaud (`sun` → `dawn`), passe sous l'horizon puis remonte : c'est le soleil. Ciel → `welcome`. `success()` au franchissement (~3100). |
| 3200–3700 | « NoReel » sort de la ligne lettre par lettre (la ligne sert de masque, 40 ms, spring `snappy`). |
| 3700–4100 | Titre puis sous-titre en fondu (280 ms, 120 ms d'écart). |
| 4100–4400 | CTA (fondu + échelle 0,98→1). Un seul reflet le traverse, une fois. |
| repos | Nuages lents, parallaxe, halo qui respire ±2 % sur 6 s. Rien d'autre. |

**Interactions** : tap n'importe où → `skip()` (280 ms) + `track('intro_skipped')`.
L'intro ne joue qu'au premier lancement.

**Copy FR** — Titre : « Garde tes potes. » / « Vire les reels. » · Sous-titre :
« Instagram et TikTok, sans le scroll infini. » · CTA : « Commencer »
**EN** — “Keep your friends.” / “Lose the reels.” · “Instagram and TikTok, without
the endless scroll.” · “Get started”

---

### Écran 2 · Ce que fait NoReel
**Objectif** : comprendre le produit en 5 s, en le voyant.
**Layout** : titre `displayL` à gauche, `lead`, téléphone de verre (rayon 44) avec UI
abstraite, segmented Instagram/TikTok, 3 lignes de liste, CTA.

**Moment signature — « le balayage »** (`AppDemoPhone`)
- Le téléphone entre du bas (rotateX 18°→0, spring `gentle`).
- **Mode Instagram** (UI abstraite originale) : rangée de stories (cercles à anneau
  chaud), carte de post, grille Explorer, barre de 5 onglets dont une icône lecture,
  messages en haut à droite.
- **Mode TikTok** : vidéo plein cadre, onglets « Pour toi » / « Abonnements » en haut,
  colonne d'actions à droite, boîte de réception en bas.
- À 600 ms : une bande de lumière horizontale (2 pt + halo) descend sur l'écran du
  téléphone (900 ms, `inOut`). Sur chaque élément piège : glitch froid de 2 frames
  (3 copies décalées ±2 pt, rouge et cyan, fusion `plus`), puis dissolution en
  particules montantes. Les restants se réorganisent (spring `snappy`). Derrière la
  bande, l'UI se réchauffe.
- Fin : pilule « Version NoReel » dans le téléphone. `tap()`.
- Les 3 lignes en fondu (120 ms d'écart). Sur la 3e, un trait de barré se dessine
  (280 ms).

**Interactions** : segmented (pilule glissante, spring `snappy`, `tick()`) → fondu
croisé + rejeu du balayage. Tap sur le téléphone = rejouer.

**Copy FR** — Titre : « Les mêmes apps. Sans le piège. » · Corps : « NoReel ouvre
Instagram et TikTok dans une version épurée. » (à valider) · Liste : « Tes messages » /
« Les stories et posts des gens que tu suis » / « Reels, Explorer, Pour toi » (barré) ·
Pilule : « Version NoReel » · CTA : « Continuer »
**EN** — “Same apps. Without the trap.” · “NoReel opens Instagram and TikTok in a
clean version.” · “Your messages” / “Stories and posts from people you follow” /
“Reels, Explore, For You” · “NoReel version” · “Continue”

---

### Écran 3 · « Combien de fois… »
**Objectif** : la reconnaissance. Se voir à 1 h 47 en train de se mentir.
**Ciel** `lateNight`.

**Moment signature — « le feed d'excuses »** (`ExcuseFeed`)
- Horloge géante façon écran verrouillé (Newsreader ~120 pt, `mist` 10 %) à 23:04.
- Bulle de verre centrale avec une phrase de la voix intérieure (Newsreader italique).
  Toutes les ~900 ms, swipée vers le haut comme un reel (−120 %, spring `snappy`),
  la suivante arrive du bas. `tap()` à chaque swipe. **Le rythme accélère : 900 → 450 ms.**
- À chaque swipe l'horloge avance en odomètre : 23:04 → 23:31 → 23:58 → 00:26 →
  00:49 → 01:13 → **01:47**.
- Après la dernière : arrêt, horloge figée sur 01:47 (léger flash). **250 ms de
  silence.** Puis titre, corps, réponses en fondu.

**Phrases FR** : « Juste 5 minutes. » / « Léa m'a envoyé un reel, je regarde juste
ça. » / « Tout le monde en parle, faut que je voie. » / « Je veux pas rater ça. » /
« Allez, le dernier. » / « Ok, vraiment le dernier. » / « Bon… un dernier. »
**EN** : “Just 5 minutes.” / “Lea sent me a reel, I'll just watch that.” / “Everyone's
talking about it, I have to see.” / “I don't want to miss this.” / “Okay, last one.” /
“Okay, actually the last one.” / “Fine… one more.”

**Interactions** : une réponse est **obligatoire**. Tap sur un chip → remplissage
(`sun` 16 %), les autres s'estompent, `tick()`, CTA activé. Stocke `painFrequency`.

**Copy FR** — Titre : « Combien de fois tu t'es dit que tu allais arrêter de
scroller ? » · Corps : « Et puis tu y retournes. Par FOMO. Pour voir les reels de tes
potes. Quarante minutes plus tard, il est 1 h 47. » · Réponses : « Tous les jours » /
« Plusieurs fois par semaine » / « J'ai arrêté de compter » · CTA : « Je me reconnais »
**EN** — “How many times have you told yourself you'd stop scrolling?” · “And then you
go back. FOMO. To watch your friends' reels. Forty minutes later, it's 1:47 a.m.” ·
“Every day” / “A few times a week” / “I stopped counting” · “That's me”

---

### Écran 4 · La solution
**Transition 3→4 — « le feed se couche »** : au tap, bulle et horloge basculent à
l'horizontale, tombent jusqu'à la ligne d'horizon en bas et s'y fondent : la ligne
s'illumine. `stop()` au contact. Ciel `lateNight` → `firstLight` en **1 600 ms**.
C'est l'expiration de l'onboarding, la transition la plus lente : l'assumer.

**Moment signature — « avant / après »** (`BeforeAfter`)
- Panneau de verre (rayon 28), deux versions superposées de la même UI abstraite.
  **Avant** : froid, cartes verticales défilant en continu, pastilles de notification.
  **Avec NoReel** : chaud, immobile, une conversation, des stories, le post d'un ami.
- Poignée verticale (ligne de verre + bouton rond 36 pt). La couche « Avec NoReel »
  est dans un conteneur `overflow: hidden` dont la largeur suit la poignée.
- Démo auto : 15 % → 85 % → 50 % (1 400 ms, `inOut`). Puis pan utilisateur (spring au
  relâchement). `tick()` au passage de 50 %, `tap()` aux butées.
- **Côté Avant, le défilement ne s'arrête jamais. Côté NoReel, rien ne bouge.**

**Copy FR** — Titre : « C'est pour ça qu'on a construit la solution ultime. » ·
Corps : « Les mêmes plateformes. Sans les fonctionnalités qui ruinent ton cerveau. » ·
Labels : « Avant » / « Avec NoReel » · Note : « Un pote t'envoie un reel ? Tu le
regardes. Et c'est tout. » (**à valider**, sinon supprimer) · CTA : « Calculer mon temps »
**EN** — “That's why we built the ultimate fix.” · “Same platforms. Without the
features that fry your brain.” · “Before” / “With NoReel” · “A friend sends you a reel?
You watch it. That's it.” · “Calculate my time”

---

### Écran 5 · Ton temps d'écran (et ton âge)

**Étape A — l'arc de ta journée** (`DayArcDial`)
- Demi-cercle sur une ligne d'horizon = la course du soleil sur tes **16 h éveillées**.
  Curseur = petit soleil de verre 32 pt avec halo.
- La portion parcourue est en **lumière d'écran froide** ; le reste en abricot doux.
  Plage 15 min → 12 h, **pas de 15 min**. Défaut **2 h 30**.
- Le ciel réagit : `sky.set({ sunrise: 0.45 − 0.25×v, glowAmt: 0.1 + 0.6×v })`,
  `v = minutes / 720`.
- Centre : odomètre (Newsreader `hero`) + « par jour ». Sous l'horizon, en direct :
  part de la journée éveillée + total hebdo.
- Gestes : pan le long de l'arc (`atan2` depuis le centre, magnétisme au quart
  d'heure). `tick()` par pas, `tap()` à chaque heure pleine. Tap sur l'arc = saut.
  Boutons − / + discrets. Rôle `adjustable`.
- Aide : iOS « Réglages > Temps d'écran », Android « Paramètres > Bien-être numérique ».
  **N'ouvre jamais les réglages via URL privée (`App-Prefs:`)** : motif de rejet App Store.

**Étape B — l'âge** (`AgeRuler`)
- Au tap sur Valider, l'arc monte et rétrécit en pastille de contexte (tap = retour).
  **En même temps, la ligne d'horizon s'allonge et se couvre de graduations : elle
  devient la règle.** Même ligne, même composant — pas un nouvel élément.
- Règle 13 → 75 ans, une graduation par an, une grande tous les 5 ans avec son nombre.
  `snapToInterval`, inertie, `tick()` par année. Valeur en odomètre au-dessus.
  Défaut **24**.

**Transition 5→6** : la pastille ne disparaît pas ; elle glisse à sa place en haut de
l'écran 6 et se complète avec l'âge (faux shared element, overlay entre deux positions
mesurées).

**Copy FR** — A · « Combien de temps passes-tu sur Insta et TikTok par jour ? » ·
« par jour » · « Soit {p} % de ta journée éveillée. » / « {h} par semaine. » ·
« Pas sûr ? Réglages > Temps d'écran » · CTA « Valider ».
B · « Et tu as quel âge ? » · « Pour voir ce que ça représente sur ta vie. » ·
« {n} ans » · CTA « Voir ma vie en carreaux »
**EN** — A · “How much time do you spend on Insta and TikTok a day?” · “a day” ·
“That's {p}% of your waking day.” / “{h} a week.” · “Not sure? Settings > Screen Time” ·
“Confirm”. B · “And how old are you?” · “So we can see what it means for your life.” ·
“{n} years old” · “See my life in squares”

---

### Écran 6 · Ta vie en carreaux
**Objectif** : le choc, puis l'espoir. L'écran que les gens partagent : le soigner
comme une affiche.

**La grille** (`LifeGrid` — **un seul runtime shader**, annexe B, pas 960 composants)
- 80 × 12 = **960 carreaux**, un par mois. Trois états : vécu (`dawn` éteint, 42 %),
  devant toi (contour `mist` 16 %), sur ton téléphone (`screenGlow`, lumineux,
  léger pouls).
- Les mois perdus forment **un bloc continu qui commence maintenant**, juste après
  les mois vécus.
- Géométrie responsive : colonnes parmi [24, 30, 32, 40], celle qui donne les plus
  gros carreaux ; carreaux carrés ; gouttière ~22 % du pas ; grille centrée.
- **Chiffres affichés et carreaux allumés viennent de la même fonction (§9).**

**Partition**

| t (ms) | Ce qui se passe |
|---|---|
| 0–1200 | Tous les carreaux apparaissent en vague diagonale (haut-gauche → bas-droite), 0 → 1 avec léger rebond. 6 `tick()` répartis. |
| 1200–1450 | Silence. |
| 1450–3450 | Les mois perdus s'allument un par un, du présent vers le futur, et grossissent (`out`). L'odomètre compte de 0 à la valeur finale. Ciel s'assombrit, lumière d'écran monte. |
| 3450 | `stop()`. Compteur figé. |
| 3700 | Texte en fondu, puis CTA « Récupérer ce temps ». |

**Moment d'espoir — « récupérer »** (au tap) : une vague de soleil balaie la grille de
gauche à droite (`reclaim` 0→1, **1 600 ms**). Chaque carreau froid touché se retourne
(faux flip 3D : compression horizontale puis retour) et devient `sun`. `success()` à
la fin. Ciel → `sunrise` 0,6, lumière d'écran éteinte.
Puis la grille remonte et rétrécit (spring `gentle`) pour laisser place à une phrase
et au carrousel `ActivityCarousel` (magnétisme, parallaxe légère du contenu).

| Activité | Coût | FR (un / plusieurs) | EN | Détail FR |
|---|---|---|---|---|
| livres | 6 h | livre lu / livres lus | book read / books read | ≈ 6 h par livre |
| langue | 550 h | nouvelle langue au niveau B2 / … | new language at B2 level | ≈ 550 h pour le B2 |
| instrument | 200 h | instrument appris / … | instrument learned | ≈ 200 h pour jouer tes morceaux |
| marathon | 100 h | marathon préparé / … | marathon trained for | ≈ 100 h d'entraînement |
| code | 450 h | formation complète au code / … | full coding bootcamp | ≈ 450 h, comme un bootcamp |
| potes | 4 h/soirée | soirée de plus avec tes potes, chaque semaine | extra evening with friends | hebdo, 7 max |

Tuile : nombre en `displayL`, label, détail (`label`, `mist` 68 %), icône lucide fine.
Si nombre < 1 : anneau de progression + « {p} % du chemin ».
Sous le carrousel : « Estimations indicatives. » + lien « Sources et méthode ».
Le CTA devient « Continuer ».

**Copy FR** — Pastille « {h} par jour, {n} ans » · Titre « Voici ta vie. » ·
Sous-titre « Un carreau, c'est un mois. » · Légende « vécu » / « sur ton téléphone » /
« devant toi » · Texte « sur ton téléphone d'ici tes 80 ans. Jour et nuit, sans pause.
Soit {p} % de ton temps éveillé. » · CTA 1 « Récupérer ce temps » · Après : « Chaque
année, tu passes {h} sur Insta et TikTok. Avec ce temps, tu pourrais : » · CTA 2
« Continuer »
**EN** — “{h} a day, {n} years old” · “This is your life.” · “One square is one month.” ·
“lived” / “on your phone” / “ahead of you” · “on your phone by the time you're 80. Day
and night, non-stop. That's {p}% of your waking time.” · “Take this time back” ·
“Every year, you spend {h} on Insta and TikTok. With that time, you could:” · “Continue”

**Accessibilité** : « Ta vie en mois : {vécus} mois vécus, {perdus} mois sur ton
téléphone, {restants} mois devant toi. »
**Terminé quand** : chiffres = carreaux allumés, et l'écran tient sans défilement sur
un iPhone SE.

---

### Écran 7 · Ce que le scroll fait à ton cerveau
**Ciel** `fog`. Titre + deux panneaux de verre empilés.

**Panneau 1 — « la phrase qu'on ne finit jamais »** (`BrokenSentence`)
Texte Newsreader comme une page de livre. Une phrase s'écrit mot par mot… et à
mi-chemin elle est swipée vers le haut comme un reel, remplacée par le début d'une
autre, swipée à son tour. **Trois fois, en accélérant.** `tap()` par swipe. Puis arrêt.
- FR : « Tu commences à lire une phrase, tu arrives au milieu et » → « Une autre idée
  arrive, plus rapide, plus » → « Puis une notification, puis »
- EN : “You start reading a sentence, you get halfway and” → “Another idea shows up,
  faster, more” → “Then a notification, then”
Puis le chiffre en `hero` : « 47 s », et le texte. Rejeu au tap.

**Panneau 2 — « le monde qui se décolore »** (`FadingWorld`)
Petit paysage Skia (ciel de fin de journée, soleil, collines en aplats) + une ligne de
plaisir qui pulse comme un ECG (chemin Skia recalculé dans un worklet). En **2,5 s**
les pics s'aplatissent et la saturation passe de 1 à 0,15 (`ColorMatrix`). Puis le texte.

**Le dos des panneaux** : bouton « Source » → flip 3D avec perspective (spring
`gentle`) → source + phrase de nuance. Lien « Toutes les sources » → `SourcesSheet`.

**Copy FR** — Titre « Ce que le scroll fait à ton cerveau. »
P1 « Moins de concentration » · « 47 s » · « C'est le temps moyen qu'on passe
aujourd'hui sur un écran avant de passer à autre chose. En 2004, c'était 2 min 30. Et
une grande méta-analyse de 2025 associe l'usage intensif des vidéos courtes à une
attention plus fragile et à moins de contrôle de soi. » · Dos : « Gloria Mark (UC
Irvine), Attention Span, 2023. Nguyen et al., Psychological Bulletin, 2025 : 71 études,
98 299 participants. Ce sont des associations, pas une preuve de cause à effet. »
P2 « Moins de plaisir dans la vraie vie » · « Anhédonie : la difficulté à ressentir du
plaisir. » · « Quand ton cerveau reçoit une récompense toutes les quelques secondes,
les plaisirs lents (un livre, un dîner, une balade) peuvent paraître fades. Les
chercheurs observent un cercle vicieux : moins on ressent de plaisir, plus on cherche
des récompenses rapides, et inversement. » · Dos : « Guillot et al., Computers in Human
Behavior, 2016. Nguyen et al., Psychological Bulletin, 2025. Un cercle vicieux
documenté, pas un diagnostic. »
Boutons « Source » / « Retour » · « Toutes les sources » · CTA « Continuer »
**EN** — “What scrolling does to your brain.” · “Less focus” · “That's the average time
we now spend on a screen before switching to something else. In 2004, it was 2.5
minutes. And a large 2025 meta-analysis links heavy short-video use to weaker attention
and less self-control.” · “Less joy in real life” · “Anhedonia: difficulty feeling
pleasure.” · “When your brain gets a reward every few seconds, slow pleasures (a book,
a dinner, a walk) can start to feel flat. Researchers see a vicious circle: the less
pleasure you feel, the more you chase quick rewards, and the other way around.”

---

### Écran 8 · L'amour
**Ciel** `rose`. Le seul écran chaud et intime.

**Moment signature — « deux lumières »** (`TwoLights`)
Sur une ligne d'horizon, deux petites lumières chaudes (deux personnes), une à chaque
bord, avancent l'une vers l'autre. Des barres verticales fines (des reels, verre froid)
défilent de haut en bas entre elles et coupent la ligne. **À chaque passage les
lumières reculent. Trois fois.** Puis les barres s'arrêtent, se couchent et
disparaissent dans l'horizon. Les deux lumières se rejoignent au centre ; au contact,
une lueur chaude s'épanouit et monte : un petit soleil. **`heartbeat()` au contact
exact.**
Optionnel, seulement si élégant : les traînées dessinent un cœur très discret. Si ça
fait kitsch, le supprimer.
Puis trois lignes de texte une à une (fondu, 400 ms d'écart), puis la conclusion.

**Copy FR** — Titre « Savais-tu que le scroll peut même diminuer ta capacité à tomber
amoureux ? » · L1 « Tomber amoureux, ça demande de l'attention. Des regards. Du temps
sans distraction. Exactement ce que le scroll te prend. » · L2 « Dans une étude
célèbre, 45 minutes de questions de plus en plus personnelles ont suffi à rapprocher
deux inconnus. » · L3 « À l'inverse, être ignoré au profit d'un téléphone (le
"phubbing") est associé à moins d'intimité et de satisfaction dans le couple. » ·
Conclusion « L'amour se passe hors écran. » · CTA « Continuer »
**EN** — “Did you know scrolling can even reduce your ability to fall in love?” ·
“Falling in love takes attention. Eye contact. Undistracted time. Exactly what
scrolling takes from you.” · “In a famous study, 45 minutes of increasingly personal
questions were enough to bring two strangers closer.” · “On the other hand, being
ignored for a phone ("phubbing") is linked to less intimacy and satisfaction in
relationships.” · “Love happens off-screen.”
Sources : Aron et al., 1997 ; Ni et al., 2025.

**Transition 8→9** : le petit soleil monte, rétrécit, et devient le soleil du fond
d'écran du téléphone de l'écran 9.

---

### Écran 9 · Les apps NoReel sur ton écran d'accueil

**Moment signature — « l'échange »** (`HomeScreenMock`)
- Écran d'accueil (style iOS sur iOS, Android sur Android, via `Platform.OS`) : grille
  4 × 5 d'icônes abstraites originales (squircles pleins, glyphes géométriques simples,
  **aucune app réelle reconnaissable**). Deux icônes neutres portent les labels texte
  « Instagram » et « TikTok ».
- 400 ms : les icônes tremblent (mode édition, ±2°, cycles 140 ms, décalés).
- 900 ms : « Instagram » et « TikTok » se soulèvent (1,1, ombre), rétrécissent et
  s'envolent dans un dossier « Originales ».
- 1 500 ms : les icônes NoReel tombent du haut, **exactement à leurs anciennes places**
  (spring `bouncy`, `tap()` à l'atterrissage). Icônes originales : la marque NoReel
  dans un squircle de verre, teinte discrète par app. Labels « NoReel Insta » /
  « NoReel TikTok ».
- 2 400 ms : arrêt du tremblement. Un indicateur de toucher appuie sur « NoReel
  Insta » : zoom d'ouverture d'app sur une UI calme, puis fermeture.
- Boucle toutes les ~7 s, uniquement tant que l'écran est actif.

**Interactions** : CTA → `HomeScreenService.add()` par app.
`'added'` (Android) → coche animée + `success()` → Home. `'guided'` (iOS) →
`AddToHomeGuideSheet` → Home. `'unavailable'` → message clair → Home.
« Plus tard » → Home directement.

**Copy FR** — Titre « Tu peux ajouter les apps NoReel sur ton écran d'accueil. » ·
Corps « Mets-les à la place des originales. Même réflexe, même endroit, zéro reel. » ·
Étapes « Ajoute NoReel Insta et NoReel TikTok » / « Range les originales dans un
dossier » · Dossier « Originales » · CTA « Ajouter à l'écran d'accueil » · Secondaire
« Plus tard » · Indisponible « L'ajout automatique n'est pas disponible sur cet
appareil. Tu pourras le faire depuis les réglages de NoReel. »
**EN** — “You can add the NoReel apps to your home screen.” · “Put them where the
originals were. Same habit, same spot, zero reels.” · “Add NoReel Insta and NoReel
TikTok” / “Move the originals into a folder” · “Originals” · “Add to Home Screen” ·
“Later” · “Automatic adding isn't available on this device. You can do it later from
NoReel's settings.”

**Transition finale 9→Home** : le mock grandit jusqu'au plein écran (spring `gentle`,
~700 ms), son cadre se dissout, son fond d'écran devient le ciel de la Home (preset de
l'heure réelle), les icônes s'effacent, les panneaux apparaissent. `success()`. Puis
`completed = true` et `track('onboarding_completed')`.

## 8. La Home

**Moment signature : le ciel suit ta journée.** Preset selon l'heure locale,
interpolation continue, recalcul chaque minute sans saut.

| Preset | Heures | Zénith | Horizon | Soleil | `sunrise` |
|---|---|---|---|---|---|
| `homeNight` | 21–5 | `#0B0D1F` | `#242150` | `#FFB37D` | 0.10 |
| `homeDawn` | 5–9 | `#1E2A5E` | `#E58FA0` | `#FFB37D` | 0.75 |
| `homeDay` | 9–17 | `#1F4FC2` | `#6FA6F2` | `#FFE2B8` | 1.00 |
| `homeDusk` | 17–21 | `#2A1F5C` | `#F08A6C` | `#FFB37D` | 0.60 |

Texte blanc à toute heure : ajuster la teinte des panneaux pour tenir 4,5:1 même en
plein jour. Le jour est un bleu profond et saturé, **jamais pâle**.

**Sections (défilement vertical)**
1. **En-tête** : « Bonjour. » / « Bonsoir. » (`displayM`) + date longue localisée. Au
   défilement, le titre rétrécit et une barre de verre apparaît (flou interpolé sur
   les 60 premiers points).
2. **Héros — temps récupéré** : mini-horizon avec un soleil dont la hauteur =
   `reclaimed / goal` (spring `gentle`, odomètre de 0). « Objectif : {h} ». En bas, la
   semaine : 7 petits soleils dont la luminosité suit les minutes ; aujourd'hui entouré.
3. **Tuiles de lancement** (2 colonnes) : icône NoReel, nom, ce qu'on y garde, pastille
   non lus (mock). Tap → agrandissement plein écran (« portail », 380 ms) puis
   `FilteredAppsService.open(app)`. Au retour, la tuile reprend sa place.
4. **Protection** : état + interrupteur de verre. Active = lumière chaude faisant le
   tour de la bordure (dégradé conique Skia, **8 s par tour**). En pause = bordure
   neutre + texte explicite. Désactivation → confirmation.
5. **Chiffres** (2 panneaux) : reels évités cette semaine, jours de suite. Comptage
   depuis 0 seulement à la première apparition de la journée.
6. **Ta vie reprend des couleurs** : l'année en 365 carreaux (`YearGrid`), jours avec
   temps récupéré en `sun` (intensité ∝ minutes). Dessinée **une seule fois** via un
   `Picture` Skia. « Cette année, tu as récupéré {durée}. »
7. **Idée du jour** : pages ≈ minutes × 238 ÷ 275 ; km de marche ≈ minutes ÷ 12 ; ou
   « appeler quelqu'un que tu n'as pas vu depuis longtemps ». Change chaque jour.
8. **Tab bar flottante** (verre, `GlassView` sur iOS 26+) : Accueil, Stats, Réglages.
   Pastille active glissante (spring). Seul Accueil implémenté ; les autres = écrans
   vides propres.

**Android** : vrai flou seulement pour le héros et la tab bar ; le reste en verre
« solide ».

**Premier jour** : pas de zéro triste. Héros = soleil posé sur l'horizon + « Ouvre
NoReel Insta ou NoReel TikTok : ton temps récupéré s'affichera ici. » Chiffres = tiret
+ phrase qui dit quoi faire.

**Entrée** : panneaux en fondu, 80 ms d'écart, **sans glissement**. Le moment
signature, c'est le ciel.

**Copy FR** — « Bonjour. » (5–18) / « Bonsoir. » (18–5) · « de temps récupéré
aujourd'hui » · « Objectif : {h} » · « Ta semaine » · « NoReel Insta » / « Messages,
stories et abonnements » · « NoReel TikTok » / « Messages et abonnements » · « Ouvrir » ·
« Protection active » / « Protection en pause. Les reels sont de retour. » · « Mettre la
protection en pause ? » / « Mettre en pause » / « Garder active » · « reels évités cette
semaine » · « jours de suite » · « Ta vie reprend des couleurs » · « Cette année, tu as
récupéré {durée}. » · « Avec {h} : environ {n} pages d'un livre. » · « Accueil » /
« Stats » / « Réglages » · « Bientôt ici. »
**EN** — “Good morning.” (5–12) / “Good afternoon.” (12–18) / “Good evening.” (18–5) ·
“reclaimed today” · “Goal: {h}” · “Your week” · “Open NoReel Insta or NoReel TikTok:
the time you reclaim will show up here.” · “Messages, stories and following” ·
“Messages and following” · “Open” · “Protection on” / “Protection paused. Reels are
back.” · “Pause protection?” / “Pause” / “Keep it on” · “reels avoided this week” ·
“days in a row” · “Your life is getting its color back” · “This year, you've reclaimed
{duration}.” · “With {h}: about {n} pages of a book.” · “Home” / “Stats” / “Settings” ·
“Coming soon.”

## 9. Les calculs

`src/features/onboarding/calculations.ts` — fonctions pures, testées.
**Une seule source de vérité** pour les chiffres affichés et les carreaux allumés.

```ts
export const LIFE_YEARS = 80;
export const WAKING_HOURS = 16;

export function lifeStats(minutesPerDay: number, age: number) {
  const hoursPerDay = minutesPerDay / 60;
  const totalMonths = LIFE_YEARS * 12;                                 // 960
  const livedMonths = Math.min(Math.round(age * 12), totalMonths - 12);
  const remainingMonths = totalMonths - livedMonths;
  const lostMonths = Math.round((remainingMonths * hoursPerDay) / 24); // « jour et nuit »
  const hoursPerYear = hoursPerDay * 365;
  const hoursPerWeek = hoursPerDay * 7;
  const wakingShare = hoursPerDay / WAKING_HOURS;
  return { totalMonths, livedMonths, remainingMonths, lostMonths,
           hoursPerYear, hoursPerWeek, wakingShare };
}

export const ACTIVITIES = [
  { id: 'books', costHours: 6 }, { id: 'language', costHours: 550 },
  { id: 'instrument', costHours: 200 }, { id: 'marathon', costHours: 100 },
  { id: 'code', costHours: 450 },
] as const;

export function activityCount(hoursPerYear: number, costHours: number): number {
  return hoursPerYear / costHours;   // ≥1 → floor à l'affichage ; <1 → pourcentage
}
export function friendEveningsPerWeek(hoursPerWeek: number): number {
  return Math.min(Math.floor(hoursPerWeek / 4), 7);
}
```

`formatLifeDuration(months)` : ≥12 → « {a} an(s) et {m} mois » (sans « et 0 mois ») ;
1–11 → « {m} mois » ; 0 → « moins d'un mois ». Équivalent EN.

**Tests obligatoires**

| Minutes/jour | Âge | `lostMonths` | Affichage FR | Temps éveillé | Heures/an |
|---|---|---|---|---|---|
| 180 | 22 | 87 | 7 ans et 3 mois | 19 % | 1 095 |
| 195 | 24 | 91 | 7 ans et 7 mois | 20 % | 1 186 |
| 150 | 25 | 69 | 5 ans et 9 mois | 16 % | 913 |
| 300 | 18 | 155 | 12 ans et 11 mois | 31 % | 1 825 |
| 15 | 70 | 1 | 1 mois | 2 % | 91 |
| 720 | 13 | 402 | 33 ans et 6 mois | 75 % | 4 380 |

Pour 1 095 h/an : livres 182, langues 1, instruments 5, marathons 10, code 2.
Pour 21 h/semaine : 5 soirées.

## 10. Sources et formulation

Toutes les affirmations renvoient à `SourcesSheet` (liste lisible, liens si DOI,
section « Méthode de calcul » expliquant le §9 en français simple).

Règles : formulations prudentes (« associé à », « peut », « les chercheurs
observent »). **Jamais « prouvé », « détruit », « cause ».** Aucun chiffre sans source,
aucune source inventée. TODO bloquant dans le README : **faire relire chaque source et
chaque formulation par un humain avant publication.**

1. Nguyen, L. et al. (2025). Feeds, feelings, and focus. *Psychological Bulletin*,
   151(9), 1125–1146. doi:10.1037/bul0000498. 71 études, 98 299 participants :
   r = −0,34 cognition, −0,38 attention, −0,41 contrôle inhibiteur. Corrélationnel.
2. Mark, G. (2023). *Attention Span*. Hanover Square Press ; González & Mark (2004),
   CHI 2004. ~2 min 30 en 2004, 75 s en 2012, 47 s depuis ~2016 (médiane 40 s).
   Mesure un changement d'écran, pas une limite biologique.
3. Guillot, C. R. et al. (2016). *Computers in Human Behavior*, 62, 475–479.
   L'anhédonie prédit un usage plus compulsif ~1 an plus tard.
4. Ni, N. et al. (2025). *Frontiers in Psychology*, 16, 1561159.
   doi:10.3389/fpsyg.2025.1561159. 52 études, 19 698 participants.
5. Aron, A. et al. (1997). *PSPB*, 23(4), 363–377.
6. Brysbaert, M. (2019). *Journal of Memory and Language*, 109, 104047. ~238 mots/min
   (non-fiction), 260 (fiction) : base du « ≈ 6 h par livre » (~85 000 mots).
7. CECRL, guided learning hours (Cambridge English) : B2 ≈ 500–600 h.
8. Instrument, marathon, bootcamp : ordres de grandeur, présentés comme tels.

Copy FR : « Sources et méthode » · « Méthode de calcul » · « On part de ton temps
quotidien et de ton âge, jusqu'à 80 ans. Mois sur ton téléphone = mois restants ×
heures par jour ÷ 24. Part du temps éveillé = heures par jour ÷ 16. » · « Fermer »

## 11. Accessibilité et performance

**Accessibilité** — « Réduire les animations » (`useReducedMotion`) : pas de parallaxe,
pas de grands déplacements, scènes à l'état final avec fondu ≤ 250 ms, grille
directement remplie. « Réduire la transparence » : verre quasi opaque. Lecteurs
d'écran : titre annoncé à l'arrivée, canvas décoratifs masqués, scènes porteuses de
sens avec label résumé, cadran et règle en `adjustable`. Très grandes tailles : rien
de coupé. Cibles ≥ 44 × 44 pt.

**Performance** — Tout sur le thread UI. Aucun `setState` par frame. Au plus 2 écrans
montés ; horloges en pause hors écran actif et en arrière-plan. Shaders compilés une
fois au niveau module. Particules : un seul `<Points>` / `Atlas` par système.
Mesures en release sur Android milieu de gamme et iPhone ancien : 60 fps constants.
Résultats dans `DECISIONS.md`.

## 12. Mode démo

`EXPO_PUBLIC_DEMO=1` : l'onboarding se joue seul (3 h 15, 22 ans, « J'ai arrêté de
compter ») ; chaque CTA « tapé » 1,2 s après la fin de la timeline ; indicateur de
toucher translucide ; haptique coupée ; Home en profil `day30`.
But : enregistrer les vidéos App Store sans rater une prise.

## 13. Phases

0. Reconnaissance, `PLAN.md`, feu vert.
1. Fondations : projet, config, polices, tokens, i18n complet, store, services mock,
   haptique, `useTimeline`, `useTilt`, playground.
2. Ciel et verre : `SkyBackground` + presets + transitions, `Glass` (4 rendus),
   boutons, chrome, logo animable, splash et icônes. **Vérifier le flou Android sur
   appareil réel dès cette phase** : plus gros risque technique.
3. Écrans 1 à 4.
4. Écrans 5 et 6 + `calculations.ts` + tests.
5. Écrans 7 à 9 + transition finale + `SourcesSheet`.
6. Home.
7. Finitions : accessibilité, reduced motion/transparency, perf release, mode démo,
   README.

Fin de chaque phase : typecheck, lint, tests, captures, autocritique, commit, résumé
de 5 lignes.

## 14. Définition de « terminé »

- [ ] 9 écrans + Home, FR et EN, **aucun texte en dur**.
- [ ] Chaque écran a son moment signature, rien de générique autour.
- [ ] Continuités parfaites : splash→1, 3→4, 5→6, 8→9, 9→Home.
- [ ] Le ciel progresse de la nuit au matin ; la Home suit l'heure réelle.
- [ ] 60 fps en release sur Android milieu de gamme ; 120 sur ProMotion.
- [ ] Tout interruptible sans état cassé ; aucune double navigation.
- [ ] Reduced motion et reduced transparency gérés, et ça reste beau.
- [ ] Chiffres et carreaux cohérents ; tests des calculs au vert.
- [ ] Chaque affirmation sourcée ; aucune marque tierce reproduite.
- [ ] Services stub derrière interfaces ; slots `permissions` et `paywall` prévus.
- [ ] `README.md`, `PLAN.md`, `DECISIONS.md` à jour.

## Annexes

Les shaders (A : ciel, B : grille de vie) et les tokens de mouvement / `useTimeline`
(C) sont repris tels quels depuis le brief d'origine dans les fichiers du projet :
- `src/components/sky/sky.sksl.ts`
- `src/features/onboarding/scenes/lifegrid.sksl.ts`
- `src/theme/motion.ts`, `src/lib/ease.ts`, `src/lib/useTimeline.ts`

Ce sont des points de départ, à régler à l'œil dans le playground. Vérifier la syntaxe
SkSL contre la doc de la version installée de React Native Skia.
