import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { ShieldCheck, ShieldOff } from 'lucide-react-native';
import { space } from '@/theme/spacing';
import { useColors } from '@/theme/useColors';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { Typewriter } from '@/components/type/Typewriter';
import { GlassApps } from '@/components/GlassApps';
import { PhoneFrame } from '@/components/PhoneFrame';
import { MockDM } from '@/components/MockDM';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import { Emblem } from '../scenes/Emblem';

type P = { onNext: () => void };

/**
 * « Pas un bloqueur de plus. »
 *
 * Tout le monde a deja essaye un bloqueur, et tout le monde l'a desactive :
 * il coupe aussi ce qu'on ne voulait pas perdre — les messages, les amis —
 * et on le retire pour les retrouver. Il faut le dire avant la
 * demonstration, sinon on la regarde en se demandant ce qu'on va perdre.
 *
 * L'image le dit avant le texte : un bouclier barre, qui s'efface, et les
 * quatre applis qui restent la, allumees, sous un bouclier qui les garde.
 */
export function NotBlocker({ onNext }: P) {
  const st = useMemo(() => sheet(), []);
  const c = useColors();
  const { d } = useT();
  const [kept, setKept] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setKept(true); haptics.tick(); }, 1900);
    return () => clearTimeout(t);
  }, []);

  return (
    <Screen cta={d.ob.keepGoing} onPress={onNext} center hue="accent">
      <View style={st.stage}>
        {kept ? (
          <Animated.View entering={FadeIn.duration(600)} style={st.apps}>
            <GlassApps height={176} />
            <View style={st.mid} pointerEvents="none">
              <Emblem icon={ShieldCheck} tone={c.accent} size={72} />
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.duration(500)} exiting={FadeOut.duration(400)} style={st.mid}>
            <Emblem icon={ShieldOff} tone={c.danger} size={88} />
          </Animated.View>
        )}
      </View>

      <Typewriter text={d.story.notBlockerTitle} variant="displayM" speed={36} style={st.center} />
      <Animated.View entering={FadeIn.delay(1400).duration(520)}>
        <Text variant="lead" tone="secondary" style={[st.center, { marginTop: space.lg }]}>
          {d.story.notBlockerBody}
        </Text>
      </Animated.View>
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
  const c = useColors();
  const { d } = useT();
  const [played, setPlayed] = useState(false);

  return (
    <Screen cta={d.ob.keepGoing} onPress={onNext} center hue="accent">
      <Typewriter text={d.story.dmTitle} variant="displayM" speed={36} style={st.center} />

      <View style={st.phone}>
        <PhoneFrame width={172}>
          <MockDM playing onDone={() => { setPlayed(true); haptics.success(); }} />
        </PhoneFrame>
      </View>

      {/* Reserve de hauteur : la phrase arrive quand le reel est fini, et sans
          reserve le telephone remonterait a son arrivee. */}
      <View style={st.slot}>
        {played && (
          <Animated.View entering={FadeIn.duration(520)}>
            <Text variant="lead" color={c.accent} style={st.center}>{d.story.dmDone}</Text>
          </Animated.View>
        )}
        {!played && (
          <Text variant="body" tone="tertiary" style={st.center}>{d.story.dmBody}</Text>
        )}
      </View>
    </Screen>
  );
}

const sheet = () => StyleSheet.create({
  center: { textAlign: 'center' },
  stage: { height: 190, alignSelf: 'stretch', justifyContent: 'center', marginBottom: space.xl },
  apps: { alignSelf: 'stretch', justifyContent: 'center' },
  mid: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  phone: { alignItems: 'center', marginTop: space.lg },
  slot: { height: 64, justifyContent: 'center', marginTop: space.lg },
});
