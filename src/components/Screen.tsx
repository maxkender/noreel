import { useContext, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors } from '@/theme/colors';
import { gutter, space } from '@/theme/spacing';
import { Button } from './Button';
import { Text } from './type/Text';
import { Glow, type Hue } from './Glow';
import { Stars } from './Stars';
import { ProgressContext } from './ProgressContext';

/**
 * Coquille unique. Le halo est au fond, le contenu defile, le bouton est
 * ancre hors du flux : rien ne peut se chevaucher ni sortir de l'ecran.
 */
export function Screen({
  children, cta, onPress, disabled, secondary, onSecondary, center = false,
  tapToContinue, hintDelay = 1800, hue = 'accent',
}: {
  children: ReactNode;
  /** Absent : aucun pied de page. L'ecran fournit alors sa propre action. */
  cta?: string;
  onPress?: () => void;
  disabled?: boolean;
  secondary?: string;
  onSecondary?: () => void;
  /** Vrai pour les ecrans-affirmation : titre seul, centre verticalement. */
  center?: boolean;
  /** Pas de bouton : tout l'ecran est tactile, avec une invite discrete. */
  tapToContinue?: boolean;
  /** Retard avant l'invite, en ms. Laisse le temps de lire.  */
  hintDelay?: number;
  /** Teinte du halo : elle change d'un ecran a l'autre. */
  hue?: Hue;
}) {
  const bar = useContext(ProgressContext);

  const Root: React.ElementType = tapToContinue ? Pressable : View;

  return (
    <Root style={styles.root} onPress={tapToContinue ? onPress : undefined}>
      <Glow hue={hue} />
      <Stars count={14} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {bar && <View style={styles.progress}>{bar}</View>}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, center && styles.centered]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>

        {/* Le contenu se dissout dans le noir avant d'atteindre le bouton :
            sans ce fondu, le pied de page coupait le texte d'un trait net. */}
        <LinearGradient
          colors={['transparent', colors.night]}
          style={styles.hem}
          pointerEvents="none"
        />

        {!cta ? (
          secondary && onSecondary ? (
            <View style={styles.footer}>
              <Button label={secondary} onPress={onSecondary} variant="ghost" />
            </View>
          ) : null
        ) : tapToContinue ? (
          // L'invite n'apparait qu'apres le texte : le silence fait le suspense.
          <Animated.View
            entering={FadeIn.delay(hintDelay).duration(900)}
            style={styles.hint}
          >
            <Text variant="label" tone="tertiary">{cta}</Text>
          </Animated.View>
        ) : (
          <View style={styles.footer}>
            <Button label={cta} onPress={onPress ?? (() => {})} disabled={disabled} />
            {secondary && onSecondary && (
              <Button label={secondary} onPress={onSecondary} variant="ghost" />
            )}
          </View>
        )}
      </SafeAreaView>
    </Root>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.night },
  safe: { flex: 1 },
  progress: { paddingHorizontal: gutter, paddingTop: space.sm },
  scroll: { flex: 1 },
  content: { paddingHorizontal: gutter, paddingTop: space.xl, paddingBottom: space.xl },
  centered: { flexGrow: 1, justifyContent: 'center' },
  footer: { paddingHorizontal: gutter, paddingTop: space.md, paddingBottom: space.xs },
  hem: { height: 36, marginTop: -36 },
  hint: { alignItems: 'center', paddingBottom: space.xl, paddingTop: space.md },
});
