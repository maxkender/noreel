import { useMemo, type ComponentType, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { CloudOff, HeartCrack, TrendingDown, Zap } from 'lucide-react-native';
import { space } from '@/theme/spacing';
import { useColors } from '@/theme/useColors';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { Typewriter } from '@/components/type/Typewriter';
import { CortiRig, type CortiExpression } from '@/components/CortiRig';
import type { CortiLevel } from '@/components/Corti';
import { useT } from '@/i18n';
import { Receptors } from '../scenes/Receptors';
import { Spikes } from '../scenes/Spikes';
import { Dulled } from '../scenes/Dulled';
import { Emblem } from '../scenes/Emblem';

type P = { onNext: () => void };
type IconProps = { size?: number; color?: string; strokeWidth?: number };

/*
 * Ce que le scroll fait au cerveau, une page par idee — et chacune a une
 * IMAGE.
 *
 * Les quatre temps n'avaient qu'un titre, une phrase et Corti immobile : on
 * lisait la meme page quatre fois avec un texte different. Chacune porte
 * maintenant ce qu'elle dit. La dose : des pics qui ne s'arretent pas. Les
 * recepteurs : la courbe qui descend. Plus rien ne fait d'effet : les
 * plaisirs qui se grisent un a un. L'amour : un coeur fele. Et Corti change
 * de figure d'une page a l'autre — surpris, puis somnolent, puis a plat —
 * parce que c'est de lui qu'on parle.
 *
 * Les elements arrivent dans l'ordre ou on les lit : l'embleme, le titre qui
 * s'ecrit, la phrase, puis l'image. Tout d'un coup, l'oeil ne sait pas ou se
 * poser.
 */
function SciencePage({
  level, expression, icon, tone, title, body, cite, harm, children, onNext, big = true,
}: P & {
  level: CortiLevel;
  expression?: CortiExpression;
  icon: ComponentType<IconProps>;
  tone?: string;
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
  const c = useColors();
  return (
    <Screen cta={d.tapHint} onPress={onNext} tapToContinue hintDelay={2400} center hue="ember" hueLevel={harm}>
      <Animated.View entering={FadeInDown.duration(520)} style={st.face}>
        <CortiRig level={level} size={116} expression={expression ?? 'auto'} />
        {/* L'embleme se pose sur son epaule : un signe a cote de lui, pas un
            second sujet a regarder. */}
        <Emblem icon={icon} tone={tone ?? c.ember} size={46} style={st.badge} />
      </Animated.View>

      <Typewriter text={title} variant={big ? 'displayL' : 'displayM'} speed={42} style={st.center} />

      {body ? (
        <Animated.View entering={FadeInUp.delay(900).duration(520)}>
          <Text variant="lead" tone="secondary" style={[st.center, { marginTop: space.lg }]}>{body}</Text>
        </Animated.View>
      ) : null}

      {children ? (
        <Animated.View entering={FadeIn.delay(600).duration(600)}>{children}</Animated.View>
      ) : null}

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
  return (
    <SciencePage level={2} expression="surpris" icon={Zap} harm={0.25} title={d.brain.step1} body={d.brain.step1b} onNext={onNext}>
      <Spikes />
    </SciencePage>
  );
}

export function ReceptorsPage({ onNext }: P) {
  const { d } = useT();
  return (
    <SciencePage level={1} expression="somnolent" icon={TrendingDown} harm={0.5} title={d.brain.step2} body={d.brain.step2b} onNext={onNext}>
      <Receptors />
    </SciencePage>
  );
}

export function NothingLands({ onNext }: P) {
  const { d } = useT();
  return (
    <SciencePage level={0} icon={CloudOff} harm={0.75} title={d.brain.step3} body={d.brain.step3b} onNext={onNext}>
      <Dulled />
    </SciencePage>
  );
}

export function LovePage({ onNext }: P) {
  const { d } = useT();
  const c = useColors();
  return (
    <SciencePage
      level={0}
      icon={HeartCrack}
      tone={c.danger}
      harm={1}
      big={false}
      title={d.brain.love}
      body={d.brain.loveSub}
      cite={d.brain.loveCite}
      onNext={onNext}
    />
  );
}

const sheet = () => StyleSheet.create({
  center: { textAlign: 'center' },
  face: { alignSelf: 'center', marginBottom: space.lg },
  badge: { position: 'absolute', right: -14, bottom: -4 },
});
