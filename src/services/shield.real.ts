import { Platform } from 'react-native';
import * as DA from 'react-native-device-activity';
import type { ShieldService } from './types';

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
   * S'il y a une selection, c'est ELLE qu'on bloque. Sans selection, on
   * bloquait tout — l'interrupteur et le selecteur se contredisaient donc :
   * choisir trois apps puis armer les bloquait toutes.
   */
  async setActive(active: boolean, selection?: string | null) {
    if (!FAMILY_CONTROLS_ENABLED) return;
    try {
      if (!active) { DA.resetBlocks(); return; }
      if (selection) DA.blockSelection({ activitySelectionToken: selection });
      else DA.enableBlockAllMode();
    } catch {
      /* le blocage n'est pas critique pour le reste de l'app */
    }
  },
};
