import { useMemo } from 'react';
import type { TextStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors } from '@/theme/colors';
import { Text } from './Text';
import type { TypeName } from '@/theme/typography';

/**
 * Revele mot par mot, chacun en fondu sur le thread UI.
 * L'ancienne version rendait un setState par CARACTERE : le composant entier
 * se recalculait 40 fois par phrase, d'ou les saccades.
 */
export function Typewriter({
  text, variant = 'displayM', stagger = 55, delay = 0, style,
}: {
  text: string;
  variant?: TypeName;
  stagger?: number;
  delay?: number;
  style?: TextStyle;
}) {
  const words = useMemo(() => text.split(/(\s+)/).filter(Boolean), [text]);

  return (
    <Text variant={variant} style={style}>
      {words.map((w, i) => {
        const accent = w.startsWith('{');
        const clean = w.replace(/[{}]/g, '');
        return (
          <Animated.Text
            key={`${i}-${w}`}
            entering={FadeIn.delay(delay + i * stagger).duration(320)}
          >
            <Text variant={variant} color={accent ? colors.accent : undefined}>
              {clean}
            </Text>
          </Animated.Text>
        );
      })}
    </Text>
  );
}

/** Duree totale d'une phrase, pour enchainer ce qui suit sans deviner. */
export const typeDuration = (text: string, stagger = 55, delay = 0) =>
  delay + text.split(/\s+/).length * stagger + 320;
