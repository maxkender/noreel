import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn, useAnimatedStyle, useSharedValue, withSpring, withTiming,
} from 'react-native-reanimated';
import {
  ChevronLeft, ChevronRight, House, RotateCw, Settings as Gear, X,
} from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { springs } from '@/theme/motion';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';

type P = { onNext: () => void };

const KEYS = [
  { icon: ChevronLeft, label: 'Reviens en arrière' },
  { icon: House, label: 'Retour en haut du site' },
  { icon: RotateCw, label: 'Recharge la page' },
  { icon: ChevronRight, label: 'Repars en avant' },
  { icon: Gear, label: 'Tes réglages, sans quitter la page' },
  { icon: X, label: 'Et tu sors, quand tu veux' },
] as const;

// Une touche toutes les 1,1 s, apres une seconde de pose.
const START = 1000;
const STEP = 1100;

/**
 * La barre de navigation, montree plutot que decrite.
 *
 * Elle flotte au-dessus des pages filtrees et c'est par elle que tout
 * passe — revenir, recharger, regler, sortir. Une phrase ne l'explique pas :
 * on ne sait pas de quoi elle a l'air, ni ou elle se trouve. Ici elle se
 * joue seule, touche apres touche, avant qu'on en ait besoin.
 */
export function BarDemo({ onNext }: P) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const [lit, setLit] = useState(-1);

  useEffect(() => {
    const ids = KEYS.map((_, i) =>
      setTimeout(() => { haptics.tick(); setLit(i); }, START + i * STEP)
    );
    return () => ids.forEach(clearTimeout);
  }, []);

  return (
    <Screen
      cta="Appuie pour continuer"
      onPress={onNext}
      tapToContinue
      hintDelay={START + KEYS.length * STEP + 400}
      hue="accent"
      center
    >
      <Text variant="displayM" style={st.title}>
        Tout passe par cette barre.
      </Text>

      <Animated.View entering={FadeIn.delay(400).duration(600)} style={st.barWrap}>
        <View style={st.bar}>
          {KEYS.slice(0, 5).map((k, i) => (
            <Dot key={k.label} icon={k.icon} on={lit === i} accent={i === 4} />
          ))}
        </View>

        {/* La sortie est a part, sous la barre : c'est ainsi dans l'app. */}
        <View style={st.quitWrap}>
          <Dot icon={X} on={lit === 5} big />
        </View>
      </Animated.View>

      {/*
        La legende ne DEPLACE rien : sa boite garde la meme hauteur du debut
        a la fin, et le texte y est pose par-dessus. Laissee dans le flux,
        chaque changement de phrase aurait fait sauter la barre elle-meme,
        puisque l'ecran est centre.
      */}
      <View style={st.legend}>
        {lit >= 0 && (
          <Animated.View
            key={lit}
            entering={FadeIn.duration(320)}
            style={st.legendLayer}
            pointerEvents="none"
          >
            <Text variant="lead" color={c.accent} numberOfLines={2} style={st.title}>
              {KEYS[lit].label}
            </Text>
          </Animated.View>
        )}
      </View>
    </Screen>
  );
}

/** Une touche de la barre. Elle s'allume seule ; personne ne la touche ici. */
function Dot({
  icon: Icon, on, accent, big,
}: { icon: typeof House; on: boolean; accent?: boolean; big?: boolean }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const v = useSharedValue(0);

  useEffect(() => { v.value = withSpring(on ? 1 : 0, springs.snappy); }, [on, v]);

  // Seulement de l'opacite et de l'echelle : animer une couleur fait tomber
  // l'app sur cette version de Reanimated.
  const halo = useAnimatedStyle(() => ({ opacity: v.value }));
  const lift = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + v.value * 0.16 }],
  }));
  const dim = useAnimatedStyle(() => ({
    opacity: withTiming(on ? 1 : 0.45, { duration: 220 }),
  }));

  return (
    <Animated.View style={[big ? st.quit : st.key, lift]}>
      <Animated.View style={[StyleSheet.absoluteFill, st.halo, halo]} />
      <Animated.View style={dim}>
        <Icon
          size={big ? 22 : 20}
          strokeWidth={2}
          color={accent ? c.accent : c.mist}
        />
      </Animated.View>
    </Animated.View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  title: { textAlign: 'center' },
  barWrap: { alignItems: 'center', marginTop: space.xxl },
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 30,
    backgroundColor: c.glassFill,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.glassEdge,
    shadowColor: c.shadowTint, shadowOpacity: c.shadowAlpha,
    shadowRadius: 18, shadowOffset: { width: 0, height: 8 },
  },
  key: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  halo: { borderRadius: 26, backgroundColor: withAlpha(c.accent, 0.18) },
  quitWrap: { marginTop: 10 },
  quit: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.glassFill,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.glassEdge,
  },
  legend: { height: 58, marginTop: space.xl },
  legendLayer: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
});
