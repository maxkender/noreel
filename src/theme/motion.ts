import { Easing } from 'react-native-reanimated';

export const springs = {
  gentle: { damping: 20, stiffness: 120, mass: 1 },
  snappy: { damping: 18, stiffness: 280, mass: 0.8 },
  bouncy: { damping: 12, stiffness: 180, mass: 1 },
  heavy: { damping: 28, stiffness: 140, mass: 1.6 },
} as const;

export const durations = { tap: 120, fast: 220, base: 360, slow: 640, scene: 1200 } as const;

export const easings = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
} as const;

export const stagger = { letter: 40, word: 70, line: 120, item: 80 } as const;
