import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { T } from './theme';

/**
 * Revele les lignes une par une. Un tap fait apparaitre tout de suite
 * la ligne suivante — on ne fait jamais attendre quelqu un de presse.
 */
export default function Manifesto({ lines, onDone }) {
  const [shown, setShown] = useState(0);
  const timer = useRef(null);

  useEffect(() => {
    if (shown >= lines.length) return;
    timer.current = setTimeout(() => setShown(s => s + 1), lines[shown].pause ?? 1400);
    return () => clearTimeout(timer.current);
  }, [shown, lines]);

  const speedUp = () => {
    clearTimeout(timer.current);
    if (shown < lines.length) setShown(s => s + 1);
    else onDone();
  };

  const done = shown >= lines.length;

  return (
    <Pressable style={styles.root} onPress={speedUp}>
      <View style={styles.stack}>
        {lines.slice(0, shown).map((l, i) => (
          <FadeLine key={i} line={l} last={i === shown - 1} />
        ))}
      </View>

      <Text style={styles.hint}>
        {done ? 'Touche pour continuer' : 'Touche pour accélérer'}
      </Text>
    </Pressable>
  );
}

function FadeLine({ line, last }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 420, useNativeDriver: true }).start();
  }, [a]);

  return (
    <Animated.Text
      style={[
        line.strong ? styles.strong : styles.soft,
        // la ligne en cours reste pleine, les precedentes s estompent
        { opacity: a.interpolate({ inputRange: [0, 1], outputRange: [0, last ? 1 : 0.38] }) },
        { transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] },
      ]}
    >
      {line.t}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, backgroundColor: T.bg },
  stack: { gap: 14 },
  soft: { color: T.dim, fontSize: 17, lineHeight: 25 },
  strong: { color: T.text, fontSize: 26, lineHeight: 33, fontWeight: '700' },
  hint: {
    position: 'absolute', bottom: 40, alignSelf: 'center',
    color: T.dim, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase',
  },
});
