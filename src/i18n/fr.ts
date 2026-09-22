/** Espace fine insécable (U+202F) avant ? ! ; — insécable (U+00A0) avant : et dans « ». */
const NNBSP = ' ';
const NBSP = ' ';

export const fr = {
  app: { name: 'UnSwipe' },

  tapHint: 'Touche l’écran pour continuer',

  chrome: {
    step: 'Étape {n} sur {total}',
    back: 'Retour',
  },

  s1: {
    title1: 'Garde tes {potes}.',
    title2: 'Vire les reels.',
    subtitle: 'Instagram et TikTok. Sans le vide.',
    cta: 'Commencer',
  },

  s2: {
    title: 'Les mêmes apps.\nSans le {piège}.',
    body: 'Tes messages et tes potes restent. Le reste part.',
    keep1: 'Tes messages',
    keep2: 'Les stories et posts des gens que tu suis',
    remove: 'Reels, Explorer, Pour toi',
    pill: 'Version UnSwipe',
    instagram: 'Instagram',
    tiktok: 'TikTok',
    cta: 'Continuer',
  },

  s3: {
    title: `Combien de fois tu t'es dit que tu allais arrêter de scroller${NNBSP}?`,
    body: `Et puis tu y retournes. Par FOMO. Pour voir les reels de tes potes. Quarante minutes plus tard, il est 1${NBSP}h${NBSP}47.`,
    excuses: [
      'Juste 5 minutes.',
      `Léa m'a envoyé un reel, je regarde juste ça.`,
      'Tout le monde en parle, faut que je voie.',
      'Je veux pas rater ça.',
      'Allez, le dernier.',
      'Ok, vraiment le dernier.',
      'Bon… un dernier.',
    ],
    daily: 'Tous les jours',
    weekly: 'Plusieurs fois par semaine',
    lostCount: `J'ai arrêté de compter`,
    cta: 'Je me reconnais',
  },

  s4: {
    title: `C'est pour ça qu'on a construit la solution ultime.`,
    body: 'Les mêmes plateformes. Sans les fonctionnalités qui ruinent ton cerveau.',
    before: 'Avant',
    after: 'Avec UnSwipe',
    note: `Un pote t'envoie un reel${NNBSP}? Tu le regardes. Et c'est tout.`,
    cta: 'Calculer mon temps',
  },

  s5: {
    titleA: `Combien de temps passes-tu sur Insta et TikTok par jour${NNBSP}?`,
    unit: 'par jour',
    liveShare: 'Soit {p}{nbsp}% de ta journée éveillée.',
    liveWeek: '{h} par semaine.',
    helpIos: `Pas sûr${NNBSP}? Réglages > Temps d'écran`,
    helpAndroid: `Pas sûr${NNBSP}? Paramètres > Bien-être numérique`,
    ctaA: 'Valider',
    titleB: `Et tu as quel âge${NNBSP}?`,
    bodyB: 'Pour voir ce que ça représente sur ta vie.',
    ageValue: '{n} ans',
    ctaB: 'Voir ma vie en carreaux',
  },

  s6: {
    pill: '{h} par jour, {n} ans',
    title: 'Voici la part de ton {temps éveillé} passée sur un écran.',
    subtitle: `Un carreau, c'est un mois.`,
    legendLived: 'vécu',
    legendLost: 'sur ton téléphone',
    legendAhead: 'devant toi',
    body: 'Sur une vie de 80 ans, ça représente {y} ans passés devant un écran, les yeux ouverts.',
    years: '{y} ans',
    bodyShort: 'passés devant un écran, les yeux ouverts. Sur une vie de 80 ans.',
    cta1: 'Récupérer ce temps',
    afterTitle: 'Chaque année, tu passes {h} sur Insta et TikTok. Avec ce temps, tu pourrais{nbsp}:',
    estimates: 'Estimations indicatives.',
    sources: 'Sources et méthode',
    cta2: 'Continuer',
    a11y: 'Ta vie en mois{nbsp}: {lived} mois vécus, {lost} mois sur ton téléphone, {ahead} mois devant toi.',
    activities: {
      books: { one: 'livre lu', other: 'livres lus', detail: `≈ 6${NBSP}h par livre` },
      language: { one: 'nouvelle langue au niveau B2', other: 'nouvelles langues au niveau B2', detail: `≈ 550${NBSP}h pour le niveau B2` },
      instrument: { one: 'instrument appris', other: 'instruments appris', detail: `≈ 200${NBSP}h pour jouer tes morceaux préférés` },
      marathon: { one: 'marathon préparé', other: 'marathons préparés', detail: `≈ 100${NBSP}h d'entraînement chacun` },
      code: { one: 'formation complète au code', other: 'formations complètes au code', detail: `≈ 450${NBSP}h, comme un bootcamp intensif` },
      friends: { one: 'soirée de plus avec tes potes, chaque semaine', other: 'soirées de plus avec tes potes, chaque semaine', detail: 'calculé sur ton temps hebdomadaire' },
    },
    progress: '{p}{nbsp}% du chemin',
  },

  s7: {
    title: 'Ce que le scroll fait à ton cerveau.',
    p1Title: 'Moins de concentration',
    p1Number: `47${NBSP}s`,
    p1Body: `C'est le temps moyen qu'on passe aujourd'hui sur un écran avant de passer à autre chose. En 2004, c'était 2${NBSP}min${NBSP}30. Et une grande méta-analyse de 2025 associe l'usage intensif des vidéos courtes à une attention plus fragile et à moins de contrôle de soi.`,
    p1Back: `Gloria Mark (UC Irvine), Attention Span, 2023. Nguyen et al., Psychological Bulletin, 2025{nbsp}: 71 études, 98{nbsp}299 participants. Ce sont des associations, pas une preuve de cause à effet.`,
    p1Sentences: [
      'Tu commences à lire une phrase, tu arrives au milieu et',
      'Une autre idée arrive, plus rapide, plus',
      'Puis une notification, puis',
    ],
    p2Title: 'Moins de plaisir dans la vraie vie',
    p2Definition: `Anhédonie{nbsp}: la difficulté à ressentir du plaisir.`,
    p2Body: `Quand ton cerveau reçoit une récompense toutes les quelques secondes, les plaisirs lents (un livre, un dîner, une balade) peuvent paraître fades. Les chercheurs observent un cercle vicieux{nbsp}: moins on ressent de plaisir, plus on cherche des récompenses rapides, et inversement.`,
    p2Back: `Guillot et al., Computers in Human Behavior, 2016. Nguyen et al., Psychological Bulletin, 2025. Un cercle vicieux documenté, pas un diagnostic.`,
    source: 'Source',
    backFace: 'Retour',
    allSources: 'Toutes les sources',
    cta: 'Continuer',
  },

  s8: {
    title: `Savais-tu que le scroll peut même diminuer ta capacité à tomber amoureux${NNBSP}?`,
    l1: `Tomber amoureux, ça demande de l'attention. Des regards. Du temps sans distraction. Exactement ce que le scroll te prend.`,
    l2: `Dans une étude célèbre, 45 minutes de questions de plus en plus personnelles ont suffi à rapprocher deux inconnus.`,
    l3: `À l'inverse, être ignoré au profit d'un téléphone (le «${NBSP}phubbing${NBSP}») est associé à moins d'intimité et de satisfaction dans le couple.`,
    conclusion: `L'amour se passe hors écran.`,
    sources: 'Sources',
    cta: 'Continuer',
  },

  s9: {
    title: `Tu peux ajouter les apps UnSwipe sur ton écran d'accueil.`,
    body: 'Mets-les à la place des originales. Même réflexe, même endroit, zéro reel.',
    step1: 'Ajoute UnSwipe Insta et UnSwipe TikTok',
    step2: 'Range les originales dans un dossier',
    folder: 'Originales',
    appInsta: 'UnSwipe Insta',
    appTiktok: 'UnSwipe TikTok',
    cta: `Ajouter à l'écran d'accueil`,
    later: 'Plus tard',
    unavailable: `L'ajout automatique n'est pas disponible sur cet appareil. Tu pourras le faire depuis les réglages de UnSwipe.`,
  },

  paywall: {
    kicker: 'UnSwipe Pro',
    title: 'Aide-toi à tenir.',
    subtitle: 'Les trois premiers jours sont les plus durs.',
    free: 'Gratuit',
    pro: 'Pro',
    f1: 'Bloquer les fils de vidéos courtes',
    f2: 'Bloquer les apps d’origine',
    f3: 'Masquer les posts suggérés',
    f4: 'Mode nuit',
    f5: 'Plusieurs comptes',
    yearly: '49,90 €/an',
    yearlySub: '4,16 €/mois',
    monthly: '7,99 €/mois',
    monthlySub: 'Facturé mensuellement',
    save: 'Économise 48 %',
    cta: 'Débloquer Pro',
    skip: 'Continuer avec la version gratuite',
    soon: 'Les paiements arrivent bientôt. Tout est gratuit pour l’instant.',
  },

  brain: {
    intro: 'Appuie pour découvrir ce que le doomscrolling fait à ton {cerveau}.',
    introSub: 'Sources scientifiques récentes.',
    title: 'Voici ce que le doomscrolling fait à ton {cerveau}.',
    step1: 'Dose de dopamine trop élevée',
    step1b: 'Chaque vidéo courte déclenche une récompense. Des centaines par jour.',
    step2: 'Tes récepteurs s’aplatissent',
    step2b: 'Ton cerveau baisse le volume pour se protéger de l’excès.',
    step3: 'Plus rien ne fait d’effet',
    step3b: 'Ressentir du plaisir, te concentrer, tomber amoureux : tout devient plus fade.',
    love: 'Ça peut même limiter ta capacité à {tomber amoureux}.',
    loveSub: 'L’amour naissant passe par le même circuit : l’aire tegmentale ventrale et le noyau caudé, ceux de la dopamine.',
    loveCite: 'Fisher, Aron & Brown · Journal of Comparative Neurology, 2005',
    loveEnd: 'Le saturer toute la journée, c’est émousser ce qui te fait vibrer.',
    fix: 'Avec UnSwipe, tu répares tes récepteurs sans perdre contact avec tes proches.',
    cta: 'Continuer',
  },

  home: {
    morning: 'Bonjour.',
    evening: 'Bonsoir.',
    reclaimedToday: 'de temps récupéré aujourd’hui',
    goal: 'Objectif{nbsp}: {h}',
    yourWeek: 'Ta semaine',
    dayOne: `Ouvre UnSwipe Insta ou UnSwipe TikTok{nbsp}: ton temps récupéré s'affichera ici.`,
    instaSub: 'Messages et stories, sans les Reels',
    tiktokSub: 'Tes abonnements, sans le fil Pour toi',
    youtubeSub: 'Tes abonnements, sans les Shorts',
    open: 'Ouvrir',
    shieldOn: 'Protection active',
    shieldOff: 'Protection en pause. Les reels sont de retour.',
    shieldConfirm: `Mettre la protection en pause${NNBSP}?`,
    shieldPause: 'Mettre en pause',
    shieldKeep: 'Garder active',
    reelsAvoided: 'reels évités cette semaine',
    streak: 'jours de suite',
    yearTitle: 'Ta vie reprend des couleurs',
    yearBody: 'Cette année, tu as récupéré {duration}.',
    idea: 'Avec {h}{nbsp}: environ {n} pages d’un livre.',
    tabHome: 'Accueil',
    tabStats: 'Stats',
    tabSettings: 'Réglages',
    soon: 'Bientôt ici.',
  },

  nav: {
    home: 'Accueil',
    block: 'Blocage',
    account: 'Compte',
  },
  block: {
    title: 'Blocage',
    shield: 'Protection',
    shieldOn: 'Les reels et les shorts sont filtrés',
    shieldOff: 'Filtrage en pause',
    activate: 'Activer',
    pause: 'Mettre en pause',
    screenTime: 'Bloquer les apps d’origine',
    screenTimeBody: 'Empêche Instagram et TikTok de s’ouvrir normalement, via Temps d’écran.',
    screenTimeSoon: 'Bientôt disponible',
    authorize: 'Autoriser Temps d’écran',
    homeScreen: 'Remettre les apps sur l’écran d’accueil',
    homeScreenBody: 'Place UnSwipe Insta et UnSwipe YouTube là où étaient les originales.',
    add: 'Ajouter',
    redirect: 'Rediriger les apps d’origine',
    redirectBody: 'Ouvrir Instagram ou TikTok renvoie vers la version filtrée.',
  },
  account: {
    title: 'Compte',
    profile: 'Ton profil',
    screenTimeValue: 'Temps d’écran déclaré',
    ageValue: 'Âge',
    edit: 'Modifier',
    data: 'Tes données',
    dataBody: 'Tout reste sur ton téléphone. Rien n’est envoyé ailleurs.',
    sources: 'Sources et méthode',
    restart: 'Refaire l’introduction',
    version: 'Version',
  },

  referral: {
    title: 'Invite 5 amis, gagne 1 an de Pro',
    body: 'Chaque ami qui entre ton code te rapproche. À cinq, tu passes Pro gratuitement pendant un an.',
    yourCode: 'Ton code',
    copied: 'Copié',
    copy: 'Copier',
    share: 'Partager',
    progress: '{n} / 5 amis inscrits',
    unlocked: 'Pro débloqué pour 1 an',
    shareText: 'Je suis passé à UnSwipe : Instagram et TikTok sans les reels. Prends mon code {code}, tu as une semaine de Pro offerte.',
  },

  sources: {
    title: 'Sources et méthode',
    method: 'Méthode de calcul',
    methodBody: `On part de ton temps quotidien et de ton âge, jusqu'à 80 ans. Mois sur ton téléphone = mois restants × heures par jour ÷ 24. Part du temps éveillé = heures par jour ÷ 16.`,
    close: 'Fermer',
  },

  duration: {
    lessThanMonth: `moins d'un mois`,
    months: '{m} mois',
    years: '{y} an{s} et {m} mois',
    yearsOnly: '{y} an{s}',
  },
} as const;

/**
 * Élargit les chaînes littérales en `string` tout en conservant la structure
 * des clés : en.ts doit avoir exactement les mêmes clés, mais un autre texte.
 * C'est ce qui rend impossible d'oublier une traduction.
 */
type Widen<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? Widen<U>[]
    : { -readonly [K in keyof T]: Widen<T[K]> };

export type Dict = Widen<typeof fr>;
