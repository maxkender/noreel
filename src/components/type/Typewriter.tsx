import { useEffect, useMemo, useState } from 'react';
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
 * Le curseur a disparu. Il clignotait en couleur toutes les demi-secondes
 * pendant que les lettres arrivaient toutes les trente millisecondes : une
 * barre coloree qui saute de lettre en lettre en clignotant a contretemps —
 * c'est ce qui rendait la frappe « bizarre ». Et pour ne pas changer la
 * longueur de la ligne il devait remplacer le caractere suivant, dont la
 * largeur n'est jamais la sienne. Un texte qui apparait, sans rien devant.
 */
export function Typewriter({
  text, variant = 'displayM', speed = 32, delay = 0, style,
}: {
  text: string;
  variant?: TypeName;
  speed?: number;
  delay?: number;
  style?: TextStyle;
  /** Accepte, ignore : il n'y a plus de curseur. Voir ci-dessous. */
  cursor?: boolean;
}) {
  const c = useColors();
  const segs = useMemo(() => parse(text), [text]);
  const total = useMemo(() => segs.reduce((n, s) => n + s.text.length, 0), [segs]);
  const [n, setN] = useState(0);

  /*
    La cadence se calcule depuis l'INSTANT DE DEPART, pas de tick en tick.
    Une chaine de minuteurs derive : chaque rappel arrive un peu apres son
    heure, et les retards s'additionnent — le texte accelerait et ralentissait
    au gre de ce que le fil principal avait d'autre a faire. Ici chaque image
    demande « combien de lettres devraient etre la, maintenant ? » et affiche
    exactement ca. Les espaces passent avec la lettre qui les precede : un
    temps mort sur un blanc se lit comme une hesitation.
  */
  useEffect(() => {
    setN(0);
    let raf = 0;
    const t0 = Date.now() + delay;
    const step = () => {
      const due = Math.max(0, Math.floor((Date.now() - t0) / speed));
      let k = Math.min(total, due);
      // On termine le mot en cours quand la lettre suivante est un blanc.
      const flat = segs.map((s) => s.text).join('');
      while (k < total && flat[k] === ' ') k += 1;
      setN(k);
      if (k < total) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [segs, total, speed, delay]);

  let at = 0;
  return (
    <Text variant={variant} style={style}>
      {segs.map((s, i) => {
        const start = at;
        at += s.text.length;
        const cut = Math.min(s.text.length, Math.max(0, n - start));
        return (
          <Text key={i} variant={variant} color={s.accent ? c.accent : undefined}>
            {s.text.slice(0, cut)}
            {cut < s.text.length && (
              <Text variant={variant} color="transparent">{s.text.slice(cut)}</Text>
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
