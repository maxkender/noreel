import { useEffect, useState } from 'react';
import { AppState, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Canvas, Fill, Shader, Skia, useClock } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import { colors } from '@/theme/colors';
import { useTilt } from '@/lib/useTilt';
import { useSky } from './SkyProvider';
import { SKY_SKSL } from './sky.sksl';

// Compilé une seule fois au niveau module (§5.3) : recompiler par frame
// coûterait bien plus cher que tout le reste du rendu.
const skyEffect = Skia.RuntimeEffect.Make(SKY_SKSL);
if (!skyEffect && __DEV__) {
  console.error('SkyBackground : le shader SkSL ne compile pas');
}

export function SkyBackground() {
  const { width, height } = useWindowDimensions();
  const clock = useClock();
  const { state } = useSky();
  const [active, setActive] = useState(true);
  const tilt = useTilt(active);

  // Horloge et capteur en pause hors premier plan (§5.3, §11).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setActive(s === 'active'));
    return () => sub.remove();
  }, []);

  const uniforms = useDerivedValue(() => {
    const s = state.value;
    return {
      u_res: [width, height],
      u_time: clock.value / 1000,
      u_zenith: s.zenith,
      u_horizon: s.horizon,
      u_sun: s.sun,
      u_glow: s.glow,
      u_sunrise: s.sunrise,
      u_horizonY: s.horizonY,
      u_glowAmt: s.glowAmt,
      u_energy: s.energy,
      u_tilt: [tilt.x.value, tilt.y.value],
    };
  });

  // Repli : un fond nuit vaut mieux qu'un écran blanc si le shader échoue.
  if (!skyEffect) {
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.night }]} />;
  }

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Fill>
        <Shader source={skyEffect} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
}
