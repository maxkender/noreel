import { useMemo } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { radii, space } from '@/theme/spacing';
import { Text } from './type/Text';
import { haptics } from '@/lib/haptics';
import { LANGS, type Lang } from '@/lib/format';
import { useLang } from '@/store/lang';

/* Chaque langue dans sa propre langue : c'est la seule etiquette qu'on est sur de lire. */
export const LANG_NAMES: Record<Lang, string> = {
  en: 'English', fr: 'Français', de: 'Deutsch', tr: 'Türkçe', it: 'Italiano', es: 'Español',
  pt: 'Português', nl: 'Nederlands', pl: 'Polski', ru: 'Русский', sv: 'Svenska', no: 'Norsk', fi: 'Suomi',
  cs: 'Čeština', sk: 'Slovenčina', hu: 'Magyar', ro: 'Română', el: 'Ελληνικά', hr: 'Hrvatski', sl: 'Slovenščina',
  sr: 'Srpski', bg: 'Български', et: 'Eesti', he: 'עברית', ar: 'العربية',
};

/**
 * Le choix de la langue : six pastilles, celle du moment allumee.
 * Un tap change toute l'app sur-le-champ, et le choix reste.
 */
export function LangPicker({ style }: { style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const lang = useLang((s) => s.lang);
  const set = useLang((s) => s.set);
  return (
    <View style={[st.row, style]} testID="lang-picker">
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
            style={[st.pill, on && st.pillOn]}
          >
            <Text variant="label" color={on ? c.night : withAlpha(c.mist, 0.75)} style={{ textTransform: 'none' }}>
              {LANG_NAMES[l]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.sm },
  pill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.pill,
    borderWidth: 1, borderColor: withAlpha(c.mist, 0.22), backgroundColor: withAlpha(c.mist, 0.06),
  },
  pillOn: { backgroundColor: c.accent, borderColor: c.accent },
});
