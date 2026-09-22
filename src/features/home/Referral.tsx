import { useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Copy, Share2 } from 'lucide-react-native';
import { colors, withAlpha } from '@/theme/colors';
import { space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import { useOnboardingStore } from '@/store/onboarding';

const GOAL = 5;

/**
 * Interface complete. Le comptage est local : sans serveur, on ne peut pas
 * verifier qu'une inscription est reelle. Le jour ou un backend existe, seul
 * `joined` change de source.
 */
export function Referral() {
  const { d, t } = useT();
  const startedAt = useOnboardingStore((s) => s.startedAt);
  const [copied, setCopied] = useState(false);

  // Code stable, derive de la date de premiere ouverture.
  const code = useMemo(() => {
    const seed = startedAt ?? Date.now();
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let n = Math.floor(seed / 1000);
    let out = '';
    for (let i = 0; i < 6; i += 1) { out += A[n % A.length]; n = Math.floor(n / A.length) + 7; }
    return out;
  }, [startedAt]);

  const joined = 0; // TODO backend : nombre reel de filleuls
  const done = joined >= GOAL;

  return (
    <View style={st.card}>
      <Text variant="label" color={colors.accent}>{d.referral.title}</Text>
      <Text variant="body" tone="secondary" style={{ marginTop: space.sm }}>
        {d.referral.body}
      </Text>

      <Text variant="label" tone="tertiary" style={{ marginTop: space.lg }}>
        {d.referral.yourCode}
      </Text>
      <View style={st.codeRow}>
        <Text variant="displayM" style={st.code}>{code}</Text>
        <Pressable
          style={st.iconBtn}
          onPress={async () => {
            await Clipboard.setStringAsync(code);
            haptics.success();
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }}
        >
          <Copy size={18} strokeWidth={2} color={colors.night} />
        </Pressable>
        <Pressable
          style={st.iconBtn}
          onPress={() => {
            haptics.tap();
            void Share.share({ message: t(d.referral.shareText, { code }) });
          }}
        >
          <Share2 size={18} strokeWidth={2} color={colors.night} />
        </Pressable>
      </View>
      {copied && <Text variant="label" color={colors.accent}>{d.referral.copied}</Text>}

      <View style={st.bar}>
        {Array.from({ length: GOAL }, (_, i) => (
          <View key={i} style={[st.seg, i < joined && st.segOn]} />
        ))}
      </View>
      <Text variant="label" tone="secondary">
        {done ? d.referral.unlocked : t(d.referral.progress, { n: joined })}
      </Text>
    </View>
  );
}

const st = StyleSheet.create({
  card: {
    padding: space.lg, borderRadius: 18, gap: space.xs,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line,
  },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  code: { flex: 1, letterSpacing: 6 },
  iconBtn: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent,
  },
  bar: { flexDirection: 'row', gap: 5, marginTop: space.lg },
  seg: {
    flex: 1, height: 5, borderRadius: 3,
    backgroundColor: withAlpha(colors.mist, 0.12),
  },
  segOn: { backgroundColor: colors.accent },
});
