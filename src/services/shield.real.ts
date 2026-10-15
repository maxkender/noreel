import { Platform } from 'react-native';
import * as DA from 'react-native-device-activity';
import { Asset } from 'expo-asset';
import type { ShieldService } from './types';
import { dict } from '@/i18n';

/**
 * Blocage réel via FamilyControls / ManagedSettings (iOS 16+).
 *
 * Ce module n'est actif que si l'app est compilée avec l'entitlement
 * `com.apple.developer.family-controls`. Apple ne l'accorde pour la
 * DISTRIBUTION qu'après examen d'une demande :
 *   https://developer.apple.com/contact/request/family-controls-distribution
 * Tant qu'elle n'est pas accordée, `services/index.ts` sert le mock.
 */

export const FAMILY_CONTROLS_ENABLED =
  Platform.OS === 'ios' && process.env.EXPO_PUBLIC_FAMILY_CONTROLS === '1';

export type AuthState = 'notDetermined' | 'denied' | 'approved' | 'unsupported';

export async function authorizationStatus(): Promise<AuthState> {
  if (!FAMILY_CONTROLS_ENABLED) return 'unsupported';
  try {
    const s = DA.getAuthorizationStatus();
    if (s === DA.AuthorizationStatus.approved) return 'approved';
    if (s === DA.AuthorizationStatus.denied) return 'denied';
    return 'notDetermined';
  } catch {
    return 'unsupported';
  }
}

/** Ouvre la feuille système. L'utilisateur seul peut accorder l'accès. */
export async function requestAuthorization(): Promise<AuthState> {
  if (!FAMILY_CONTROLS_ENABLED) return 'unsupported';
  try {
    await DA.requestAuthorization('individual');
    return authorizationStatus();
  } catch {
    return 'denied';
  }
}

/*
 * L'ECRAN DE BLOCAGE, A NOUS.
 *
 * Sans configuration, iOS montre son ecran « Restriction » gris : on ne sait
 * ni pourquoi l'app est fermee, ni ou aller. On pose le notre, comme
 * SocialLite : le logo, « Ouvrir UnSwipe », une phrase qui nomme l'app, et
 * un bouton qui ouvre UnSwipe. Le bouton lance device-activity:// (le lien
 * fixe de la bibliotheque), declare comme lien d'UnSwipe dans app.config.
 */
const ICON = 'unswipe-shield.png';

export async function configureShield(words: { title: string; subtitle: string; open: string; close: string }): Promise<void> {
  if (!FAMILY_CONTROLS_ENABLED) return;
  try {
    // Le logo, copie une fois dans le dossier partage que l'extension sait lire.
    let icon: string | undefined;
    try {
      const [asset] = await Asset.loadAsync(require('@/assets/brand/mark.png'));
      const dir = DA.getAppGroupFileDirectory();
      if (asset.localUri && dir) {
        DA.copyFile(asset.localUri, `${dir}/${ICON}`, true);
        icon = ICON;
      }
    } catch { /* sans logo, l'ecran reste lisible */ }
    DA.updateShield(
      {
        backgroundColor: { red: 14, green: 15, blue: 17, alpha: 1 },
        title: words.title,
        titleColor: { red: 255, green: 255, blue: 255, alpha: 1 },
        subtitle: words.subtitle,
        subtitleColor: { red: 170, green: 174, blue: 182, alpha: 1 },
        ...(icon ? { iconAppGroupRelativePath: icon } : { iconSystemName: 'hand.raised.fill' }),
        primaryButtonLabel: words.open,
        primaryButtonLabelColor: { red: 10, green: 10, blue: 12, alpha: 1 },
        primaryButtonBackgroundColor: { red: 245, green: 245, blue: 247, alpha: 1 },
        secondaryButtonLabel: words.close,
        secondaryButtonLabelColor: { red: 170, green: 174, blue: 182, alpha: 1 },
      },
      {
        primary: { behavior: 'close', actions: [{ type: 'openApp' }] },
        secondary: { behavior: 'close' },
      },
    );
  } catch { /* l'ecran d'Apple reste en place : rien de casse */ }
}

export const realShield: ShieldService = {
  async isActive() {
    if (!FAMILY_CONTROLS_ENABLED) return false;
    try {
      return !!DA.isShieldActive();
    } catch {
      return false;
    }
  },
  /**
   * Arme ou desarme le blocage.
   *
   * On ne bloque QUE la selection, et rien sans elle.
   *
   * Sans selection, ce code armait un blocage general : tout le telephone.
   * C'etait l'inverse de ce que l'app promet — on vient couper quatre
   * applications, pas se mettre en cage. Et l'interrupteur contredisait le
   * selecteur : on choisissait trois apps, on armait, tout sautait.
   *
   * Retourne faux quand il n'y a rien a bloquer, pour que l'ecran puisse
   * emmener choisir plutot que de se croire arme.
   */
  async setActive(active: boolean, selection?: string | null) {
    if (!FAMILY_CONTROLS_ENABLED) return false;
    try {
      if (!active) { DA.resetBlocks(); return true; }
      if (!selection) return false;
      // L'ecran que voit celui qui ouvre l'app bloquee, dans sa langue.
      await configureShield(dict.shield);
      DA.blockSelection({ activitySelectionToken: selection });
      return true;
    } catch {
      /* le blocage n'est pas critique pour le reste de l'app */
      return false;
    }
  },
};
