import { requireNativeViewManager, requireOptionalNativeModule } from 'expo-modules-core';
import type { ComponentType } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

/**
 * Le module natif, s'il a ete construit — et rien sinon.
 *
 * Il n'existe que dans un binaire ou l'extension est presente. Dans Expo Go,
 * dans les tests, ou dans un build fait sans le flag, il n'y a rien a
 * charger : on rend null, jamais une exception, et l'app choisit son autre
 * chemin.
 */
const Native = requireOptionalNativeModule<{ isSupported(): boolean }>('ScreenTimeReportHost');

export type ScreenTimeReportProps = {
  /** « compare » : l'estimation face au vrai chiffre. « overview » : l'analyse. */
  context: 'compare' | 'overview';
  /** La fenetre, en jours. Sept par defaut. */
  days?: number;
  style?: StyleProp<ViewStyle>;
};

let View: ComponentType<ScreenTimeReportProps> | null = null;
try {
  if (Native) View = requireNativeViewManager<ScreenTimeReportProps>('ScreenTimeReportHost');
} catch {
  View = null;
}

/** Vrai quand la vue peut s'afficher sur cet appareil : module present, iOS 16+. */
export const supported = (): boolean => {
  try { return !!Native && Native.isSupported() && View !== null; } catch { return false; }
};

export const ScreenTimeReportView = View;
