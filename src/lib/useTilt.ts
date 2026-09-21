import { useEffect } from 'react';
import { AppState } from 'react-native';
import { DeviceMotion } from 'expo-sensors';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

export type Tilt = { x: SharedValue<number>; y: SharedValue<number> };

const SMOOTH = 0.12;   // lissage : le gyroscope brut est trop nerveux pour de la lumière
const CLAMP = 1;

/**
 * Inclinaison normalisée -1..1, lue par le shader du ciel et les panneaux de verre.
 * En pause quand l'app passe en arrière-plan : un capteur actif en tâche de fond
 * vide la batterie pour rien.
 */
export function useTilt(active = true): Tilt {
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  useEffect(() => {
    if (!active) return;
    let sub: { remove: () => void } | null = null;

    const start = () => {
      DeviceMotion.setUpdateInterval(50);
      sub = DeviceMotion.addListener(({ rotation }) => {
        if (!rotation) return;
        const nx = Math.max(-CLAMP, Math.min(CLAMP, rotation.gamma / 0.8));
        const ny = Math.max(-CLAMP, Math.min(CLAMP, rotation.beta / 0.8));
        x.value += (nx - x.value) * SMOOTH;
        y.value += (ny - y.value) * SMOOTH;
      });
    };
    const stop = () => {
      sub?.remove();
      sub = null;
    };

    start();
    const appSub = AppState.addEventListener('change', (s) =>
      s === 'active' ? (sub ? null : start()) : stop()
    );
    return () => {
      stop();
      appSub.remove();
    };
  }, [active, x, y]);

  return { x, y };
}
