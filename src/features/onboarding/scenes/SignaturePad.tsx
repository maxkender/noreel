import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { haptics } from '@/lib/haptics';
import { Text } from '@/components/type/Text';

const H = 190;

type Pt = { x: number; y: number };

/** Un trait en chemin SVG : un M puis des L, sans lissage — l'ecriture au
 *  doigt est deja irreguliere, la lisser l'aurait rendue anonyme. */
const toPath = (pts: Pt[]) =>
  pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

/**
 * Un carre blanc ou l'on SIGNE.
 *
 * Le dernier ecran avant le prix listait trois promesses a lire. On les
 * lisait, ou pas, et on appuyait. Une signature est un geste qu'on ne fait
 * pas distraitement — meme au doigt, meme sur un telephone, on s'applique un
 * peu. C'est cette seconde d'application qu'on veut avant de proposer de
 * payer : on s'engage envers soi, puis on regarde le prix.
 *
 * Rien n'est garde. L'encre reste a l'ecran le temps de la page, et c'est
 * tout : une signature enregistree serait une donnee de plus a proteger, pour
 * un geste dont toute la valeur tient dans le moment ou on le fait.
 */
export function SignaturePad({
  onInk, hint, clearLabel,
}: {
  /** Vrai des le premier trait, faux quand on efface. */
  onInk: (has: boolean) => void;
  hint: string;
  clearLabel: string;
}) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const [strokes, setStrokes] = useState<Pt[][]>([]);
  const [live, setLive] = useState<Pt[]>([]);

  const begin = (p: Pt) => { setLive([p]); haptics.tick(); };
  const extend = (p: Pt) => setLive((s) => [...s, p]);
  const end = () => {
    setLive((s) => {
      if (s.length > 1) setStrokes((all) => { onInk(true); return [...all, s]; });
      return [];
    });
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => { runOnJS(begin)({ x: e.x, y: e.y }); })
    .onChange((e) => { runOnJS(extend)({ x: e.x, y: e.y }); })
    .onFinalize(() => { runOnJS(end)(); });

  const clear = () => { setStrokes([]); setLive([]); onInk(false); haptics.tap(); };
  const empty = strokes.length === 0 && live.length === 0;

  return (
    <View style={st.root}>
      <GestureDetector gesture={pan}>
        <View style={st.paper} accessibilityLabel={hint}>
          {empty && (
            <Text variant="body" color={withAlpha('#0B0D12', 0.35)} style={st.hint}>
              {hint}
            </Text>
          )}
          <Svg width="100%" height={H} pointerEvents="none">
            {[...strokes, live].filter((s) => s.length > 0).map((s, i) => (
              <Path
                key={i}
                d={toPath(s)}
                stroke="#0B0D12"
                strokeWidth={2.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))}
          </Svg>
        </View>
      </GestureDetector>
      {!empty && (
        <Pressable onPress={clear} hitSlop={10} style={st.clear} accessibilityRole="button">
          <Text variant="label" tone="tertiary">{clearLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  root: { alignSelf: 'stretch', gap: space.sm },
  // Blanc casse et non blanc pur : sur la scene sombre, un rectangle blanc
  // eblouit. Le papier a un grain, la page en a un aussi.
  paper: {
    height: H, borderRadius: 22, backgroundColor: '#F4F1EA', overflow: 'hidden',
    borderWidth: 1, borderColor: withAlpha(c.mist, 0.3),
  },
  hint: { position: 'absolute', top: space.md, left: space.lg, right: space.lg },
  clear: { alignSelf: 'flex-end', paddingHorizontal: space.sm, paddingVertical: 4 },
});
