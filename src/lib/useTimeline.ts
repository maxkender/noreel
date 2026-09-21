import { useCallback, useEffect } from 'react';
import { cancelAnimation, Easing, useSharedValue, withTiming } from 'react-native-reanimated';

/**
 * Une seule horloge par scène. Chaque élément dérive sa progression d'une fenêtre
 * de temps via `seg()`. Lisible comme une partition, scrubbable au playground,
 * annulable, et skippable d'un tap.
 */
export function useTimeline(
  totalMs: number,
  opts: { autoplay?: boolean; reduced?: boolean } = {}
) {
  const { autoplay = true, reduced = false } = opts;
  const t = useSharedValue(0);

  const play = useCallback(() => {
    cancelAnimation(t);
    if (reduced) {
      t.value = totalMs; // état final direct ; le conteneur fait un fondu
      return;
    }
    t.value = 0;
    t.value = withTiming(totalMs, { duration: totalMs, easing: Easing.linear });
  }, [t, totalMs, reduced]);

  const skip = useCallback(() => {
    cancelAnimation(t);
    t.value = withTiming(totalMs, { duration: 280 });
  }, [t, totalMs]);

  useEffect(() => {
    if (autoplay) play();
    return () => cancelAnimation(t);
  }, [autoplay, play, t]);

  return { t, play, skip, totalMs };
}

/** Progression locale 0..1 entre deux instants (ms). */
export function seg(t: number, start: number, end: number): number {
  'worklet';
  if (end <= start) return t >= end ? 1 : 0;
  return Math.min(Math.max((t - start) / (end - start), 0), 1);
}
