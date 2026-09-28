import { useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { Typewriter } from '@/components/type/Typewriter';
import { CortiRig } from '@/components/CortiRig';
import type { CortiLevel } from '@/components/Corti';
import { useT } from '@/i18n';
import { Receptors } from '../scenes/Receptors';
import { HoldButton } from '../scenes/HoldButton';

type P = { onNext: () => void };

/*
 * Ce que le scroll fait au cerveau, une page par idee.
 *
 * Les quatre temps vivaient sur UN ecran qu'on tapait pour avancer, et la
 * barre de progression n'y bougeait pas : on tapait quatre fois au meme
 * endroit sans savoir combien il en restait, et le quatrieme tap sortait de
 * l'ecran par surprise. Chacun est une page maintenant. Corti les porte —
 * c'est de lui qu'on parle — et il s'eteint d'une page a l'autre.
 */
function SciencePage({
  level, title, body, cite, harm, children, onNext, big = true,
}: P & {
  level: CortiLevel;
  title: string;
  body?: string;
  cite?: string;
  /** 0 a 1 : le halo monte avec la gravite de la page. */
  harm: number;
  children?: ReactNode;
  big?: boolean;
}) {
  const st = useMemo(() => sheet(), []);
  const { d } = useT();
  return (
    <Screen cta={d.tapHint} onPress={onNext} tapToContinue hintDelay={2400} center hue="ember" hueLevel={harm}>
      <View style={st.face}>
        <CortiRig level={level} size={116} />
      </View>
      <Typewriter text={title} variant={big ? 'displayL' : 'displayM'} speed={42} style={st.center} />
      {body ? (
        <Animated.View entering={FadeIn.delay(900).duration(500)}>
          <Text variant="lead" tone="secondary" style={[st.center, { marginTop: space.lg }]}>{body}</Text>
        </Animated.View>
      ) : null}
      {children}
      {cite ? (
        <Animated.View entering={FadeIn.delay(1500).duration(500)}>
          <Text variant="label" tone="tertiary" style={[st.center, { marginTop: space.lg }]}>{cite}</Text>
        </Animated.View>
      ) : null}
    </Screen>
  );
}

export function Dopamine({ onNext }: P) {
  const { d } = useT();
  return <SciencePage level={2} harm={0.25} title={d.brain.step1} body={d.brain.step1b} onNext={onNext} />;
}

export function ReceptorsPage({ onNext }: P) {
  const { d } = useT();
  return (
    <SciencePage level={1} harm={0.5} title={d.brain.step2} body={d.brain.step2b} onNext={onNext}>
      <Receptors />
    </SciencePage>
  );
}

export function NothingLands({ onNext }: P) {
  const { d } = useT();
  return <SciencePage level={0} harm={0.75} title={d.brain.step3} body={d.brain.step3b} onNext={onNext} />;
}

export function LovePage({ onNext }: P) {
  const { d } = useT();
  return (
    <SciencePage
      level={0}
      harm={1}
      big={false}
      title={d.brain.love}
      body={d.brain.loveSub}
      cite={d.brain.loveCite}
      onNext={onNext}
    />
  );
}

/**
 * Le seul ecran qu'on ne passe pas d'un tap.
 *
 * Tout ce qui precede se traverse du doigt, comme un fil. Ici on demande la
 * premiere decision, et elle ne peut pas se prendre avec le geste qui vaut
 * zero : le bouton se maintient deux secondes, se remplit, et se vide si on
 * lache avant. Ce n'est pas une epreuve — c'est le temps de vouloir.
 */
export function Reclaim({ onNext }: P) {
  const st = useMemo(() => sheet(), []);
  const { d } = useT();
  return (
    <Screen
      center
      hue="accent"
      note={<HoldButton label={d.reclaim.hold} holdingLabel={d.reclaim.holding} onComplete={onNext} />}
    >
      <View style={st.face}>
        <CortiRig level={1} size={150} />
      </View>
      <Typewriter text={d.reclaim.title} variant="displayL" speed={42} style={st.center} />
      <Animated.View entering={FadeIn.delay(1100).duration(500)}>
        <Text variant="lead" tone="secondary" style={[st.center, { marginTop: space.lg }]}>{d.reclaim.body}</Text>
      </Animated.View>
    </Screen>
  );
}

const sheet = () => StyleSheet.create({
  center: { textAlign: 'center' },
  face: { alignItems: 'center', marginBottom: space.lg },
});
