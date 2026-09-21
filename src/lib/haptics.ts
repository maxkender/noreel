import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Point d'entrée unique (§4.6). Throttle de 35 ms : sans lui, une rampe de `tick()`
 * sur un cadran sature le moteur et se transforme en bourdonnement.
 */
let enabled = true;
let last = 0;
let tickParity = 0;

export const setHapticsEnabled = (v: boolean) => {
  enabled = v;
};

function gate(): boolean {
  if (!enabled) return false;
  const now = Date.now();
  if (now - last < 35) return false;
  last = now;
  return true;
}

export const haptics = {
  tick() {
    // Android : un tick sur deux, le moteur y est plus grossier (§4.6).
    if (Platform.OS === 'android' && tickParity++ % 2 === 1) return;
    if (gate()) void Haptics.selectionAsync();
  },
  tap() {
    if (gate()) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },
  press() {
    if (gate()) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },
  stop() {
    if (gate()) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  },
  success() {
    if (gate()) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
  /** Deux battements à 600 ms d'écart, chacun medium puis light à +110 ms. */
  heartbeat() {
    if (!enabled) return;
    const beat = () => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setTimeout(() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 110);
    };
    beat();
    setTimeout(beat, 600);
  },
};
