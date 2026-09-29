import { Platform } from 'react-native';
import * as DA from 'react-native-device-activity';
import { FAMILY_CONTROLS_ENABLED } from '@/services/shield.real';
import { supported } from '../../modules/screen-time-report-host';

/*
 * Le vrai temps d'ecran, tel qu'Apple le permet.
 *
 * Il n'y a pas d'API a appeler. Il y a une extension isolee qui recoit les
 * chiffres et les dessine, et une vue dans l'app qui montre ce dessin. L'app
 * ne lira jamais le chiffre. Ce qu'elle PEUT faire, c'est envoyer a
 * l'extension ce dont celle-ci a besoin pour dessiner juste — l'estimation
 * de la personne, les textes dans sa langue, les couleurs du theme — par le
 * groupe partage, que l'extension a le droit de lire.
 *
 * Les deux chemins coexistent : quand l'extension est la et que Temps
 * d'ecran est autorise, c'est elle qui montre la comparaison ; sinon la
 * personne recopie son chiffre depuis Reglages. Le flag tient au binaire :
 * une extension demande son propre profil de signature, et on ne l'impose
 * pas a un build qui n'en a pas.
 */

export const REPORT_ENABLED =
  Platform.OS === 'ios'
  && FAMILY_CONTROLS_ENABLED
  && process.env.EXPO_PUBLIC_SCREEN_TIME_REPORT === '1';

/** L'extension peut afficher un rapport sur cet appareil. */
export function reportAvailable(): boolean {
  return REPORT_ENABLED && supported();
}

export type ReportStrings = Record<string, string>;
export type ReportColors = {
  accent: string; danger: string; good: string; ink: string; inkSoft: string;
};

/**
 * Ce que l'extension lira avant de dessiner.
 *
 * A appeler AVANT de monter la vue : l'extension lit au moment ou iOS lui
 * demande sa configuration, et une estimation posee apres coup ne serait
 * vue qu'au prochain affichage.
 */
export function prepareReport(
  guessMinutes: number, strings: ReportStrings, colors: ReportColors, numbers: { age?: number } = {},
): void {
  if (!REPORT_ENABLED) return;
  try {
    // Le stockage partage passe par la bibliotheque de blocage, qui ecrit
    // deja dans le meme groupe : un seul chemin vers ce disque-la.
    DA.userDefaultsSet('unswipe.report.guess', Math.round(guessMinutes));
    DA.userDefaultsSet('unswipe.report.strings', strings);
    DA.userDefaultsSet('unswipe.report.colors', colors);
    // L'age sert aux annees qu'il reste : la scene « years » le lit.
    if (numbers.age) DA.userDefaultsSet('unswipe.report.age', Math.round(numbers.age));
  } catch {
    // Sans groupe partage, la vue dessinera avec ses valeurs de secours :
    // un rapport lisible vaut mieux qu'un ecran qui leve.
  }
}

export { ScreenTimeReportView } from '../../modules/screen-time-report-host';
