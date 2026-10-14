import { useEffect, useMemo, useState } from 'react';
import { font } from '@/theme/typography';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { gutter, space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { Button } from '@/components/Button';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import { countPass, stats } from '@/services/protect';

/** Cinq minutes, et pas une de plus. */
export const PASS_MINUTES = 5;

const WAIT = 60;        // secondes d'attente, avant tout effort
const SUMS = 3;         // operations
const DIGITS = 6;       // longueur de la suite a retenir
const SHOW_MS = 4000;   // duree d'affichage de la suite

/*
 * Le laissez-passer : cinq minutes de reels, gagnees.
 *
 * L'idee parait contredire l'app, et c'est le contraire : ce qui fait
 * desinstaller un bloqueur, c'est l'impasse. Quelqu'un qui veut vraiment voir
 * un reel le verra — soit en passant par ici, soit en supprimant UnSwipe. La
 * seule chose qu'on puisse choisir, c'est le PRIX du passage.
 *
 * Il est donc cher, et cher d'une facon precise : l'attente vient d'abord,
 * avant tout effort. Placee en dernier, elle arrive quand on a deja resolu
 * des calculs et retenu une suite, et on la subit par entetement — on a trop
 * investi pour renoncer. Placee en tete, elle tombe au moment ou l'envie est
 * la plus crue, et c'est la qu'une minute et demie la defait. Ce qui suit
 * n'est plus qu'un filtre contre le geste machinal.
 */
export function ReelsPass({
  visible, onCancel, onPass,
}: { visible: boolean; onCancel: () => void; onPass: () => void }) {
  const c = useColors();
  const { d, t } = useT();
  const st = useMemo(() => sheet(c), [c]);
  const [step, setStep] = useState(0);
  const [quiz, setQuiz] = useState<Sum[]>([]);
  const [code, setCode] = useState('');

  const steps = [
    <Wait key="w" onDone={() => { setQuiz(makeQuiz()); setStep(1); }} />,
    <Sums key="s" quiz={quiz} onDone={() => { setCode(makeCode()); setStep(2); }} />,
    <Sequence key="q" code={code} onDone={() => setStep(3)} />,
    <Cost key="c" onDone={onPass} />,
  ];

  return (
    // On repart de la premiere etape a l'OUVERTURE, pas dans un effet : un
    // effet qui ecrit l'etat juste apres le rendu fait rendre deux fois, et
    // la premiere image montre l'etape ou l'on s'etait arrete.
    <Modal
      visible={visible}
      animationType="slide"
      onShow={() => { setStep(0); setQuiz([]); setCode(''); }}
      onRequestClose={onCancel}
    >
      <View style={st.root}>
        <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
          <View style={st.bar}>
            <Pressable onPress={() => { haptics.tap(); onCancel(); }} hitSlop={12}>
              <Text variant="label" color={c.accent}>{d.pass.giveUp}</Text>
            </Pressable>
            <Text variant="label" tone="tertiary">
              {t(d.pass.step, { i: step + 1, n: steps.length })}
            </Text>
            <View style={{ width: 62 }} />
          </View>

          {/*
            Le clavier POUSSE la page au lieu de la couvrir : le bouton
            « Valider » restait cache dessous, et rien ne permettait de le
            ranger — on etait coince devant un calcul juste. Toucher a cote du
            champ le range aussi.
          */}
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss} accessible={false}>
              <Animated.View key={step} entering={FadeIn.duration(320)} style={st.page}>
                {steps[step]}
              </Animated.View>
            </Pressable>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

/* ---------- 1. L'attente ---------- */

function Wait({ onDone }: { onDone: () => void }) {
  const c = useColors();
  const { d, t } = useT();
  const st = useMemo(() => sheet(c), [c]);
  const [left, setLeft] = useState(WAIT);

  useEffect(() => {
    const id = setInterval(() => setLeft((n) => (n <= 1 ? 0 : n - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, '0');

  return (
    <View style={st.center}>
      <Text variant="displayM" style={st.mid}>{d.pass.waitTitle}</Text>
      <Text variant="lead" tone="secondary" style={[st.mid, { marginTop: space.md }]}>
        {d.pass.waitBody}
      </Text>

      <Text variant="hero" color={left > 0 ? c.ember : c.accent} style={st.clock}>
        {mm}:{ss}
      </Text>

      <View style={st.action}>
        <Button
          label={left > 0 ? t(d.pass.waitLeft, { n: left }) : d.pass.validate}
          onPress={() => { haptics.press(); onDone(); }}
          disabled={left > 0}
        />
      </View>
    </View>
  );
}

/* ---------- 2. Les calculs ---------- */

type Sum = { q: string; r: number };

/**
 * Trois produits de la table de multiplication.
 *
 * Tires depuis un GESTE, jamais pendant un rendu : un tirage pendant le
 * rendu change l'operation sous les doigts des que l'ecran se redessine.
 *
 * Ils etaient a deux temps — multiplier puis retrancher — et personne ne les
 * faisait : on renoncait, ou on sortait la calculette. Le but n'est pas
 * d'etre impossible, c'est de demander une seconde d'attention ; trois
 * produits de deux chiffres entre trois et neuf la demandent.
 */
function makeQuiz(): Sum[] {
  return Array.from({ length: SUMS }, () => {
    const a = 3 + Math.floor(Math.random() * 7);
    const b = 3 + Math.floor(Math.random() * 7);
    return { q: `${a} × ${b}`, r: a * b };
  });
}

function Sums({ quiz, onDone }: { quiz: Sum[]; onDone: () => void }) {
  const c = useColors();
  const { d, t } = useT();
  const st = useMemo(() => sheet(c), [c]);
  const [i, setI] = useState(0);
  const [val, setVal] = useState('');
  const [wrong, setWrong] = useState(false);

  const sum = quiz[i];
  if (!sum) return null;

  const submit = () => {
    if (Number(val) !== sum.r) {
      haptics.stop();
      setWrong(true);
      setVal('');
      return;
    }
    haptics.success();
    setVal('');
    setWrong(false);
    if (i + 1 >= quiz.length) { onDone(); return; }
    setI(i + 1);
  };

  return (
    <View style={st.center}>
      <Text variant="label" tone="tertiary">
        {t(d.pass.sum, { i: i + 1, n: quiz.length })}
      </Text>
      <Text variant="hero" style={[st.mid, { marginTop: space.md }]} numberOfLines={1} adjustsFontSizeToFit>
        {sum.q}
      </Text>

      {/* Le clavier numerique n'a pas de touche « OK » : la reponse se
          valide au bouton, qui reste visible au-dessus du clavier, ou en
          touchant a cote pour le ranger. */}
      <TextInput
        value={val}
        onChangeText={(t) => { setVal(t); setWrong(false); }}
        keyboardType="number-pad"
        placeholder="?"
        placeholderTextColor={withAlpha(c.mist, 0.25)}
        style={[st.input, wrong && st.inputWrong]}
        maxLength={4}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={() => { if (val.trim().length) submit(); }}
      />

      {/* La place du message est RESERVEE : sans elle, l'erreur pousse le
          bouton vers le bas au moment ou le doigt y va. */}
      <View style={st.slot}>
        {wrong && (
          <Text variant="label" color={c.danger}>{d.pass.wrong}</Text>
        )}
      </View>

      <View style={st.action}>
        <Button label={d.pass.validate} onPress={submit} disabled={val.trim().length === 0} />
      </View>
    </View>
  );
}

/* ---------- 3. La suite ---------- */

function makeCode(): string {
  return Array.from({ length: DIGITS }, () => Math.floor(Math.random() * 10)).join('');
}

/**
 * Retenir six chiffres, et les rendre A L'ENVERS.
 *
 * Dans l'ordre, on les recopie en les lisant du coin de l'oeil. A l'envers,
 * il faut les avoir vraiment gardes en tete : c'est une tache qui occupe
 * exactement la memoire de travail, celle qu'on n'a plus quand on cherche a
 * ouvrir une app par reflexe.
 */
function Sequence({ code, onDone }: { code: string; onDone: () => void }) {
  const c = useColors();
  const { d } = useT();
  const st = useMemo(() => sheet(c), [c]);
  const [val, setVal] = useState('');
  const [wrong, setWrong] = useState(false);
  const [again, setAgain] = useState(0);
  /*
    La manche dont l'affichage est TERMINE, et non un drapeau « on montre ».
    Avec un drapeau, il fallait le remettre a vrai dans l'effet a chaque
    nouvelle manche — un etat ecrit juste apres le rendu, donc un rendu de
    plus, et une image ou la suite est deja cachee avant d'avoir ete montree.
    Ici l'affichage se DEDUIT : tant que la manche courante n'est pas celle
    qu'on a fini de montrer, on la montre.
  */
  const [revealed, setRevealed] = useState(-1);
  const shown = revealed !== again;

  useEffect(() => {
    const id = setTimeout(() => setRevealed(again), SHOW_MS);
    return () => clearTimeout(id);
  }, [again]);

  const target = code.split('').reverse().join('');

  const submit = () => {
    if (val.trim() !== target) {
      haptics.stop();
      setWrong(true);
      setVal('');
      // On remontre la suite : le but est de couter du temps et de
      // l'attention, pas de rendre la chose impossible.
      setAgain((n) => n + 1);
      return;
    }
    haptics.success();
    onDone();
  };

  return (
    <View style={st.center}>
      <Text variant="displayM" style={st.mid}>
        {shown ? d.pass.remember : d.pass.reverse}
      </Text>

      <View style={st.codeSlot}>
        {shown ? (
          <Text variant="hero" style={st.code} numberOfLines={1} adjustsFontSizeToFit>
            {code.split('').join(' ')}
          </Text>
        ) : (
          <TextInput
            value={val}
            onChangeText={(t) => { setVal(t); setWrong(false); }}
            keyboardType="number-pad"
            placeholder="?"
            placeholderTextColor={withAlpha(c.mist, 0.25)}
            style={[st.input, wrong && st.inputWrong]}
            maxLength={DIGITS}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => { if (val.trim().length >= DIGITS) submit(); }}
          />
        )}
      </View>

      <View style={st.slot}>
        {wrong && <Text variant="label" color={c.danger}>{d.pass.again}</Text>}
      </View>

      <View style={st.action}>
        <Button
          label={shown ? d.pass.wait : d.pass.validate}
          onPress={submit}
          disabled={shown || val.trim().length < DIGITS}
        />
      </View>
    </View>
  );
}

/* ---------- 4. Le prix ---------- */

/**
 * Ce que le passage coute, montre avant d'en profiter.
 *
 * Un cout qu'on ne voit pas n'en est pas un. Corti perd des points a chaque
 * laissez-passer, et c'est ICI qu'on le lit — pas dans un ecran de
 * statistiques ouvert trois jours plus tard. La porte reste ouverte, mais on
 * sait ce qu'on vient de payer pour la franchir.
 */
function Cost({ onDone }: { onDone: () => void }) {
  const c = useColors();
  const { d, t } = useT();
  const st = useMemo(() => sheet(c), [c]);
  const [before, setBefore] = useState<number | null>(null);
  const [after, setAfter] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    // On lit l'avant, puis on depense : les deux chiffres cote a cote sont
    // tout l'interet de l'ecran.
    void stats().then((s) => {
      if (!alive) return;
      setBefore(s.brain);
      void countPass().then((next) => { if (alive) setAfter(next); });
    });
    return () => { alive = false; };
  }, []);

  const lost = before !== null && after !== null ? before - after : 0;

  return (
    <View style={st.center}>
      <Text variant="displayM" style={st.mid}>
        {t(d.pass.openTitle, { n: PASS_MINUTES })}
      </Text>

      {/* La place du chiffre est reservee : il arrive du disque, et sans
          reserve le bouton sauterait a son arrivee. */}
      <View style={st.costSlot}>
        {after !== null && (
          <Text variant="lead" color={c.ember} style={st.mid}>
            {lost > 0 && before !== null
              ? t(d.pass.cost, { a: after, b: before })
              : t(d.pass.costFlat, { a: after })}
          </Text>
        )}
      </View>

      <View style={st.action}>
        <Button label={d.pass.go} onPress={() => { haptics.tap(); onDone(); }} />
      </View>
    </View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.night },
  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: gutter, paddingVertical: space.md,
  },
  page: { flex: 1, paddingHorizontal: gutter },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mid: { textAlign: 'center' },
  clock: { marginTop: space.xl },
  codeSlot: { height: 96, justifyContent: 'center', marginTop: space.xl },
  code: { letterSpacing: 4, textAlign: 'center' },
  input: {
    minWidth: 200, height: 68, borderRadius: 20, textAlign: 'center',
    marginTop: space.lg, paddingHorizontal: space.lg,
    color: c.mist, fontSize: 30, ...font('SansSemi'),
    backgroundColor: c.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.lineStrong,
  },
  inputWrong: { borderColor: withAlpha(c.danger, 0.7) },
  // Hauteur fixe : le message d'erreur ne doit pas pousser le bouton.
  slot: { height: 28, justifyContent: 'center' },
  costSlot: { height: 58, justifyContent: 'center', paddingHorizontal: space.lg },
  action: { alignSelf: 'stretch', marginTop: space.lg },
});
