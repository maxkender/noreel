import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';
import { ShieldCheck } from 'lucide-react-native';
import { Corti } from '@/components/Corti';
import { haptics } from '@/lib/haptics';
import { withAlpha } from '@/theme/colors';
import { ForcedTheme, useColors, type Palette } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { MockFeed, REELS } from '@/components/MockFeed';

/*
 * Le plan de demonstration.
 *
 * Il sert a etre FILME : Rotato prend l'enregistrement d'ecran et le glisse
 * dans un telephone en trois dimensions. Donc pas de maquette de telephone
 * ici — elle se retrouverait dans un telephone, imbriquee. Le fil occupe
 * tout l'ecran, comme l'app le fait vraiment.
 *
 * On ne met ni bouton ni reglage a l'image : tout ce qui traine dans le
 * cadre se retrouve dans la video. La boucle tourne seule, et une tape la
 * relance pour permettre une seconde prise.
 */

// La boucle, en millisecondes depuis son debut.
const HOLD = 1900;      // le fil tel quel : le temps de reconnaitre Instagram
const CASCADE = 1500;   // les reels tombent (3 x 130 ms de decalage + 420)
const SHOW = 1500;      // le fil filtre, pose : c'est l'image qu'on retient
const PROBE = 2600;     // on cherche les reels : il n'y a plus de porte
const FADE = 260;       // le voile qui cache la remise a zero

/*
 * L'echelle du fil en plein ecran.
 *
 * Le fil est dessine pour 188 points de large — la largeur utile de la
 * maquette de telephone. Un telephone fait environ 390 points, d'ou ce
 * rapport. Il etait a 2,6 : tout y paraissait un quart trop grand, et la
 * demonstration ne ressemblait plus a l'app qu'elle montre.
 */
const SCALE = 390 / 188;

/** Ce que le fil montre, dans l'ordre. */
type Phase = 'raw' | 'filtered' | 'probe';

