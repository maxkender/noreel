import { useEffect, useState } from 'react';
import type { TextStyle } from 'react-native';
import { colors } from '@/theme/colors';
import { Text } from './Text';
import type { TypeName } from '@/theme/typography';

/**
 * Ecrit le texte caractere par caractere. Le mot entre {accolades} prend
 * l'accent — c'est ce qui donne la respiration visuelle des titres d'Opal.
 */
export function Typewriter({
  text, variant = 'displayM', speed = 26, delay = 0, style, onDone,
}: {
  text: string;
  variant?: TypeName;
  speed?: number;
  delay?: number;
  style?: TextStyle;
  onDone?: () => void;
}) {
  const [n, setN] = useState(0);

  useEffect(() => {
    setN(0);
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      i += 1;
      setN(i);
      if (i < text.length) timer = setTimeout(tick, speed);
      else onDone?.();
    };
    const first = setTimeout(tick, delay);
    return () => { clearTimeout(first); clearTimeout(timer); };
    // onDone volontairement hors des deps : sa reference change a chaque rendu.
  }, [text, speed, delay]);

  const shown = text.slice(0, n);
  const parts = shown.split(/(\{[^}]*\}?)/g);

  return (
    <Text variant={variant} style={style}>
      {parts.map((p, i) =>
        p.startsWith('{')
          ? <Text key={i} variant={variant} color={colors.accent}>{p.replace(/[{}]/g, '')}</Text>
          : p
      )}
    </Text>
  );
}
