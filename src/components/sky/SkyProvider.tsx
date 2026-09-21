import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import {
  Easing, useDerivedValue, useSharedValue, withTiming,
  type DerivedValue, type SharedValue,
} from 'react-native-reanimated';
import { skyPresets, type SkyPreset, type SkyPresetName } from '@/theme/sky-presets';
import { durations } from '@/theme/motion';

type Vec3 = [number, number, number];

/** L'état complet du ciel, sous forme plate : c'est ce qu'on interpole. */
export type SkyState = {
  zenith: Vec3; horizon: Vec3; sun: Vec3; glow: Vec3;
  sunrise: number; horizonY: number; glowAmt: number; energy: number;
};

function mixVec(a: Vec3, b: Vec3, t: number): Vec3 {
  'worklet';
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function mixState(a: SkyState, b: SkyState, t: number): SkyState {
  'worklet';
  const m = (x: number, y: number) => x + (y - x) * t;
  return {
    zenith: mixVec(a.zenith, b.zenith, t),
    horizon: mixVec(a.horizon, b.horizon, t),
    sun: mixVec(a.sun, b.sun, t),
    glow: mixVec(a.glow, b.glow, t),
    sunrise: m(a.sunrise, b.sunrise),
    horizonY: m(a.horizonY, b.horizonY),
    glowAmt: m(a.glowAmt, b.glowAmt),
    energy: m(a.energy, b.energy),
  };
}

const flat = (p: SkyPreset): SkyState => ({ ...p });

type SkyApi = {
  /** L'état courant, déjà mélangé. Lu par le shader. */
  state: DerivedValue<SkyState>;
  to: (preset: SkyPresetName, opts?: { duration?: number }) => void;
  /** Pilotage direct (écran 5 : la saisie assombrit le ciel en temps réel). */
  set: (partial: Partial<Pick<SkyState, 'sunrise' | 'horizonY' | 'glowAmt' | 'energy'>>) => void;
};

const SkyContext = createContext<SkyApi | null>(null);

export function SkyProvider({
  initial = 'welcome',
  children,
}: {
  initial?: SkyPresetName;
  children: ReactNode;
}) {
  const p0 = flat(skyPresets[initial]);

  // Une seule horloge scalaire entre deux états : Reanimated ne sait pas animer
  // un tableau, mais il anime très bien un `t` que l'on consomme dans un worklet.
  const from = useSharedValue<SkyState>(p0);
  const to_ = useSharedValue<SkyState>(p0);
  const t = useSharedValue(1);

  const state = useDerivedValue(() => mixState(from.value, to_.value, t.value));

  const goTo = useCallback(
    (name: SkyPresetName, opts?: { duration?: number }) => {
      from.value = state.value;             // on repart de ce qui est à l'écran
      to_.value = flat(skyPresets[name]);
      t.value = 0;
      t.value = withTiming(1, {
        duration: opts?.duration ?? durations.scene,
        easing: Easing.bezier(0.65, 0, 0.35, 1),
      });
    },
    [from, to_, t, state]
  );

  const set = useCallback(
    (partial: Parameters<SkyApi['set']>[0]) => {
      const cur = state.value;
      from.value = cur;
      to_.value = { ...cur, ...partial };
      t.value = 1;                          // immédiat : c'est du suivi de geste
    },
    [from, to_, t, state]
  );

  const api = useMemo<SkyApi>(() => ({ state, to: goTo, set }), [state, goTo, set]);
  return <SkyContext.Provider value={api}>{children}</SkyContext.Provider>;
}

export function useSky(): SkyApi {
  const ctx = useContext(SkyContext);
  if (!ctx) throw new Error('useSky doit être utilisé dans un <SkyProvider>');
  return ctx;
}

export type { SharedValue };
