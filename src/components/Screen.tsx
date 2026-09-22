import { useContext, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { gutter, space } from '@/theme/spacing';
import { Button } from './Button';
import { Text } from './type/Text';
import { Glow } from './Glow';
import { ProgressContext } from './ProgressContext';

/**
 * Coquille unique. Le halo est au fond, le contenu defile, le bouton est
 * ancre hors du flux : rien ne peut se chevaucher ni sortir de l'ecran.
 */
export function Screen({
  children, cta, onPress, disabled, secondary, onSecondary, center = false, tapToContinue,
}: {
  children: ReactNode;
  cta: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: string;
  onSecondary?: () => void;
  /** Vrai pour les ecrans-affirmation : titre seul, centre verticalement. */
  center?: boolean;
  /** Pas de bouton : tout l'ecran est tactile, avec une invite discrete. */
  tapToContinue?: boolean;
}) {
  const bar = useContext(ProgressContext);

  const Root: React.ElementType = tapToContinue ? Pressable : View;

  return (
    <Root style={styles.root} onPress={tapToContinue ? onPress : undefined}>
      <Glow />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {bar && <View style={styles.progress}>{bar}</View>}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, center && styles.centered]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>

        {tapToContinue ? (
          <View style={styles.hint}>
            <Text variant="label" tone="tertiary">{cta}</Text>
          </View>
        ) : (
          <View style={styles.footer}>
            <Button label={cta} onPress={onPress} disabled={disabled} />
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
  hint: { alignItems: 'center', paddingBottom: space.xl, paddingTop: space.md },
});
