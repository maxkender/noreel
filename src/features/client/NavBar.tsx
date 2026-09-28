import { useEffect, useState, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn, FadeOut, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming,
} from 'react-native-reanimated';
import {
  ChevronLeft, ChevronRight, House, RotateCw, Settings as Gear, UsersRound, X,
} from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { springs } from '@/theme/motion';
import { haptics } from '@/lib/haptics';
import { Text } from '@/components/type/Text';

const SIZE = 58;
const MARGIN = 14;

/*
 * « Accueil » veut dire l'accueil d'UNSWIPE, pas celui du site.
 *
 * La maison ramenait a la page d'accueil d'Instagram, et la croix quittait
 * Instagram. Les deux disaient donc le contraire de ce qu'on attend : dans
 * une barre qui appartient a UnSwipe, la maison est celle d'UnSwipe, et une
 * croix ferme ce qu'elle surmonte — la barre.
 */
export type NavAction = 'back' | 'reload' | 'forward' | 'account' | 'settings' | 'exit';

/**
 * La barre de navigation, et la poignee qui l'ouvre.
 *
 * Elle vit PAR-DESSUS la WebView, hors de son flux : la page ne peut pas
 * lui voler les touches. Glissement et appui sont deux gestes distincts —
 * marquer « deplace » au premier pixel empechait tout appui.
 */
export function NavBar({
  onAction,
}: { onAction: (a: NavAction) => void }) {
  const c = useColors();
  const styles = useMemo(() => sheet(c), [c]);
  const { width, height } = useWindowDimensions();
  const x = useSharedValue(width - SIZE - MARGIN);
  const y = useSharedValue(height * 0.56);
  const press = useSharedValue(0);
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setHint(false), 5000);
    return () => clearTimeout(id);
  }, []);

  const toggle = () => { haptics.press(); setHint(false); setOpen((v) => !v); };

  const tap = Gesture.Tap()
    .maxDuration(900)
    .onBegin(() => { press.value = withTiming(1, { duration: 90 }); })
    .onFinalize(() => { press.value = withSpring(0, springs.snappy); })
    .onEnd(() => { runOnJS(toggle)(); });

  // 10 pt avant d'etre un glissement : en dessous, c'est un appui.
  const pan = Gesture.Pan()
    .minDistance(10)
    .onChange((e) => { x.value += e.changeX; y.value += e.changeY; })
    .onEnd(() => {
      const snapX = x.value + SIZE / 2 < width / 2 ? MARGIN : width - SIZE - MARGIN;
      x.value = withSpring(snapX, springs.snappy);
      y.value = withSpring(Math.min(Math.max(y.value, 90), height - SIZE - 80), springs.snappy);
    });

  const handle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: 1 - press.value * 0.08 },
    ],
  }));

  const act = (a: NavAction) => {
    haptics.tap();
    if (a === 'exit') setOpen(false);
    onAction(a);
  };

  return (
    <>
      {hint && !open && (
        <Animated.View style={styles.hint} pointerEvents="none">
          <Text variant="label" tone="secondary">Touche ici pour ta barre</Text>
        </Animated.View>
      )}

      {open && (
        <Animated.View
          entering={FadeIn.duration(220)}
          exiting={FadeOut.duration(160)}
          style={styles.barWrap}
        >
          <View style={styles.bar}>
            <Key icon={ChevronLeft} label="Retour" onPress={() => act('back')} />
            <Key icon={House} label="Accueil UnSwipe" onPress={() => act('exit')} />
            <Key icon={RotateCw} label="Recharger" onPress={() => act('reload')} />
            <Key icon={ChevronRight} label="Suivant" onPress={() => act('forward')} />
            {/*
              Changer de compte en un geste.
              Instagram tient lui-meme plusieurs sessions : sa page de
              connexion liste les comptes deja enregistres et bascule sans
              deconnecter le premier. On y mene donc par son ADRESSE, comme
              partout ailleurs ici — un selecteur reconnu a sa forme ne
              survivrait pas au prochain remaniement, une adresse si.
            */}
            <Key icon={UsersRound} label="Changer de compte" onPress={() => act('account')} />
            <Key icon={Gear} label="Réglages" onPress={() => act('settings')} colour={c.accent} />
          </View>

          {/* La croix ferme la barre, elle ne quitte pas le site : c'est la
              maison qui ramene a UnSwipe. */}
          <Animated.View entering={FadeIn.delay(80).duration(220)} style={styles.quitWrap}>
            <Key
              icon={X}
              label="Fermer"
              onPress={() => { haptics.tap(); setOpen(false); }}
              big
            />
          </Animated.View>
        </Animated.View>
      )}

      <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
        <Animated.View
          style={[styles.handle, handle]}
          accessibilityRole="button"
          accessibilityLabel={open ? 'Fermer la navigation' : 'Ouvrir la navigation'}
        >
          <View style={styles.grip}>
            <View style={styles.line} />
            <View style={styles.line} />
            <View style={styles.line} />
          </View>
        </Animated.View>
      </GestureDetector>
    </>
  );
}

function Key({
  icon: Icon, label, onPress, colour, big,
}: {
  icon: typeof House;
  label: string;
  onPress: () => void;
  colour?: string;
  big?: boolean;
}) {
  const scale = useSharedValue(1);
  const c = useColors();
  const styles = useMemo(() => sheet(c), [c]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const tap = Gesture.Tap()
    .onBegin(() => { scale.value = withTiming(0.88, { duration: 80 }); })
    .onFinalize(() => { scale.value = withSpring(1, springs.snappy); })
    .onEnd(() => { runOnJS(onPress)(); });

  return (
    <GestureDetector gesture={tap}>
      <Animated.View
        style={[big ? styles.quit : styles.key, anim]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Icon size={big ? 22 : 20} strokeWidth={2} color={colour ?? c.mist} />
      </Animated.View>
    </GestureDetector>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  barWrap: { position: 'absolute', left: 0, right: 0, bottom: 118, alignItems: 'center', zIndex: 99 },
  // Opaque, pas floue. Le flou n'a de sens que devant un fond qu'on
  // controle ; ici la page est blanche, grise ou noire selon le site, et un
  // voile sombre translucide y donnait une bouillie differente a chaque
  // fois. Une barre pleine se lit partout, toujours pareil.
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 30, overflow: 'hidden',
    backgroundColor: c.night,
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(c.mist, 0.28),
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  barTint: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: withAlpha(c.night, 0.55),
  },
  key: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  quitWrap: { marginTop: 10 },
  quit: {
    width: 52, height: 52, borderRadius: 26, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', backgroundColor: c.night,
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(c.mist, 0.3),
  },
  handle: {
    position: 'absolute', top: 0, left: 0,
    width: SIZE, height: SIZE, borderRadius: SIZE / 2, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', backgroundColor: c.night,
    borderWidth: 1, borderColor: withAlpha(c.mist, 0.45),
    shadowColor: '#000', shadowOpacity: 0.55, shadowRadius: 16,
    shadowOffset: { width: 0, height: 5 }, elevation: 16,
    zIndex: 100,
  },
  grip: { gap: 4 },
  line: { width: 18, height: 2, borderRadius: 1, backgroundColor: c.mist },
  hint: {
    position: 'absolute', bottom: 40, alignSelf: 'center',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: withAlpha(c.night, 0.88),
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.lineStrong,
    zIndex: 99,
  },
});
