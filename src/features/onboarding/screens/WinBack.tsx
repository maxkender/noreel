import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Check, X } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { gutter, space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { Button } from '@/components/Button';
import { haptics } from '@/lib/haptics';
import { useProStore } from '@/store/pro';
import { buy, winbackOffering } from '@/services/purchases';
import type { PurchasesPackage } from 'react-native-purchases';

const ROWS = [
  'Les quatre apps, filtrées',
  'Blocage et mode strict',
  'Réglages app par app',
];

/**
 * L'offre de rattrapage, proposee UNE fois.
 *
 * Elle n'apparait que si l'achat a ete abandonne — la feuille d'Apple
 * refermee sans payer — et seulement si l'offre existe cote magasin. Sans
 * elle, on ne montre rien : annoncer un prix sur lequel l'achat echouerait
 * serait pire que de se taire.
 *
 * Elle se ferme des le premier appui : une seconde relance apres un refus
 * n'est plus une offre, c'est du harcelement.
 */
export function WinBack({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const [pack, setPack] = useState<PurchasesPackage | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    void winbackOffering().then((o) => setPack(o?.availablePackages?.[0] ?? null));
  }, [visible]);

  if (!visible || !pack) return null;

  const go = async () => {
    setBusy(true);
    const r = await buy(pack);
    setBusy(false);
    if (r === 'bought') useProStore.getState().setPro(true);
    // Achete ou non, on ne redemande pas.
    onClose();
  };

  return (
    <View style={st.root}>
      <LinearGradient
        colors={[c.accentDeep, c.accent, c.accentWarm]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View entering={FadeIn.duration(420)} style={st.body}>
        <Pressable onPress={() => { haptics.tap(); onClose(); }} hitSlop={16} style={st.close}>
          <X size={19} strokeWidth={2.4} color={c.night} />
        </Pressable>

        <View style={{ flex: 1 }} />

        <Text variant="label" color={withAlpha(c.night, 0.7)}>UNE SEULE FOIS</Text>
        <Text variant="displayL" color={c.night} style={st.title}>
          Prends-le à {pack.product.priceString}.
        </Text>
        <Text variant="lead" color={withAlpha(c.night, 0.78)} style={st.title}>
          La même année complète, au prix qu’on ne refait pas.
        </Text>

        <View style={st.list}>
          {ROWS.map((r) => (
            <View key={r} style={st.line}>
              <Check size={16} strokeWidth={3} color={c.night} />
              <Text variant="body" color={c.night}>{r}</Text>
            </View>
          ))}
        </View>

        <View style={{ flex: 1 }} />

        <Button
          label={busy ? 'Un instant…' : `Prendre l’offre · ${pack.product.priceString}`}
          disabled={busy}
          onPress={() => { void go(); }}
        />
        <Pressable onPress={() => { haptics.tap(); onClose(); }} style={st.later}>
          <Text variant="label" color={withAlpha(c.night, 0.7)}>Non merci</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200 },
  body: { flex: 1, paddingHorizontal: gutter, paddingTop: 72, paddingBottom: space.xl },
  close: {
    position: 'absolute', top: 18, right: gutter,
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: withAlpha(c.night, 0.12),
  },
  title: { marginTop: space.sm },
  list: { marginTop: space.xl, gap: space.md },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  later: { alignItems: 'center', paddingVertical: space.lg },
});
