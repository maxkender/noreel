import { useState } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { T } from './theme';
import LifeGrid, { Legend, computeLife } from './LifeGrid';
import Manifesto from './Manifesto';

const AGES = [18, 22, 25, 30, 35, 40, 50];
const HOURS = [1, 2, 3, 4, 5, 6];

// Textes originaux — la structure s inspire du genre, pas la formulation.
const LINES = [
  { t: "Instagram ne construira jamais un bouton pour couper les Reels.", pause: 1900 },
  { t: "Ce n'est pas un oubli. C'est le produit.", pause: 1700 },
  { t: "Alors on l'a construit nous-mêmes.", strong: true, pause: 2100 },
  { t: "Tu gardes tes amis, tes messages, tes photos.", pause: 1700 },
  { t: "Tu perds seulement la machine à défiler.", strong: true, pause: 1000 },
];

export default function Onboarding({ onFinish }) {
  const [step, setStep] = useState(0);
  const [age, setAge] = useState(25);
  const [hours, setHours] = useState(3);

  const life = computeLife(age, hours);

  if (step === 0) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <View style={styles.mark}>
            <View style={styles.markRing} />
            <View style={styles.markBar} />
          </View>
          <Text style={styles.wordmark}>ReelsFree</Text>
          <Text style={styles.tagline}>Instagram. Sans la machine à défiler.</Text>
        </View>
        <View style={styles.footer}>
          <Primary label="Commencer" onPress={() => setStep(1)} />
        </View>
      </SafeAreaView>
    );
  }

  if (step === 1) {
    return (
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.kicker}>Une case = une semaine</Text>
          <Text style={styles.h1}>Voici ta vie, si rien ne change</Text>

          <View style={styles.gridWrap}>
            <LifeGrid age={age} hoursPerDay={hours} />
          </View>
          <Legend age={age} hoursPerDay={hours} />

          <Text style={styles.label}>Ton âge</Text>
          <Chips values={AGES} value={age} onChange={setAge} suffix=" ans" />

          <Text style={styles.label}>Temps passé à défiler, par jour</Text>
          <Chips values={HOURS} value={hours} onChange={setHours} suffix=" h" />

          <View style={styles.stat}>
            <Text style={styles.statBig}>{life.scrollYears.toFixed(1)} ans</Text>
            <Text style={styles.statSub}>
              de ta vie restante partiront dans un fil qui défile.
              Il te reste {life.freeYears.toFixed(1)} ans vraiment libres.
            </Text>
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <Primary label="Continuer" onPress={() => setStep(2)} />
        </View>
      </SafeAreaView>
    );
  }

  if (step === 2) {
    return (
      <SafeAreaView style={styles.root}>
        <Manifesto lines={LINES} onDone={() => setStep(3)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>Comment ça marche</Text>
        {[
          ['Instagram, normalement', 'Ton fil, tes messages, tes stories. Rien ne change.'],
          ['Les Reels, retirés', "L'onglet disparaît, les reels du fil sont filtrés."],
          ['Une bulle pour naviguer', 'Déplace-la où tu veux. Elle ouvre ton menu.'],
        ].map(([title, body]) => (
          <View key={title} style={styles.card}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardBody}>{body}</Text>
          </View>
        ))}
        <Text style={styles.note}>
          Tu te connecteras sur la page d'Instagram elle-même.
          ReelsFree ne voit jamais ton mot de passe.
        </Text>
      </ScrollView>
      <View style={styles.footer}>
        <Primary label="Ouvrir Instagram" onPress={onFinish} />
      </View>
    </SafeAreaView>
  );
}

function Chips({ values, value, onChange, suffix = '' }) {
  return (
    <View style={styles.chips}>
      {values.map(v => {
        const on = v === value;
        return (
          <Pressable
            key={v}
            onPress={() => onChange(v)}
            style={[styles.chip, on && styles.chipOn]}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{v}{suffix}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Primary({ label, onPress }) {
  return (
    <Pressable style={styles.primary} onPress={onPress}>
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  scroll: { padding: 24, paddingBottom: 30, gap: 4 },

  mark: { width: 78, height: 78, alignItems: 'center', justifyContent: 'center' },
  markRing: {
    position: 'absolute', width: 66, height: 66, borderRadius: 33,
    borderWidth: 5, borderColor: T.accent,
  },
  markBar: {
    position: 'absolute', width: 66, height: 5, backgroundColor: T.accent,
    transform: [{ rotate: '-45deg' }], borderRadius: 3,
  },
  wordmark: { color: T.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  tagline: { color: T.dim, fontSize: 15, textAlign: 'center' },

  kicker: {
    color: T.dim, fontSize: 11, letterSpacing: 1.4,
    textTransform: 'uppercase', marginBottom: 6,
  },
  h1: { color: T.text, fontSize: 25, fontWeight: '800', marginBottom: 18, lineHeight: 31 },
  gridWrap: { backgroundColor: T.bgSoft, padding: 10, borderRadius: 10 },

  label: { color: T.dim, fontSize: 12, marginTop: 22, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: T.card, borderWidth: 1, borderColor: T.line,
  },
  chipOn: { backgroundColor: T.accentDim, borderColor: T.accent },
  chipText: { color: T.dim, fontSize: 13, fontWeight: '600' },
  chipTextOn: { color: '#00131F' },

  stat: { marginTop: 26, padding: 16, borderRadius: 12, backgroundColor: T.card },
  statBig: { color: T.danger, fontSize: 32, fontWeight: '800' },
  statSub: { color: T.dim, fontSize: 14, lineHeight: 21, marginTop: 6 },

  card: {
    backgroundColor: T.card, borderRadius: 12, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: T.line,
  },
  cardTitle: { color: T.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardBody: { color: T.dim, fontSize: 14, lineHeight: 20 },
  note: { color: T.dim, fontSize: 12, lineHeight: 18, marginTop: 14, fontStyle: 'italic' },

  footer: { padding: 20, paddingTop: 8 },
  primary: {
    backgroundColor: T.accent, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  primaryText: { color: '#00131F', fontSize: 16, fontWeight: '700' },
});
