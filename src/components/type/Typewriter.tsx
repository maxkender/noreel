import { useEffect, useRef, useState } from 'react';
import type { TextStyle } from 'react-native';
import { colors } from '@/theme/colors';
import { Text } from './Text';
import type { TypeName } from '@/theme/typography';

/**
 * Frappe caractere par caractere. Le composant est une feuille : son setState
 * ne rend que lui-meme, pas l'ecran entier — c'etait le defaut de la version
 * ou le parent se recalculait a chaque lettre.
 */
export function Typewriter({
  text, variant = 'displayM', speed = 32, delay = 0, style, cursor = true,
}: {
  text: string;
  variant?: TypeName;
  speed?: number;
  delay?: number;
  style?: TextStyle;
  cursor?: boolean;
}) {
  const [n, setN] = useState(0);
  const [blink, setBlink] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setN(0);
    let i = 0;
    const tick = () => {
      i += 1;
      setN(i);
      if (i < text.length) timer.current = setTimeout(tick, speed);
    };
    const first = setTimeout(tick, delay);
    return () => { clearTimeout(first); clearTimeout(timer.current); };
  }, [text, speed, delay]);

  useEffect(() => {
    if (!cursor) return;
    const id = setInterval(() => setBlink((b) => !b), 480);
    return () => clearInterval(id);
  }, [cursor]);

  const shown = text.slice(0, n);
  const done = n >= text.length;
  const parts = shown.split(/(\{[^}]*\}?)/g);

  return (
    <Text variant={variant} style={style}>
      {parts.map((p, i) =>
        p.startsWith('{')
          ? <Text key={i} variant={variant} color={colors.accent}>{p.replace(/[{}]/g, '')}</Text>
          : p
      )}
      {cursor && !done && (
        <Text variant={variant} color={blink ? colors.accent : 'transparent'}>|</Text>
      )}
    </Text>
  );
}

/** Duree totale, pour enchainer la suite sans deviner. */
export const typeDuration = (text: string, speed = 32, delay = 0) =>
  delay + text.length * speed + 200;
