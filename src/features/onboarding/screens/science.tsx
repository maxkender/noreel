import { useMemo, type ComponentType, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { BellRing, CloudOff, FlaskConical, HeartCrack, TrendingDown, Zap } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { radii, space } from '@/theme/spacing';
import { useColors } from '@/theme/useColors';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { Typewriter, typeDuration } from '@/components/type/Typewriter';
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
  icon, tone, kicker, title, body, cite, harm, children, onNext, big = true,
}: P & {
  icon: ComponentType<IconProps>;
  tone?: string;
  /** « Effet 2 sur 4 » : le fil qui relie les quatre pages a l'annonce. */
  kicker?: string;
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
  // On ne peut pas avancer avant d'avoir VU : le titre qui s'ecrit, la
  // phrase qui arrive apres lui, l'image qui se pose. Le tap ne compte
  // qu'ensuite, et l'invite n'apparait qu'a ce moment-la.
  // Des que le titre a fini de s'ecrire — pas plus tard : attendre l'image
  // en plus faisait trop long.
  const ready = typeDuration(title, 42, 0) + 150;
  return (
    <Screen cta={d.tapHint} onPress={onNext} tapToContinue hintDelay={ready} readyAfter={ready} center hue="ember" hueLevel={harm}>
      <Animated.View entering={FadeInDown.duration(360)} style={{ alignItems: 'center', marginBottom: space.lg }}>
        <Emblem icon={icon} tone={tone ?? c.ember} size={64} />
      </Animated.View>

      {kicker ? (
        <Animated.View entering={FadeIn.duration(400)}>
          <Text variant="label" color={c.ember} style={[st.center, { marginBottom: space.sm }]}>{kicker}</Text>
        </Animated.View>
      ) : null}

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

/**
 * « Tu n'es pas accro. » — la page qui enleve la faute avant d'expliquer.
 *
 * Tout ce qui suit dit ce que le scroll fait au cerveau, et sans ce
 * preambule ca se lit comme un reproche. Puis ce qu'UnSwipe rend, sans
 * rien supprimer : les trois bulles sont ce qu'on GARDE — le coeur, le
 * message, la photo a publier.
 */
export function Exploited({ onNext }: P) {
  const st = useMemo(() => sheet(), []);
  const c = useColors();
  const { d } = useT();
  const chips = [d.brain.hookChip1, d.brain.hookChip2, d.brain.hookChip3];
  return (
    <SciencePage icon={BellRing} harm={0.15} title={d.brain.hookTitle} body={d.brain.hookBody} onNext={onNext} big={false}>
      <View style={st.chips}>
        {chips.map((label, i) => (
          <Animated.View
            key={label}
            entering={FadeInDown.delay(1200 + i * 350).duration(420)}
            style={[st.chip, { backgroundColor: withAlpha(c.mist, 0.08), borderColor: withAlpha(c.mist, 0.14) }]}
          >
            <View style={[st.chipDot, { backgroundColor: c.accent }]} />
            <Text variant="label">{label}</Text>
          </Animated.View>
        ))}
      </View>
    </SciencePage>
  );
}

/**
 * L'annonce, avant les quatre effets.
 *
 * « Selon les scientifiques » pose l'autorite une fois, et les quatre pages
 * qui suivent n'ont plus a la reclamer chacune : elles se numerotent, et le
 * halo monte d'une page a l'autre. Sans cette annonce, la dose de dopamine
 * arrivait de nulle part, juste apres « tu n'es pas accro ».
 */
export function ScienceIntro({ onNext }: P) {
  const { d } = useT();
  const c = useColors();
  return (
    <SciencePage
     
     
      icon={FlaskConical}
      tone={c.accent}
      harm={0.05}
      big={false}
      title={d.brain.sciTitle}
      onNext={onNext}
    />
  );
}

export function Dopamine({ onNext }: P) {
  const { d, t } = useT();
  return (
    <SciencePage icon={Zap} harm={0.25} kicker={t(d.brain.effect, { n: 1 })} title={d.brain.step1} body={d.brain.step1b} onNext={onNext}>
      <Spikes />
    </SciencePage>
  );
}

export function ReceptorsPage({ onNext }: P) {
  const { d, t } = useT();
  return (
    <SciencePage icon={TrendingDown} harm={0.5} kicker={t(d.brain.effect, { n: 2 })} title={d.brain.step2} body={d.brain.step2b} onNext={onNext}>
      <Receptors />
    </SciencePage>
  );
}

export function NothingLands({ onNext }: P) {
  const { d, t } = useT();
  return (
    <SciencePage icon={CloudOff} harm={0.75} kicker={t(d.brain.effect, { n: 3 })} title={d.brain.step3} body={d.brain.step3b} onNext={onNext}>
      <Dulled />
    </SciencePage>
  );
}

export function LovePage({ onNext }: P) {
  const { d, t } = useT();
  const c = useColors();
  return (
    <SciencePage
     
      icon={HeartCrack}
      tone={c.danger}
      harm={1}
      big={false}
      kicker={t(d.brain.effect, { n: 4 })}
      title={d.brain.love}
      body={d.brain.loveSub}
      cite={d.brain.loveCite}
      onNext={onNext}
    />
  );
}

const sheet = () => StyleSheet.create({
  chips: { alignSelf: 'stretch', alignItems: 'center', gap: space.sm, marginTop: space.xl },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: radii.pill, borderWidth: 1,
  },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  center: { textAlign: 'center' },
});
