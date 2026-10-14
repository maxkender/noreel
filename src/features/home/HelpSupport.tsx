import { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import {
  Bell, ChevronDown, ChevronRight, CircleQuestionMark, Film, Heart, KeyRound, LogOut, Mail,
  Share, ShieldCheck, Sparkles, Trash, Turtle, UsersRound,
} from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { gutter, space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import { SUPPORT_EMAIL } from './Feedback';

type Icon = typeof Bell;
/** Les quatre premieres se voient d'emblee ; les autres attendent « voir plus ». */
const SHOWN = 4;

/**
 * Aide et support : les questions qu'on nous pose, les limites qu'on
 * connait, et une adresse pour nous ecrire. Une question s'ouvre sur place,
 * une seule a la fois : on lit une reponse, pas un mur de texte.
 */
export function HelpSupport() {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d } = useT();
  const router = useRouter();
  const [open, setOpen] = useState<number | null>(null);
  const [more, setMore] = useState(false);

  const items: [Icon, string, string][] = [
    [Sparkles, d.faq.q1, d.faq.a1],
    [ShieldCheck, d.faq.q2, d.faq.a2],
    [Turtle, d.faq.q3, d.faq.a3],
    [Trash, d.faq.q4, d.faq.a4],
    [UsersRound, d.faq.q5, d.faq.a5],
    [Film, d.faq.q6, d.faq.a6],
    [Share, d.faq.q7, d.faq.a7],
    [Bell, d.faq.q8, d.faq.a8],
    [KeyRound, d.faq.q9, d.faq.a9],
    [LogOut, d.faq.q10, d.faq.a10],
    [Heart, d.faq.q11, d.faq.a11],
  ];
  const visible = more ? items : items.slice(0, SHOWN);
  const limits = [d.faq.lim1, d.faq.lim2, d.faq.lim3, d.faq.lim4, d.faq.lim5];

  return (
    <View style={st.root}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View style={st.top}>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => { haptics.tap(); router.back(); }} hitSlop={12} accessibilityRole="button" style={st.done}>
            <Text variant="label" color={c.night}>OK</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
          <View style={st.head}>
            <View style={st.badge}>
              <CircleQuestionMark size={30} strokeWidth={2} color={c.night} />
            </View>
            <Text variant="displayM" style={st.center}>{d.faq.title}</Text>
            <Text variant="body" tone="secondary" style={st.center}>{d.faq.sub}</Text>
          </View>

          <Text variant="label" tone="tertiary" style={st.group}>{d.faq.section}</Text>
          <View style={{ gap: space.sm }}>
            {visible.map(([Ico, q, a], i) => {
              const on = open === i;
              return (
                <Pressable
                  key={q}
                  onPress={() => { haptics.tick(); setOpen(on ? null : i); }}
                  style={[st.card, on && st.cardOn]}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: on }}
                >
                  <View style={st.row}>
                    <Ico size={20} strokeWidth={2} color={on ? c.accent : withAlpha(c.mist, 0.55)} />
                    <Text variant="title" style={{ flex: 1 }}>{q}</Text>
                    {on
                      ? <ChevronDown size={18} color={withAlpha(c.mist, 0.4)} />
                      : <ChevronRight size={18} color={withAlpha(c.mist, 0.4)} />}
                  </View>
                  {on && (
                    <Animated.View entering={FadeIn.duration(200)}>
                      <Text variant="body" tone="secondary" style={st.answer}>{a}</Text>
                    </Animated.View>
                  )}
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => { haptics.tap(); setMore((m) => !m); if (more && open !== null && open >= SHOWN) setOpen(null); }}
              style={[st.card, st.moreCard]}
              accessibilityRole="button"
            >
              <View style={st.row}>
                <Text variant="body" color={c.accent} style={{ flex: 1 }}>{more ? d.faq.less : d.faq.more}</Text>
                <ChevronDown size={18} color={c.accent} style={more ? { transform: [{ rotate: '180deg' }] } : undefined} />
              </View>
            </Pressable>
          </View>

          <Text variant="label" tone="tertiary" style={st.group}>{d.faq.limTitle}</Text>
          <View style={[st.card, st.limits]}>
            <Text variant="body" tone="secondary">{d.faq.limIntro}</Text>
            {limits.map((l) => (
              <View key={l} style={st.bullet}>
                <Text variant="body" tone="secondary">•</Text>
                <Text variant="body" tone="secondary" style={{ flex: 1 }}>{l}</Text>
              </View>
            ))}
            <Text variant="body" tone="secondary" style={{ marginTop: space.sm }}>{d.faq.limPost}</Text>
            <Text variant="body" tone="secondary" style={{ marginTop: space.sm }}>{d.faq.limBeta}</Text>
          </View>

          <Text variant="label" tone="tertiary" style={st.group}>{d.faq.contact}</Text>
          <Pressable
            onPress={() => { haptics.tap(); void Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {}); }}
            style={st.card}
            accessibilityRole="link"
          >
            <View style={st.row}>
              <Mail size={20} strokeWidth={2} color={c.accent} />
              <View style={{ flex: 1 }}>
                <Text variant="title">{d.faq.email}</Text>
                <Text variant="body" color={c.accent}>{SUPPORT_EMAIL}</Text>
              </View>
              <ChevronRight size={18} color={withAlpha(c.mist, 0.4)} />
            </View>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.night },
  top: { flexDirection: 'row', paddingHorizontal: gutter, paddingVertical: space.sm },
  done: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: c.mist },
  content: { paddingHorizontal: gutter, paddingBottom: space.xxl * 2 },
  head: { alignItems: 'center', gap: space.xs, marginTop: space.sm, marginBottom: space.md },
  badge: {
    width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.accent, marginBottom: space.sm,
  },
  center: { textAlign: 'center' },
  group: { marginTop: space.xl, marginBottom: space.sm },
  card: {
    borderRadius: 20, borderWidth: 1, borderColor: c.glassEdge, backgroundColor: c.glassSolid,
    paddingHorizontal: space.lg, paddingVertical: space.lg,
  },
  cardOn: { borderColor: withAlpha(c.accent, 0.45), backgroundColor: withAlpha(c.accent, 0.08) },
  moreCard: { backgroundColor: withAlpha(c.accent, 0.08), borderColor: withAlpha(c.accent, 0.25) },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  answer: { marginTop: space.md, marginLeft: 20 + space.md },
  limits: { gap: 4 },
  bullet: { flexDirection: 'row', gap: space.sm, paddingLeft: space.xs },
});
