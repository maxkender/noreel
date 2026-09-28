import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { Corti, type CortiLevel } from './Corti';

/*
 * Corti sur sa soucoupe.
 *
 * C'est la scene du studio, remontee couche par couche : les etoiles derriere,
 * le halo teinte par l'indice, l'anneau et ses particules en orbite, trois
 * eclats qui derivent, puis la soucoupe, Corti et le coeur — ces trois-la
 * flottant ENSEMBLE, parce qu'un personnage qui flotte au-dessus d'un socle
 * immobile se detache de lui.
 *
 * Rien ne s'arrete jamais, et c'est le point : sept mouvements, sept periodes
 * qui ne se divisent pas entre elles. Aucun instant ne ressemble au precedent,
 * et pourtant chaque couche boucle proprement sur elle-meme — pas de longue
 * rampe qui finirait par sauter.
 *
 * Corti lui-meme reste la version VECTORIELLE : elle seule sait cligner des
 * yeux, respirer depuis ses pieds et promener son regard. La soucoupe apporte
 * la scene, lui apporte la vie.
 */

const DOCK = {
  stars: require('@/assets/dock/dock-stars.png'),
  halo: require('@/assets/dock/dock-halo.png'),
  ring: require('@/assets/dock/dock-orbit-ring.png'),
  particles: require('@/assets/dock/dock-orbit-particles.png'),
  shard1: require('@/assets/dock/dock-shard-1.png'),
  shard2: require('@/assets/dock/dock-shard-2.png'),
  shard3: require('@/assets/dock/dock-shard-3.png'),
  dock: require('@/assets/dock/dock-dock.png'),
  core: require('@/assets/dock/dock-core.png'),
};

/** Le repere du studio : tout y est donne sur 400 points de cote. */
const VB = 400;

/** Les periodes, en secondes. Reprises telles quelles de la scene d'origine. */
const P = { stars: 3600, halo: 2400, orbit: 9000, s1: 5200, s2: 6100, s3: 5500, bob: 3400 };

const TWO_PI = Math.PI * 2;

/**
 * Une valeur qui va de zero a un et recommence, sans a-coup.
 *
 * Chaque couche a la sienne : une horloge unique et longue finirait par sauter
 * a sa remise a zero, et le saut se verrait sur les sept mouvements a la fois.
 */
function useCycle(ms: number, on: boolean) {
  const v = useSharedValue(0);
  useEffect(() => {
    if (!on) { v.value = 0; return; }
    v.value = 0;
    v.value = withRepeat(withTiming(1, { duration: ms, easing: Easing.linear }), -1, false);
  }, [ms, on, v]);
  return v;
}

export function CortiDock({
  level, size = 300, tint, style,
}: {
  level: CortiLevel;
  size?: number;
  /** La teinte du halo et du coeur : celle de l'indice de recuperation. */
  tint: string;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const on = !reduced;
  const k = size / VB;

  const stars = useCycle(P.stars, on);
  const halo = useCycle(P.halo, on);
  const orbit = useCycle(P.orbit, on);
  const s1 = useCycle(P.s1, on);
  const s2 = useCycle(P.s2, on);
  const s3 = useCycle(P.s3, on);
  const bob = useCycle(P.bob, on);

  const starsStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + 0.35 * Math.sin(stars.value * TWO_PI),
  }));
  // Le halo respire entre un peu plus de la moitie et le plein.
  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(halo.value * TWO_PI)),
  }));
  const coreStyle = haloStyle;
  /*
    Les particules tournent A PLAT : une rotation pleine les ferait passer
    devant Corti. Ecrasees a un tiers de leur hauteur et descendues sous lui,
    elles tournent autour du socle, en perspective.
  */
  const orbitStyle = useAnimatedStyle(() => ({
    opacity: 0.9,
    transform: [
      { translateY: 118 * k },
      { rotate: `${orbit.value * 360}deg` },
      { scaleY: 0.32 },
    ],
  }));
  const shard1 = useAnimatedStyle(() => {
    const p = Math.sin(s1.value * TWO_PI);
    return { transform: [{ translateY: -p * 9 * k }, { rotate: `${p * 4}deg` }] };
  });
  const shard2 = useAnimatedStyle(() => {
    const p = Math.sin(s2.value * TWO_PI);
    return { transform: [{ translateY: p * 7 * k }, { rotate: `${p * -5}deg` }] };
  });
  const shard3 = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.sin(s3.value * TWO_PI + 1) * 6 * k }],
  }));
  // La soucoupe, Corti et le coeur montent et descendent ensemble.
  const float = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.sin(bob.value * TWO_PI) * 7 * k }],
  }));

  const full = { width: size, height: size } as const;

  return (
    <View style={[full, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, starsStyle]}>
        <Image source={DOCK.stars} style={full} contentFit="contain" />
      </Animated.View>

      {/* Le halo prend la couleur de l'indice : c'est lui qui dit l'etat avant
          qu'on ait lu le moindre chiffre. */}
      <Animated.View style={[StyleSheet.absoluteFill, haloStyle]}>
        <Image source={DOCK.halo} style={full} contentFit="contain" tintColor={tint} />
      </Animated.View>

      <Image source={DOCK.ring} style={[StyleSheet.absoluteFill, full]} contentFit="contain" />
      <Animated.View style={[StyleSheet.absoluteFill, orbitStyle]}>
        <Image source={DOCK.particles} style={full} contentFit="contain" />
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, shard1]}>
        <Image source={DOCK.shard1} style={full} contentFit="contain" />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, shard2]}>
        <Image source={DOCK.shard2} style={full} contentFit="contain" />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, shard3]}>
        <Image source={DOCK.shard3} style={full} contentFit="contain" />
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, float]}>
        <Image source={DOCK.dock} style={full} contentFit="contain" />

        {/* Corti est pose sur le socle, pas centre dans le cadre : la scene
            d'origine le place a 214 sur 400, soit un peu au-dessus du milieu. */}
        <View
          style={{
            position: 'absolute',
            left: (200 - 136) * k,
            top: (214 - 136) * k,
            width: 272 * k,
            height: 272 * k,
          }}
        >
          {/* Anime : le socle flotte, lui respire, cligne et promene son
              regard. Fige ici, la scene bougerait tout entiere autour d'une
              statue. */}
          <Corti level={level} size={272 * k} />
        </View>

        <Animated.View style={[StyleSheet.absoluteFill, coreStyle]}>
          <Image source={DOCK.core} style={full} contentFit="contain" tintColor={tint} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}
