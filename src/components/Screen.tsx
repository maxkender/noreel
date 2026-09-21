import { useContext, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors } from '@/theme/colors';
import { gutter, space } from '@/theme/spacing';
import { Button } from './Button';
import { ProgressContext } from './ProgressContext';

/**
 * Coquille commune a TOUS les ecrans.
 * Le contenu defile, le bouton est ancre en bas hors du flux de defilement :
 * il est donc toujours atteignable et ne peut jamais recouvrir du texte.
 */
export function Screen({
  children, cta, onPress, disabled, secondary, onSecondary, progress,
}: {
  children: ReactNode;
  /** Rendu au-dessus du defilement : ne peut donc jamais recouvrir le texte. */
  progress?: ReactNode;
  cta: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: string;
  onSecondary?: () => void;
}) {
  const ctx = useContext(ProgressContext);
  const bar = progress ?? ctx;
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {bar && <View style={styles.progress}>{bar}</View>}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Entree fluide : fondu + montee legere, ressort plutot que lineaire. */}
        <Animated.View entering={FadeInDown.springify().damping(20).stiffness(140)}>
          {children}
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <Button label={cta} onPress={onPress} disabled={disabled} />
        {secondary && onSecondary && (
          <Button label={secondary} onPress={onSecondary} variant="ghost" />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.night },
  scroll: { flex: 1 },
  progress: { paddingHorizontal: gutter, paddingTop: space.sm, paddingBottom: space.xs },
  content: { paddingHorizontal: gutter, paddingTop: space.lg, paddingBottom: space.xl },
  footer: {
    paddingHorizontal: gutter, paddingTop: space.md, paddingBottom: space.sm,
    gap: space.sm,
    backgroundColor: colors.night,
  },
});
