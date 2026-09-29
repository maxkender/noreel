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
 * Apple ne donne le temps d'ecran a aucune app : il accepte seulement de le
 * DESSINER lui-meme, dans une extension isolee, a l'interieur d'un cadre
 * que l'app lui prete. L'app ne lira jamais le chiffre. Ce qu'elle peut
 * faire, c'est passer a l'extension ce qu'il lui faut pour dessiner juste :
 * l'estimation, les textes dans sa langue, les couleurs.
 */

/** Les textes que l'extension dessinera, dans la langue de l'app. */
export function reportStrings(d: ReturnType<typeof useT>['d']): ReportStrings {
  const t = d.time;
  return {
    lessTitle: t.lessTitle, lessSub: t.lessSub, moreTitle: t.moreTitle, moreSub: t.moreSub,
    sameTitle: t.sameTitle, sameSub: t.sameSub, deltaLess: t.deltaLess, deltaMore: t.deltaMore,
    deltaSame: t.deltaSame, guessLabel: t.guessLabel, realLabel: t.realLabel,
    verdictLess: t.verdictLess, verdictMore: t.verdictMore, verdictSame: t.verdictSame,
    noDataTitle: t.noDataTitle, noDataBody: t.noDataBody,
    unitH: t.unitH, unitMin: t.unitMin,
  };
}

/**
 * Le rapport d'Apple peut-il s'afficher ICI, maintenant ?
 *
 * Il faut l'extension dans le binaire ET l'autorisation Temps d'ecran. La
 * seconde ne se sait qu'en demandant : d'ou trois etats, et non deux.
 *
 * « yes » n'est dit qu'une fois l'estimation et les textes ECRITS dans le
 * groupe partage. L'extension les lit au moment ou iOS lui demande son
 * dessin, c'est-a-dire des que la vue existe : ecrire apres l'avoir montee,
 * c'etait courir contre elle, et perdre revenait a comparer le vrai chiffre
 * a zero.
 */
export function useNativeReport(guess: number): 'yes' | 'no' | 'unknown' {
  const c = useColors();
  const { d } = useT();
  const age = useOnboardingStore((x) => x.age);
  const [state, setState] = useState<'yes' | 'no' | 'unknown'>(reportAvailable() ? 'unknown' : 'no');

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
 * ce qui deborde. On lui donne ce que l'ecran a, entre un plancher et un
 * plafond.
 */
export function useReportHeight(min: number, max: number): number {
  const { height } = useWindowDimensions();
  return Math.min(max, Math.max(min, height - 320));
}
