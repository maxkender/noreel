import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type TextStyle } from 'react-native';
import { colors } from '@/theme/colors';
import { Text } from './Text';
import type { TypeName } from '@/theme/typography';

/** Decoupe le balisage {accent} une seule fois. */
const split = (s: string) => s.split(/(\{[^}]*\}?)/g);

/**
 * Frappe caractere par caractere, sans jamais bouger la page.
 *
 * Le texte complet est rendu une fois en transparent : c'est lui qui occupe
 * la place et fixe les retours a la ligne. Le texte visible est pose
 * par-dessus, hors flux. Sans ce fantome, chaque lettre pouvait faire
 * remonter un mot d'une ligne et tout l'ecran sautait avec lui.
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

  const full = useMemo(() => split(text), [text]);
  const shown = split(text.slice(0, n));
  const done = n >= text.length;

  const parts = (chunks: string[]) =>
    chunks.map((p, i) =>
      p.startsWith('{')
        ? <Text key={i} variant={variant} color={colors.accent}>{p.replace(/[{}]/g, '')}</Text>
        : p
    );

  return (
    <View>
      <Text variant={variant} style={[style, st.ghost]}>{parts(full)}</Text>
      <Text variant={variant} style={[style, StyleSheet.absoluteFill]}>
        {parts(shown)}
        {cursor && !done && (
          <Text variant={variant} color={blink ? colors.accent : 'transparent'}>|</Text>
        )}
      </Text>
    </View>
  );
}

const st = StyleSheet.create({
  // Invisible mais mesure : il tient la hauteur et les coupures de ligne.
  ghost: { opacity: 0 },
});

/** Duree totale, pour enchainer la suite sans deviner. */
export const typeDuration = (text: string, speed = 32, delay = 0) =>
  delay + text.length * speed + 200;
