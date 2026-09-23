import * as DA from 'react-native-device-activity';
import { FAMILY_CONTROLS_ENABLED } from './shield.real';

/**
 * Applique la selection d'apps choisie dans le sélecteur d'Apple.
 *
 * `blockSelection` remplace `enableBlockAllMode` : bloquer tout etait un
 * marteau, et l'utilisateur perdait aussi ses apps utiles.
 */
export function applySelection(selection: string | null): void {
  if (!FAMILY_CONTROLS_ENABLED) return;
  try {
    // Le jeton d'Apple, tel quel : il est opaque et ne se lit pas.
    if (selection) DA.blockSelection({ activitySelectionToken: selection });
    else DA.resetBlocks();
  } catch {
    /* le blocage n'est pas critique pour le reste de l'app */
  }
}
