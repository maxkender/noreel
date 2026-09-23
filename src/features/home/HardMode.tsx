import { useEffect, useMemo, useState } from 'react';
import {
  Modal, Pressable, StyleSheet, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ShieldAlert } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { gutter, space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { Button } from '@/components/Button';
import { haptics } from '@/lib/haptics';
import { useOnboardingStore } from '@/store/onboarding';
import { formatHours } from '@/lib/format';

const WAIT = 60;      // secondes
const SUMS = 3;       // operations a resoudre

type Sum = { a: number; b: number; r: number };

/** Tire les operations. Appele depuis un geste, jamais pendant un rendu :
 *  un tirage pendant le rendu change l'operation sous les doigts des que
 *  l'ecran se redessine. */
function makeQuiz(): Sum[] {
  return Array.from({ length: SUMS }, () => {
    const a = 12 + Math.floor(Math.random() * 76);
    const b = 13 + Math.floor(Math.random() * 46);
    return { a, b, r: a * b };
  });
}

/**
 * La porte du mode strict : ce qu'il faut traverser pour rendre le blocage.
 *
 * L'ordre n'est pas anodin. L'ATTENTE VIENT D'ABORD, avant tout effort :
 * placee en dernier, elle arrive quand on a deja tape une phrase et resolu
 * des calculs, et on la subit par entetement — on a trop investi pour
 * renoncer. Placee en tete, elle tombe au moment ou l'envie est la plus
 * crue, et c'est la qu'une minute la defait. Ce qui suit ne sert plus qu'a
 * empecher le geste machinal.
 *
 * Rien ici n'est infranchissable, et c'est voulu : le but n'est pas
 * d'enfermer quelqu'un dans son propre telephone, mais de mettre trois
 * minutes entre une impulsion et un renoncement.
 */
export function HardMode({
  visible, onCancel, onPass,
}: { visible: boolean; onCancel: () => void; onPass: () => void }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const [step, setStep] = useState(0);
  const [quiz, setQuiz] = useState<Sum[]>([]);

  const steps = [
    <Wait key="w" onDone={() => setStep(1)} />,
    <Pledge key="p" onDone={() => { setQuiz(makeQuiz()); setStep(2); }} />,
    <Sums key="s" quiz={quiz} onDone={onPass} />,
  ];

  return (
    // On repart de la premiere etape a l'OUVERTURE, pas dans un effet : un
    // effet qui ecrit l'etat juste apres le rendu fait rendre deux fois, et
    // la premiere image montre l'etape ou l'on s'etait arrete.
    <Modal
      visible={visible}
      animationType="slide"
      onShow={() => { setStep(0); setQuiz([]); }}
      onRequestClose={onCancel}
    >
      <View style={st.root}>
        <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
          <View style={st.bar}>
            <Pressable onPress={() => { haptics.tap(); onCancel(); }} hitSlop={12}>
              <Text variant="label" color={c.accent}>Annuler</Text>
            </Pressable>
            <Text variant="label" tone="tertiary">Étape {step + 1} sur {steps.length}</Text>
            <View style={{ width: 54 }} />
          </View>

          <Animated.View key={step} entering={FadeIn.duration(320)} style={st.page}>
            {steps[step]}
          </Animated.View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

/* ---------- 1. L'attente ---------- */

function Wait({ onDone }: { onDone: () => void }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const [left, setLeft] = useState(WAIT);
  const minutes = useOnboardingStore((x) => x.minutesPerDay);

  useEffect(() => {
    const id = setInterval(() => setLeft((n) => (n <= 1 ? 0 : n - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={st.center}>
      <Text variant="displayM" style={st.mid}>Une minute, d’abord.</Text>
      <Text variant="lead" tone="secondary" style={[st.mid, { marginTop: space.md }]}>
        Tu récupérais {formatHours(minutes)} par jour. Si l’envie tient encore
        dans une minute, tu passeras.
      </Text>

      <Text variant="displayL" style={st.count}>{left}</Text>
      <Text variant="label" tone="tertiary">secondes</Text>

      <View style={st.foot}>
        <Button
          label={left > 0 ? `Attendre ${left} s` : 'Continuer'}
          disabled={left > 0}
          onPress={onDone}
        />
      </View>
    </View>
  );
}

/* ---------- 2. La phrase ---------- */

/** Sa propre phrase, a son nom : recopier « I turned Hard Mode on » en
 *  anglais ne coute rien a personne. Celle-ci se lit en la tapant. */
function pledgeFor(name: string): string {
  const who = name || 'Moi';
  return `${who}, je désactive ce que j’ai mis en place pour moi-même. `
    + `Je sais exactement ce que je fais.`;
}

function Pledge({ onDone }: { onDone: () => void }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const name = useOnboardingStore((x) => x.firstName);
  const target = useMemo(() => pledgeFor(name), [name]);
  const [typed, setTyped] = useState('');
  const ok = typed.trim() === target;

  return (
    <View style={{ flex: 1 }}>
      <Text variant="displayM">Recopie cette phrase.</Text>
      <Text variant="label" tone="tertiary" style={{ marginTop: space.xs }}>
        À la lettre près, accents compris.
      </Text>

      <View style={st.quote}>
        <Text variant="body">{target}</Text>
      </View>

      <TextInput
        style={st.input}
        value={typed}
        onChangeText={setTyped}
        multiline
        autoCorrect={false}
        autoCapitalize="none"
        spellCheck={false}
        placeholder="…"
        placeholderTextColor={withAlpha(c.mist, 0.3)}
      />

      {typed.length > 0 && !ok && (
        <Text variant="label" color={c.danger} style={{ marginTop: space.sm }}>
          Pas encore identique.
        </Text>
      )}

      <View style={st.foot}>
        <Button label="Continuer" disabled={!ok} onPress={onDone} />
      </View>
    </View>
  );
}

/* ---------- 3. Le calcul ---------- */

function Sums({ quiz, onDone }: { quiz: Sum[]; onDone: () => void }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const [i, setI] = useState(0);
  const [answer, setAnswer] = useState('');
  const [wrong, setWrong] = useState(false);

  const q = quiz[i];
  if (!q) return <View style={{ flex: 1 }} />;

  const submit = () => {
    if (Number(answer.trim()) !== q.r) {
      haptics.stop();
      setWrong(true);
      return;
    }
    haptics.success();
    setWrong(false);
    setAnswer('');
    if (i + 1 >= quiz.length) onDone();
    else setI(i + 1);
  };

  return (
    <View style={{ flex: 1 }}>
      <Text variant="displayM">Trois calculs.</Text>
      <Text variant="label" tone="tertiary" style={{ marginTop: space.xs }}>
        {i + 1} sur {quiz.length} · de tête
      </Text>

      <Text variant="displayL" style={st.sum}>{q.a} × {q.b}</Text>

      <TextInput
        style={[st.input, st.sumInput]}
        value={answer}
        onChangeText={(v) => { setAnswer(v); setWrong(false); }}
        keyboardType="number-pad"
        placeholder="?"
        placeholderTextColor={withAlpha(c.mist, 0.3)}
      />

      {wrong && (
        <Text variant="label" color={c.danger} style={{ marginTop: space.sm }}>
          Non. Recompte.
        </Text>
      )}

      <View style={st.foot}>
        <Button label="Valider" disabled={answer.trim().length === 0} onPress={submit} />
      </View>
    </View>
  );
}

/* ---------- L'avertissement, avant d'armer ---------- */

export function HardModeIntro({
  visible, onCancel, onConfirm,
}: { visible: boolean; onCancel: () => void; onConfirm: () => void }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={st.warnRoot}>
        <SafeAreaView edges={['top', 'bottom']} style={st.warnBody}>
          <View style={{ flex: 1 }} />
          <View style={st.warnRing}>
            <ShieldAlert size={30} strokeWidth={2} color={c.mist} />
          </View>

          <Text variant="displayM" style={st.mid}>Mode strict</Text>
          <Text variant="lead" style={[st.mid, { marginTop: space.md }]}>
            Rendre le blocage demandera une minute d’attente, une phrase à
            recopier et trois calculs. Compte trois minutes. Tes apps
            filtrées, elles, continuent de marcher normalement.
          </Text>

          <View style={{ flex: 1 }} />
          <Button label="Je l’active" onPress={onConfirm} />
          <Pressable onPress={() => { haptics.tap(); onCancel(); }} style={st.later}>
            <Text variant="label" color={withAlpha(c.mist, 0.8)}>Pas maintenant</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.night },
  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: gutter, paddingVertical: space.md,
  },
  page: { flex: 1, paddingHorizontal: gutter, paddingTop: space.lg },
  center: { flex: 1, alignItems: 'center', paddingTop: space.xxl },
  mid: { textAlign: 'center' },
  count: { marginTop: space.xxl, fontVariant: ['tabular-nums'] },
  quote: {
    marginTop: space.xl, padding: space.lg, borderRadius: 16,
    backgroundColor: c.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.lineStrong,
  },
  input: {
    marginTop: space.lg, minHeight: 96, padding: space.md, borderRadius: 16,
    color: c.mist, fontFamily: 'Sans', fontSize: 16, lineHeight: 22,
    backgroundColor: c.surfaceHi,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.lineStrong,
  },
  sum: { marginTop: space.xxl, textAlign: 'center' },
  sumInput: { minHeight: 64, textAlign: 'center', fontSize: 24 },
  foot: { position: 'absolute', left: 0, right: 0, bottom: space.lg },
  warnRoot: { flex: 1, backgroundColor: c.danger },
  warnBody: { flex: 1, paddingHorizontal: gutter, alignItems: 'center' },
  warnRing: {
    width: 84, height: 84, borderRadius: 42, marginBottom: space.xl,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: withAlpha(c.mist, 0.14),
  },
  later: { paddingVertical: space.lg },
});
