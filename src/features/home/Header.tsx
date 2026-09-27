import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Settings as SettingsIcon } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { gutter, space } from '@/theme/spacing';
import { haptics } from '@/lib/haptics';

const LOCKUP = require('@/assets/brand/lockup.png');
const PROFILE = require('@/assets/brand/profile.png');

/**
 * En-tete epinglee : elle ne defile jamais.
 *
 * L'engrenage y monte au lieu de vivre dans le contenu, ou il passait sous
 * l'en-tete flottante des qu'on ouvrait le compte — on ne pouvait plus
 * atteindre les reglages.
 */
export function Header({
  onSettings, onProfile,
}: { onSettings: () => void; onProfile: () => void }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const router = useRouter();
  return (
    <View style={st.root}>
      {/*
        Un appui long sur la marque ouvre le plan de demonstration.
        Il sert a filmer l'app pour la presenter, pas a s'en servir : il n'a
        donc rien a faire dans les reglages, ou il serait un bouton de plus a
        comprendre pour tout le monde et utile a une seule personne.
      */}
      <Pressable
        onLongPress={() => { haptics.press(); router.push('/demo'); }}
        delayLongPress={900}
      >
        <Image source={LOCKUP} style={st.lockup} contentFit="contain" />
      </Pressable>

      <View style={{ flex: 1 }} />

      <Pressable
        onPress={() => { haptics.tap(); onSettings(); }}
        hitSlop={12}
        style={st.icon}
        accessibilityRole="button"
        accessibilityLabel="Réglages"
      >
        <SettingsIcon size={18} strokeWidth={1.8} color={withAlpha(c.mist, 0.8)} />
      </Pressable>

      <Pressable
        onPress={() => { haptics.tap(); onProfile(); }}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Compte"
      >
        <Image source={PROFILE} style={st.profile} contentFit="contain" />
      </Pressable>
    </View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  root: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingHorizontal: gutter, paddingBottom: space.sm,
  },
  lockup: { width: 106, height: 40 },
  icon: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(c.mist, 0.18),
  },
  profile: { width: 38, height: 38 },
});
