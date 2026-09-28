import { useEffect, useMemo, useRef, useState } from 'react';
import { type TextStyle } from 'react-native';
import { useColors } from '@/theme/useColors';
import { Text } from './Text';
import type { TypeName } from '@/theme/typography';

/** Un morceau du texte : accentue ou non. Les accolades ne s'affichent pas. */
type Seg = { text: string; accent: boolean };

const parse = (s: string): Seg[] =>
  s.split(/(\{[^}]*\})/g)
    .filter(Boolean)
    .map((p) => (p.startsWith('{')
      ? { text: p.replace(/[{}]/g, ''), accent: true }
      : { text: p, accent: false }));

/**
 * Frappe caractere par caractere, SANS jamais changer les retours a la ligne.
 *
 * La version precedente posait le texte complet en transparent pour tenir la
 * hauteur, puis ecrivait le texte visible par-dessus. Ca fixait la hauteur —
 * mais pas les coupures : le texte visible, plus court, se coupait a sa
 * facon, et le dernier mot d'une ligne sautait a la suivante au moment ou
 * il se terminait. On voyait le texte se reorganiser pendant qu'on le lisait.
 *
 * Ici il n'y a qu'UN texte, toujours complet : la partie pas encore ecrite
 * est simplement transparente. Le navigateur de mise en page voit la meme
 * chaine du premier au dernier caractere, donc les coupures sont celles du
 * texte final des la premiere lettre. Rien ne peut bouger.
 *
 * Le curseur prend la place du prochain caractere au lieu de s'y ajouter :
 * ajoute, il changeait la longueur de la ligne et ramenait le probleme.
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
  const c = useColors();
  const segs = useMemo(() => parse(text), [text]);
  const total = useMemo(() => segs.reduce((n, s) => n + s.text.length, 0), [segs]);
  const [n, setN] = useState(0);
  const [blink, setBlink] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setN(0);
    let i = 0;
    const tick = () => {
      i += 1;
      setN(i);
      if (i < total) timer.current = setTimeout(tick, speed);
    };
    const first = setTimeout(tick, delay);
    return () => { clearTimeout(first); clearTimeout(timer.current); };
  }, [total, speed, delay]);

  useEffect(() => {
    if (!cursor) return;
    const id = setInterval(() => setBlink((b) => !b), 480);
    return () => clearInterval(id);
  }, [cursor]);

  const done = n >= total;
  let at = 0;

  return (
    <Text variant={variant} style={style}>
      {segs.map((s, i) => {
        const start = at;
        at += s.text.length;
        const cut = Math.min(s.text.length, Math.max(0, n - start));
        const shown = s.text.slice(0, cut);
        let hidden = s.text.slice(cut);
        // Le curseur remplace le caractere suivant : meme longueur, meme ligne.
        const caret = cursor && !done && cut < s.text.length && start + cut === n;
        if (caret) hidden = hidden.slice(1);
        return (
          <Text key={i} variant={variant} color={s.accent ? c.accent : undefined}>
            {shown}
            {caret && (
              <Text variant={variant} color={blink ? c.accent : 'transparent'}>|</Text>
            )}
            {hidden.length > 0 && (
              <Text variant={variant} color="transparent">{hidden}</Text>
            )}
          </Text>
        );
      })}
    </Text>
  );
}

/** Duree totale, pour enchainer la suite sans deviner. */
export function typeDuration(text: string, speed = 32, delay = 0): number {
  return delay + parse(text).reduce((n, s) => n + s.text.length, 0) * speed;
}