export default function Demo() {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('raw');
  const [hint, setHint] = useState(true);
  // Change a chaque relance : il remonte le fil pour que la cascade reparte
  // de zero au lieu de reprendre une animation deja terminee.
  const [run, setRun] = useState(0);
  const veil = useSharedValue(0);
  const sweep = useSharedValue(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const after = (ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  };

  /**
   * Un tour de boucle.
   *
   * La remise a zero passe sous un voile : sans lui, on verrait les reels
   * REPOUSSER, et une video qui montre les reels revenir raconte l'inverse
   * de ce qu'on vend.
   */
  const cycle = useCallback(() => {
    /*
      La boucle se rappelle par son NOM, pas par la variable qui la tient.
      Elle se relancait en refermant sur `cycle` depuis l'interieur de la
      declaration de `cycle` : ca tourne, mais le tour suivant part de la
      fonction figee au premier rendu — et si le memo se reconstruit, la
      boucle continue d'appeler l'ancienne, avec ses anciennes valeurs
      partagees. Une fonction nommee est visible dans son propre corps.
    */
    function loop() {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      veil.value = 0;
      sweep.value = 0;
      setPhase('raw');

      after(HOLD, () => {
        // Le trait descend une fois, a la vitesse de la cascade : c'est lui qui
        // designe ce qui disparait, sinon les cartes s'evanouissent sans cause.
        sweep.value = withTiming(1, { duration: CASCADE, easing: Easing.out(Easing.quad) });
        setPhase('filtered');
      });

        /*
        Le dernier temps : on va CHERCHER les reels, et il n'y a rien.

        Les voir tomber prouve qu'on les retire du fil. Ca ne dit pas qu'on ne
        peut plus y aller par la porte du bas — et c'est la premiere question
        que se pose quiconque regarde la video. Le fil se floute et s'eloigne,
        Corti prend sa place : il n'y a plus d'onglet a toucher.
      */
      after(HOLD + CASCADE + SHOW, () => { setPhase('probe'); haptics.stop(); });

      after(HOLD + CASCADE + SHOW + PROBE, () => {
        veil.value = withTiming(1, { duration: FADE, easing: Easing.in(Easing.quad) });
      });

      after(HOLD + CASCADE + SHOW + PROBE + FADE, () => {
        setPhase('raw');
        setRun((n) => n + 1);
        veil.value = withTiming(0, { duration: FADE, easing: Easing.out(Easing.quad) });
      });

      after(HOLD + CASCADE + SHOW + PROBE + FADE * 2 + 400, loop);
    }
    loop();
  }, [veil, sweep]);

  useEffect(() => {
    cycle();
    const h = setTimeout(() => setHint(false), 4200);
    return () => {
      clearTimeout(h);
      timers.current.forEach(clearTimeout);
    };
  }, [cycle]);

  /*
    Le recul du fil. Il suit la phase, pas une minuterie a lui : une seconde
    valeur animee en parallele finit toujours par se desynchroniser du reste.
  */
  const back = useSharedValue(0);
  useEffect(() => {
    back.value = withTiming(phase === 'probe' ? 1 : 0, {
      duration: 620, easing: Easing.inOut(Easing.cubic),
    });
  }, [phase, back]);
  const away = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - back.value * 0.12 }],
    opacity: 1 - back.value * 0.25,
  }));

  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));
  const sweepStyle = useAnimatedStyle(() => ({
    // Le trait traverse la hauteur d'un grand ecran et s'eteint en arrivant.
    transform: [{ translateY: sweep.value * 860 }],
    opacity: sweep.value > 0 && sweep.value < 0.96 ? 1 : 0,
  }));

  return (
    /* La demonstration est une image de marque : elle reste sombre, quel que
       soit le reglage de theme de la personne qui filme. */
    <ForcedTheme.Provider value="dark">
      {/* Une tape relance la prise ; un appui long sort. Aucune des deux ne
          laisse de bouton dans le cadre. */}
      <Pressable
        style={st.root}
        onPress={() => { setHint(false); cycle(); }}
        onLongPress={() => router.back()}
        delayLongPress={700}
      >
        <StatusBar style="light" hidden />

        {/*
          Le fil recule et se floute quand on cherche les reels.
          Un zoom arriere accompagne d'un flou dit « il n'y a plus rien a
          atteindre ici » sans une ligne de texte — et c'est la premiere
          question de quiconque regarde la video.
        */}
        <Animated.View style={[StyleSheet.absoluteFill, away]}>
          <MockFeed key={run} filtered={phase !== 'raw'} u={SCALE} drift />
        </Animated.View>

        {phase === 'probe' && (
          <>
            <Animated.View
              style={StyleSheet.absoluteFill}
              entering={FadeIn.duration(520)}
              pointerEvents="none"
            >
              <BlurView intensity={34} tint="dark" style={StyleSheet.absoluteFill} />
            </Animated.View>

            <Animated.View
              style={st.probe}
              entering={FadeIn.delay(360).duration(520)}
              pointerEvents="none"
            >
              <Corti level={3} size={148} />
              <View style={[st.pill, st.pillOn]}>
                <ShieldCheck size={13} strokeWidth={2.4} color={c.accent} />
                <Text variant="label" color={c.accent}>Aucun accès aux Reels</Text>
              </View>
            </Animated.View>
          </>
        )}

        {/* Le trait de balayage, au-dessus du fil. */}
        <Animated.View style={[st.sweep, sweepStyle]} pointerEvents="none">
          <LinearGradient
            colors={[withAlpha(c.accent, 0), c.accent, withAlpha(c.accent, 0)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <SafeAreaView style={st.safe} edges={['top', 'bottom']} pointerEvents="none">
          {/*
            Les deux libelles se croisent en opacite au lieu de changer de
            couleur : animer une couleur fait tomber cette app.
          */}
          <View style={st.pillWrap}>
            {phase === 'raw' ? (
              <Animated.View
                key="raw"
                entering={FadeIn.duration(220)}
                exiting={FadeOut.duration(220)}
                style={[st.pill, st.pillRaw]}
              >
                <Text variant="label" color={c.ember}>Instagram, tel quel</Text>
              </Animated.View>
            ) : (
              <Animated.View
                key="on"
                entering={FadeIn.delay(CASCADE - 300).duration(360)}
                exiting={FadeOut.duration(200)}
                style={[st.pill, st.pillOn]}
              >
                <ShieldCheck size={13} strokeWidth={2.4} color={c.accent} />
                <Text variant="label" color={c.accent}>
                  {REELS} reels bloqués
                </Text>
              </Animated.View>
            )}
          </View>

          <View style={{ flex: 1 }} />

          {hint && (
            <Animated.View exiting={FadeOut.duration(400)} style={st.hint}>
              <Text variant="label" tone="tertiary">
                Appuie pour relancer · appui long pour sortir
              </Text>
            </Animated.View>
          )}
        </SafeAreaView>

        {/* Le voile de raccord. */}
        <Animated.View
          style={[StyleSheet.absoluteFill, st.veil, veilStyle]}
          pointerEvents="none"
        />
      </Pressable>
    </ForcedTheme.Provider>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.night },
  safe: { flex: 1 },
  pillWrap: { alignItems: 'center', height: 30, marginTop: space.sm },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    position: 'absolute',
    paddingHorizontal: space.md, paddingVertical: 6, borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillRaw: {
    borderColor: withAlpha(c.ember, 0.45), backgroundColor: withAlpha(c.ember, 0.12),
  },
  pillOn: {
    borderColor: withAlpha(c.accent, 0.5), backgroundColor: withAlpha(c.accent, 0.12),
  },
  sweep: { position: 'absolute', left: 0, right: 0, top: 0, height: 2 },
  hint: { alignItems: 'center', paddingBottom: space.lg },
  probe: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', gap: space.lg,
  },
  veil: { backgroundColor: c.night },
});
