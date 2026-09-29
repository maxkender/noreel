import { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { withAlpha } from '@/theme/colors';
import { useColors } from '@/theme/useColors';
import { useT } from '@/i18n';
import { useOnboardingStore } from '@/store/onboarding';
import { authorizationStatus } from '@/services/shield.real';
import { prepareReport, reportAvailable, type ReportStrings } from '@/native/screenTimeReport';

/*
 * Le rapport d'Apple, vu depuis le parcours.
 *
 * Quatre ecrans le montrent — la comparaison, l'analyse, la part de la
 * journee, les annees — et tous ont la meme question a poser avant : peut-il
 * s'afficher ici, maintenant ? Une seule reponse, ici, pour que les quatre
 * ne divergent jamais.
 */

/** Les textes que l'extension dessinera, dans la langue de l'app. */
export function reportStrings(d: ReturnType<typeof useT>['d']): ReportStrings {
  const t = d.time;
  return {
    lessTitle: t.lessTitle, lessSub: t.lessSub, moreTitle: t.moreTitle, moreSub: t.moreSub,
    sameTitle: t.sameTitle, sameSub: t.sameSub, deltaLess: t.deltaLess, deltaMore: t.deltaMore,
    deltaSame: t.deltaSame, guessLabel: t.guessLabel, realLabel: t.realLabel,
    verdictLess: t.verdictLess, verdictMore: t.verdictMore, verdictSame: t.verdictSame,
    analysisTitle: t.analysisTitle, analysisSub: t.analysisSub, perYear: t.perYear,
    pickupsTitle: t.pickupsTitle, pickupsBody: t.pickupsBody, topApps: t.topApps,
    noDataTitle: t.noDataTitle, noDataBody: t.noDataBody,
    unitH: t.unitH, unitMin: t.unitMin,
    // La part de la journee et les annees : les memes mots que les ecrans
    // JavaScript, pour que les deux chemins racontent la meme chose.
    gone: d.s6.gone, overflow: d.misc.overflow,
    screenKey: d.misc.screenKey, workKey: d.misc.workKey, freeKey: d.misc.freeKey,
    years: d.s6.years, lifeOf: d.s6.lifeOf, bodyShort: d.s6.bodyShort, basis: d.s6.basis,
  };
}

/**
 * Le rapport d'Apple peut-il s'afficher ICI, maintenant ?
 *
 * Il faut l'extension dans le binaire ET l'autorisation Temps d'ecran. La
 * seconde ne se sait qu'en demandant : d'ou trois etats, et non deux — tant
 * qu'on ne sait pas, on n'affiche ni la vue native ni la saisie, sinon l'une
 * des deux apparait pour disparaitre aussitot.
 *
 * « yes » n'est dit qu'une fois l'estimation, l'age et les textes ECRITS
 * dans le groupe partage. L'extension les lit au moment ou iOS lui demande
 * son dessin, c'est-a-dire des que la vue existe : ecrire apres l'avoir
 * montee, c'etait courir contre elle, et perdre revenait a comparer le vrai
 * chiffre a zero.
 */
export function useNativeReport(guess: number): 'yes' | 'no' | 'unknown' {
  const c = useColors();
  const { d } = useT();
  const age = useOnboardingStore((x) => x.age);
  const [state, setState] = useState<'yes' | 'no' | 'unknown'>(reportAvailable() ? 'unknown' : 'no');

  // Le dictionnaire et la palette sont des objets stables — une langue, un
  // theme — et l'age un nombre : l'effet ne tourne qu'une fois par ecran.
  useEffect(() => {
    if (!reportAvailable()) return;
    let alive = true;
    void authorizationStatus().then((a) => {
      if (!alive) return;
      if (a !== 'approved') { setState('no'); return; }
      prepareReport(guess, reportStrings(d), {
        accent: c.accent, danger: c.danger, good: '#2E9E5B', ink: c.mist, inkSoft: withAlpha(c.mist, 0.6),
      }, { age });
      setState('yes');
    });
    return () => { alive = false; };
  }, [guess, d, c, age]);
  return state;
}

/**
 * La place qu'on reserve au dessin d'Apple.
 *
 * L'extension ne dit pas sa taille — elle ne dit rien — et la vue hote rogne
 * ce qui deborde. On lui donne donc ce que l'ecran a, entre un plancher
 * sous lequel les barres perdraient leurs pieds et un plafond au-dela duquel
 * le bouton partirait sous le bord.
 */
export function useReportHeight(min: number, max: number): number {
  const { height } = useWindowDimensions();
  return Math.min(max, Math.max(min, height - 300));
}
