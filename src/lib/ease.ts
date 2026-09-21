/** Courbes utilisables directement dans les worklets (pas d'objet Easing côté UI). */
export const ease = {
  out: (x: number) => {
    'worklet';
    return 1 - Math.pow(1 - x, 4);
  },
  inOut: (x: number) => {
    'worklet';
    return x < 0.5 ? 8 * Math.pow(x, 4) : 1 - Math.pow(-2 * x + 2, 4) / 2;
  },
  in: (x: number) => {
    'worklet';
    return x * x * x;
  },
};

/** Interpolation linéaire bornée, worklet-safe. */
export function mix(a: number, b: number, t: number): number {
  'worklet';
  return a + (b - a) * Math.min(Math.max(t, 0), 1);
}
