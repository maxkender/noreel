import { useCallback } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Canvas, Path, Skia, Circle, Group, Blur } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { colors } from '@/theme/colors';
import { haptics } from '@/lib/haptics';

const MIN = 15, MAX = 720, STEP = 15;

/** Demi-cercle = les 16 h eveillees. La portion parcourue est froide. */
export function DayArcDial({
  minutes, onChange,
}: { minutes: number; onChange: (m: number) => void }) {
  const { width } = useWindowDimensions();
  const size = Math.min(width - 48, 320);
  const cx = size / 2, cy = size / 2, r = size / 2 - 22;

  const ratio = (minutes - MIN) / (MAX - MIN);
  const angle = Math.PI * (1 - ratio); // pi (gauche) -> 0 (droite)
  const kx = cx + r * Math.cos(angle);
  const ky = cy - r * Math.sin(angle);

  const arc = (from: number, to: number) => {
    const p = Skia.Path.Make();
    p.addArc({ x: cx - r, y: cy - r, width: r * 2, height: r * 2 }, from, to - from);
    return p;
  };

  const set = useCallback((m: number) => {
    const clamped = Math.min(MAX, Math.max(MIN, Math.round(m / STEP) * STEP));
    if (clamped !== minutes) {
      onChange(clamped);
      haptics.tick();
      if (clamped % 60 === 0) haptics.tap();
    }
  }, [minutes, onChange]);

  const fromPoint = (x: number, y: number) => {
    'worklet';
    const a = Math.atan2(cy - y, x - cx);           // -pi..pi
    const clamped = Math.min(Math.PI, Math.max(0, a));
    const rr = 1 - clamped / Math.PI;
    return MIN + rr * (MAX - MIN);
  };

  const pan = Gesture.Pan()
    .onBegin((e) => runOnJS(set)(fromPoint(e.x, e.y)))
    .onChange((e) => runOnJS(set)(fromPoint(e.x, e.y)));
  const tap = Gesture.Tap().onEnd((e) => runOnJS(set)(fromPoint(e.x, e.y)));

  return (
    <GestureDetector gesture={Gesture.Race(pan, tap)}>
      <View style={{ width: size, height: size / 2 + 30 }}>
        <Canvas style={StyleSheet.absoluteFill}>
          {/* reste de la journee : abricot tres doux */}
          <Path path={arc(180, 360)} style="stroke" strokeWidth={10} strokeCap="round"
                color={colors.mist} opacity={0.12} />
          {/* temps d'ecran : lumiere froide */}
          <Path path={arc(180, 180 + ratio * 180)} style="stroke" strokeWidth={10}
                strokeCap="round" color={colors.accent} />
          <Group>
            <Circle cx={kx} cy={ky} r={16} color={colors.accent} opacity={0.4}>
              <Blur blur={10} />
            </Circle>
            <Circle cx={kx} cy={ky} r={9} color={colors.mist} />
          </Group>
        </Canvas>
      </View>
    </GestureDetector>
  );
}

export const DIAL = { MIN, MAX, STEP };
