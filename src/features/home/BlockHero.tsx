import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ArrowRight, Check, Lock, LockOpen } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { APPS, LOGOS } from './AppSlider';

const MARK = require('@/assets/brand/mark.png');

/**
 * CE QUE FAIT LE BLOCAGE, EN UNE IMAGE.
 *
 * Les apps d'origine a gauche, UnSwipe a droite, et entre les deux une
 * fleche avec un cadenas : ferme quand le blocage tourne (on atterrit dans
 * UnSwipe), ouvert sinon (les apps s'ouvrent comme avant). La phrase dessous
 * dit la meme chose en mots.
 */
export function BlockHero({ on, title, line }: { on: boolean; title: string; line: string }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const tone = on ? c.accent : c.ember;
  return (
    <View style={[st.card, { borderColor: withAlpha(tone, 0.35) }]}>
      <View style={st.flow}>
        <View style={st.stack}>
          {APPS.map((a, i) => (
            <Animated.View
              key={a.id}
              entering={FadeIn.delay(60 * i).duration(260)}
              style={[st.mini, { left: i * 18, zIndex: 10 - i, opacity: on ? 0.55 : 1 }]}
            >
              <Image source={LOGOS[a.id]} style={{ width: 44, height: 44 }} contentFit="contain" />
            </Animated.View>
          ))}
        </View>
        <View style={st.middle}>
          <View style={[st.lock, { backgroundColor: withAlpha(tone, 0.16), borderColor: withAlpha(tone, 0.5) }]}>
            {on ? <Lock size={16} strokeWidth={2.6} color={tone} /> : <LockOpen size={16} strokeWidth={2.4} color={tone} />}
          </View>
          <ArrowRight size={18} strokeWidth={2.2} color={withAlpha(c.mist, on ? 0.7 : 0.25)} />
        </View>
        <View style={[st.unswipe, on && { borderColor: withAlpha(c.accent, 0.6) }]}>
          <Image source={MARK} style={{ width: 30, height: 30, opacity: on ? 1 : 0.45 }} contentFit="contain" />
        </View>
      </View>
      <Text variant="title" style={st.center}>{title}</Text>
      <Text variant="body" tone="secondary" style={st.center}>{line}</Text>
    </View>
  );
}

/** Une etape de la mise en place : faite (coche), en cours (numero allume) ou a venir. */
export function BlockStep({ n, label, done, current }: { n: number; label: string; done: boolean; current: boolean }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  return (
    <View style={st.step}>
      <View style={[st.dot, done && { backgroundColor: '#34D399', borderColor: '#34D399' }, current && !done && { borderColor: c.mist }]}>
        {done
          ? <Check size={14} strokeWidth={3} color="#04120B" />
          : <Text variant="label" color={current ? c.mist : withAlpha(c.mist, 0.4)}>{String(n)}</Text>}
      </View>
      <Text variant="body" tone={done ? 'secondary' : current ? undefined : 'tertiary'} style={[{ flex: 1 }, done && st.doneText]}>
        {label}
      </Text>
    </View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  card: {
    marginTop: space.lg, padding: space.lg, gap: space.sm, alignItems: 'center',
    borderRadius: 26, borderWidth: 1, backgroundColor: c.glassSolid,
  },
  flow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.md, marginBottom: space.sm },
  stack: { width: 44 + 3 * 18, height: 44 },
  mini: { position: 'absolute', top: 0 },
  middle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lock: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  unswipe: {
    width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#000', borderWidth: 1, borderColor: c.glassEdge,
  },
  center: { textAlign: 'center' },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 6 },
  dot: {
    width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: withAlpha(c.mist, 0.2),
  },
  doneText: { textDecorationLine: 'line-through' },
});
