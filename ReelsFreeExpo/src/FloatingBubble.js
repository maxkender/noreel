import { useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, PanResponder, Pressable, StyleSheet, Text, View,
} from 'react-native';
import { T } from './theme';
import { Store, KEYS } from './storage';

const SIZE = 54;
const MARGIN = 12;
const DRAG_SLOP = 6;      // au-dela, c est un glissement, pas un tap

export default function FloatingBubble({ onPress }) {
  const { width, height } = Dimensions.get('window');
  const start = { x: width - SIZE - MARGIN, y: height * 0.62 };

  const pos = useRef(new Animated.ValueXY(start)).current;
  const origin = useRef(start);
  const moved = useRef(false);

  const [coach, setCoach] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await Store.get(KEYS.bubblePos);
      if (saved) {
        origin.current = saved;
        pos.setValue(saved);
      }
      const seen = await Store.get(KEYS.bubbleSeen, false);
      if (!seen) setCoach(true);
    })();
  }, [pos]);

  const dismissCoach = async () => {
    setCoach(false);
    await Store.set(KEYS.bubbleSeen, true);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > DRAG_SLOP || Math.abs(g.dy) > DRAG_SLOP,

      onPanResponderGrant: () => { moved.current = false; },

      onPanResponderMove: (_, g) => {
        if (Math.abs(g.dx) > DRAG_SLOP || Math.abs(g.dy) > DRAG_SLOP) moved.current = true;
        pos.setValue({
          x: origin.current.x + g.dx,
          y: origin.current.y + g.dy,
        });
      },

      onPanResponderRelease: (_, g) => {
        const x = origin.current.x + g.dx;
        const y = origin.current.y + g.dy;

        if (!moved.current) {
          onPress?.();
          return;
        }

        // Aimantation sur le bord le plus proche, comme une bulle de chat.
        const snapX = x + SIZE / 2 < width / 2 ? MARGIN : width - SIZE - MARGIN;
        const snapY = Math.min(Math.max(y, 60), height - SIZE - 90);
        const next = { x: snapX, y: snapY };

        origin.current = next;
        Animated.spring(pos, {
          toValue: next, useNativeDriver: false, friction: 7, tension: 70,
        }).start();
        Store.set(KEYS.bubblePos, next);
      },
    })
  ).current;

  return (
    <>
      {coach && (
        <Pressable style={styles.scrim} onPress={dismissCoach}>
          <View style={styles.coach}>
            <Text style={styles.coachTitle}>Ta bulle de navigation</Text>
            <Text style={styles.coachBody}>
              Touche-la pour ouvrir ton menu. Fais-la glisser où tu veux :
              elle s'accroche au bord le plus proche et reste là.
            </Text>
            <Text style={styles.coachCta}>Touche l'écran pour continuer</Text>
          </View>
        </Pressable>
      )}

      <Animated.View
        style={[styles.bubble, { transform: pos.getTranslateTransform() }]}
        {...pan.panHandlers}
      >
        <View style={styles.line} />
        <View style={[styles.line, { width: 14 }]} />
        <View style={styles.line} />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2,
    backgroundColor: T.accentDim, alignItems: 'center', justifyContent: 'center',
    gap: 4, borderWidth: 2, borderColor: '#FFFFFF33',
    shadowColor: '#000', shadowOpacity: 0.35,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  line: { width: 20, height: 2.5, borderRadius: 2, backgroundColor: '#FFF' },

  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000B8', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 28, zIndex: 10,
  },
  coach: { backgroundColor: T.card, borderRadius: 16, padding: 20, gap: 8 },
  coachTitle: { color: T.text, fontSize: 18, fontWeight: '700' },
  coachBody: { color: T.dim, fontSize: 14, lineHeight: 21 },
  coachCta: {
    color: T.accent, fontSize: 11, letterSpacing: 1.1,
    textTransform: 'uppercase', marginTop: 6,
  },
});
