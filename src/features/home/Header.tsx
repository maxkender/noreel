import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { GalleryHorizontal, LayoutGrid, List } from 'lucide-react-native';
import { useSettings } from '@/store/settings';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { gutter, space } from '@/theme/spacing';
import { haptics } from '@/lib/haptics';
import { dict } from '@/i18n';

const LOCKUP = require('@/assets/brand/lockup.png');

/**
 * En-tete epinglee : elle ne defile jamais.
 *
 * L'engrenage y monte au lieu de vivre dans le contenu, ou il passait sous
 * l'en-tete flottante des qu'on ouvrait le compte — on ne pouvait plus
 * atteindre les reglages.
 */
export function Header({ switcher = true }: { switcher?: boolean }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const router = useRouter();
  const view = useSettings((x) => x.homeView);
  const set = useSettings((x) => x.set);
  /*
    En haut a droite : COMMENT on voit ses apps — la roue, une grille ou
    une liste. Les reglages et le compte vivent dans l'onglet Compte.
  */
  const modes: ['swipe' | 'grid' | 'list', typeof List][] = [
    ['swipe', GalleryHorizontal], ['grid', LayoutGrid], ['list', List],
  ];
  return (
    <View style={st.root}>
      {/* Un appui long sur la marque ouvre le plan de demonstration (pour filmer l'app). */}
      <Pressable
        onLongPress={() => { haptics.press(); router.push('/demo'); }}
        delayLongPress={900}
      >
        <Image source={LOCKUP} style={st.lockup} contentFit="contain" />
      </Pressable>

      <View style={{ flex: 1 }} />

      {switcher && (
      <View style={st.switch} accessibilityRole="tablist">
        {modes.map(([k, Icon]) => {
          const on = view === k;
          return (
            <Pressable
              key={k}
              onPress={() => { if (!on) { haptics.tick(); set('homeView', k); } }}
              hitSlop={6}
              style={[st.mode, on && st.modeOn]}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={dict.ui[k === 'swipe' ? 'viewSwipe' : k === 'grid' ? 'viewGrid' : 'viewList']}
            >
              <Icon size={16} strokeWidth={2} color={on ? c.night : withAlpha(c.mist, 0.7)} />
            </Pressable>
          );
        })}
      </View>
      )}
    </View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  root: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingHorizontal: gutter, paddingBottom: space.sm,
  },
  lockup: { width: 106, height: 40 },
  switch: {
    flexDirection: 'row', padding: 3, borderRadius: 999, gap: 2,
    backgroundColor: c.glassSolid, borderWidth: 1, borderColor: c.glassEdge,
  },
  mode: { width: 34, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  modeOn: { backgroundColor: c.mist },
});
