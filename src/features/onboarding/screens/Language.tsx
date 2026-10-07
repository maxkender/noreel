import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { radii, space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { LANG_NAMES } from '@/components/LangPicker';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import { LANGS, type Lang } from '@/lib/format';
import { useLang } from '@/store/lang';

/* Le drapeau du pays qu'on associe d'abord a la langue. */
const FLAGS: Record<Lang, string> = { en: '🇬🇧', fr: '🇫🇷', de: '🇩🇪', tr: '🇹🇷', it: '🇮🇹', es: '🇪🇸' };

/**
 * Le choix de la langue, juste apres la bienvenue : une liste, un drapeau
 * et le nom de la langue dans sa propre langue. Un tap change toute l'app
 * sur-le-champ — le titre de cet ecran compris — et le choix reste.
 */
export function Language({ onNext }: { onNext: () => void }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d } = useT();
  const lang = useLang((s) => s.lang);
  const set = useLang((s) => s.set);
  return (
    <Screen cta={d.ob.keepGoing} onPress={onNext} hue="accent">
      <Text variant="displayM" style={st.center}>{d.ob.langTitle}</Text>
      <View style={st.list} testID="lang-list">
        {LANGS.map((l) => {
          const on = l === lang;
          return (
            <Pressable
              key={l}
              onPress={() => { if (on) return; haptics.tick(); set(l); }}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={LANG_NAMES[l]}
              testID={`lang-${l}`}
              style={[st.row, on && st.rowOn]}
            >
              <Text variant="title" style={st.flag}>{FLAGS[l]}</Text>
              <Text variant="button" color={on ? c.mist : withAlpha(c.mist, 0.72)} style={{ flex: 1 }}>{LANG_NAMES[l]}</Text>
              <View style={[st.tick, on && st.tickOn]}>
                {on && <Check size={13} strokeWidth={3} color={c.night} />}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  center: { textAlign: 'center' },
  list: { marginTop: space.xl, gap: space.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingHorizontal: space.lg, height: 58, borderRadius: radii.chip + 4,
    borderWidth: 1.5, borderColor: withAlpha(c.mist, 0.14), backgroundColor: withAlpha(c.mist, 0.04),
  },
  rowOn: { borderColor: withAlpha(c.accent, 0.9), backgroundColor: withAlpha(c.accent, 0.14) },
  flag: { width: 34, textAlign: 'center' },
  tick: {
    width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: withAlpha(c.mist, 0.25),
  },
  tickOn: { backgroundColor: c.accent, borderColor: c.accent },
});
