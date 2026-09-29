import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Check, X } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { radii, space } from '@/theme/spacing';
import { useColors } from '@/theme/useColors';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { Typewriter } from '@/components/type/Typewriter';
import { PhoneFrame } from '@/components/PhoneFrame';
import { MockDM } from '@/components/MockDM';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';

type P = { onNext: () => void };

/**
 * « Pourquoi UnSwipe marche. »
 *
 * Tout le monde a deja essaye un bloqueur, et tout le monde l'a desactive :
 * il coupe aussi ce qu'on ne voulait pas perdre — les messages, les amis —
 * et on le retire pour les retrouver. Les minuteurs, on les ignore. Il faut
 * le dire avant la demonstration, sinon on la regarde en se demandant ce
 * qu'on va perdre.
 *
 * Trois pastilles, une par idee, qui se posent l'une apres l'autre : deux
 * barrees pour ce qui echoue, une cochee pour ce qu'on fait a la place.
 * L'oeil lit la couleur avant le mot — c'est ce qui rend la page lisible
 * en une seconde, et c'est pour ca qu'elle n'a pas d'illustration.
 */
const GOOD = '#2E9E5B';
// Une pastille toutes les 600 a 800 ms, apres le titre : le rythme d'une
// liste qu'on enonce, pas d'un tableau qu'on affiche.
const DELAYS = [900, 1500, 2300] as const;

export function NotBlocker({ onNext }: P) {
  const st = useMemo(() => sheet(), []);
  const c = useColors();
  const { d } = useT();
  const rows = [
    { key: 'blockers', text: d.story.whyBlockers, ok: false },
    { key: 'timers', text: d.story.whyTimers, ok: false },
    { key: 'us', text: d.story.whyUs, ok: true },
  ];

  // Un tic par pastille, au moment ou elle se pose.
  useEffect(() => {
    const ids = DELAYS.map((ms) => setTimeout(() => haptics.tick(), ms + 200));
    return () => ids.forEach(clearTimeout);
  }, []);

  return (
    <Screen cta={d.ob.keepGoing} onPress={onNext} center hue="accent">
      <Typewriter text={d.story.whyTitle} variant="displayM" speed={36} style={st.center} />

      <View style={st.pills}>
        {rows.map((r, i) => {
          const tone = r.ok ? GOOD : c.danger;
          return (
            <Animated.View
              key={r.key}
              entering={FadeInDown.delay(DELAYS[i]).duration(520)}
              style={[st.pill, { backgroundColor: withAlpha(tone, r.ok ? 0.2 : 0.14) }]}
            >
              <View style={[st.badge, { backgroundColor: withAlpha(tone, 0.28) }]}>
                {r.ok
                  ? <Check size={16} strokeWidth={3} color={tone} />
                  : <X size={16} strokeWidth={3} color={tone} />}
              </View>
              <Text variant="body" style={{ flex: 1 }}>{r.text}</Text>
            </Animated.View>
          );
        })}
      </View>

    </Screen>
  );
}

/**
 * Les reels qu'on t'envoie, tu les regardes.
 *
 * C'est la premiere objection a « plus de reels », et la demonstration du
 * fil n'y repond pas. Ici on montre la conversation : le message arrive, le
 * reel avec, il se joue jusqu'au bout — puis une seule phrase : le suivant
 * n'existe pas. Le format n'est pas interdit ; l'enchainement l'est.
 */
export function DmReel({ onNext }: P) {
  const st = useMemo(() => sheet(), []);
  const { d } = useT();

  return (
    <Screen cta={d.ob.keepGoing} onPress={onNext} center hue="accent">
      <Typewriter text={d.story.dmTitle} variant="displayM" speed={36} style={st.center} />

      <View style={st.phone}>
        <PhoneFrame width={172}>
          <MockDM playing onDone={() => haptics.success()} />
        </PhoneFrame>
      </View>

    </Screen>
  );
}

const sheet = () => StyleSheet.create({
  center: { textAlign: 'center' },
  pills: { alignSelf: 'stretch', gap: space.md, marginTop: space.xl },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingVertical: 14, paddingHorizontal: 18, borderRadius: radii.pill,
  },
  badge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  phone: { alignItems: 'center', marginTop: space.lg },
});
