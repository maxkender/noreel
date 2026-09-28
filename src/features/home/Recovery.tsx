import { useCallback, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { captureRef } from 'react-native-view-shot';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import { CircleCheck, ShieldAlert, Trophy, X } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { gutter, space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { Button } from '@/components/Button';
import { haptics } from '@/lib/haptics';
import { dict, useT } from '@/i18n';
import {
  MINUTES_PER_SESSION, claimMilestone, stats, type Stats,
} from '@/services/protect';

/** Relit le registre a chaque retour sur l'ecran, et rend le palier atteint. */
export function useProtect() {
  const [s, setS] = useState<Stats | null>(null);
  const [prize, setPrize] = useState<{ kind: string; at: number } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void stats().then((x) => { if (alive) setS(x); });
      // Le palier est reclame ici et nulle part ailleurs : il est marque vu au
      // moment ou il est rendu, donc deux appels ne le feteraient pas deux fois.
      void claimMilestone().then((m) => { if (alive && m) setPrize(m); });
      return () => { alive = false; };
    }, [])
  );

  return { s, prize, clear: () => setPrize(null) };
}


function Figure({ label, value }: { label: string; value: string }) {
  // Le hook se lit DANS le composant, pas dans le callback du memo : appele
  // la, il ne serait plus rejoue quand la palette change, et la carte
  // garderait les couleurs du theme precedent.
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  return (
    <View style={st.figure}>
      <Text variant="title" numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text variant="label" tone="tertiary">{label}</Text>
    </View>
  );
}

/**
 * La note d'honnetete sous les chiffres.
 *
 * On ne voit pas combien de temps la personne aurait regarde — personne ne le
 * voit. Le temps repris est une estimation, et le multiplicateur est ecrit
 * noir sur blanc pour qu'on puisse refaire le calcul soi-meme. Un chiffre
 * qu'on ne peut pas verifier finit par decredibiliser tous les autres.
 */
export function ReclaimedNote({ s }: { s: Stats }) {
  const c = useColors();
  const { d, t } = useT();
  const st = useMemo(() => sheet(c), [c]);
  return (
    <Text variant="label" tone="tertiary" style={st.note}>
      {t(d.stats.estimate, { n: s.avoided, m: MINUTES_PER_SESSION })}
    </Text>
  );
}

/**
 * L'etat du filtre, dit a voix haute.
 *
 * C'est la panne silencieuse la plus couteuse : Instagram change sa structure,
 * une regle ne trouve plus rien, un reel passe — et la personne en conclut que
 * l'app est cassee et annule, sans jamais nous ecrire. Le dire ici, avec la
 * date, change une suspicion en information.
 */
export function ProtectionStatus({ s, onFix }: { s: Stats; onFix: () => void }) {
  const c = useColors();
  const { d } = useT();
  const st = useMemo(() => sheet(c), [c]);
  if (s.shaky) {
    return (
      <Pressable onPress={onFix} style={[st.line, st.lineWarn]}>
        <ShieldAlert size={15} strokeWidth={2.2} color={c.ember} />
        <Text variant="label" color={c.ember} style={{ flex: 1 }}>
          {d.stats.shaky}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={[st.line, st.lineOk]}>
      <CircleCheck size={15} strokeWidth={2.2} color={c.accent} />
      <Text variant="label" tone="secondary" style={{ flex: 1 }}>
        {s.fresh ? d.stats.activeToday : d.stats.active}
      </Text>
    </View>
  );
}

/** Les paliers et leurs mots. Lus dans le dictionnaire, pas ecrits ici. */
const WORDS: Record<string, ['m7' | 'm30' | 'm100' | 'm1000', 'm7b' | 'm30b' | 'm100b' | 'm1000b']> = {
  'days:7': ['m7', 'm7b'],
  'days:30': ['m30', 'm30b'],
  'days:100': ['m100', 'm100b'],
  'reels:1000': ['m1000', 'm1000b'],
};

/**
 * Le palier, et sa carte a partager.
 *
 * La carte est capturee telle qu'elle est a l'ecran plutot que redessinee
 * pour l'export : deux dessins d'une meme chose finissent toujours par
 * diverger, et c'est l'exporte qu'on ne regarde jamais.
 */
export function Milestone({
  prize, days, blocked, onClose,
}: {
  prize: { kind: string; at: number };
  days: number;
  blocked: number;
  onClose: () => void;
}) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const card = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const id = `${prize.kind}:${prize.at}`;
  const keys = WORDS[id];
  const title = keys ? dict.stats[keys[0]] : dict.stats.milestone;
  const body = keys ? dict.stats[keys[1]] : '';

  const share = async () => {
    setBusy(true);
    try {
      const uri = await captureRef(card, { format: 'png', quality: 1, result: 'tmpfile' });
      await Share.share({ url: uri });
    } catch {
      // Le partage peut echouer (permission, disque) : le palier reste acquis.
    }
    setBusy(false);
  };

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} transparent>
      <View style={st.scrim}>
        <SafeAreaView style={st.sheet}>
          <Pressable onPress={onClose} hitSlop={16} style={st.close}>
            <X size={18} strokeWidth={2.2} color={withAlpha(c.mist, 0.6)} />
          </Pressable>

          <Animated.View entering={FadeIn.duration(420)} ref={card} style={st.prize}>
            <LinearGradient
              colors={[withAlpha(c.accent, 0.22), withAlpha(c.accentWarm, 0.08)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={st.trophy}>
              <Trophy size={26} strokeWidth={1.8} color={c.accent} />
            </View>
            <Text variant="displayM" style={st.mid}>{title}</Text>
            <Text variant="body" tone="secondary" style={st.mid}>{body}</Text>
            <View style={st.prizeRow}>
              <Figure label={dict.stats.daysKept} value={`${days} j`} />
              <Figure label={dict.stats.reelsAvoided} value={String(blocked)} />
            </View>
            <Text variant="label" tone="tertiary">UNSWIPE</Text>
          </Animated.View>

          <View style={st.prizeBtns}>
            <Button
              label={busy ? dict.pay.wait : dict.stats.share}
              onPress={() => { haptics.press(); void share(); }}
              disabled={busy}
            />
            <Button label={dict.stats.later} onPress={onClose} variant="ghost" />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  card: {
    alignItems: 'center', gap: space.sm,
    paddingHorizontal: space.lg, paddingVertical: space.xl,
    marginTop: space.lg,
  },
  gaugeRow: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    alignSelf: 'stretch', marginTop: space.md,
  },
  gauge: {
    flex: 1, height: 8, borderRadius: 4, overflow: 'hidden',
    backgroundColor: withAlpha(c.mist, 0.1),
  },
  gaugeFill: { height: 8, borderRadius: 4 },
  figures: {
    flexDirection: 'row', alignSelf: 'stretch', justifyContent: 'space-between',
    marginTop: space.lg,
  },
  figure: { gap: 1, alignItems: 'center' },
  note: { marginTop: space.sm, lineHeight: 16 },
  line: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm,
    marginTop: space.md, paddingHorizontal: space.md, paddingVertical: 10,
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
  },
  lineOk: { borderColor: withAlpha(c.accent, 0.3), backgroundColor: withAlpha(c.accent, 0.07) },
  lineWarn: { borderColor: withAlpha(c.ember, 0.45), backgroundColor: withAlpha(c.ember, 0.1) },
  scrim: { flex: 1, backgroundColor: withAlpha(c.night, 0.9) },
  sheet: { flex: 1, justifyContent: 'center', paddingHorizontal: gutter },
  close: { position: 'absolute', top: space.lg, right: 0, padding: space.sm },
  prize: {
    alignItems: 'center', gap: space.sm, overflow: 'hidden',
    paddingHorizontal: space.lg, paddingVertical: space.xl, borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(c.accent, 0.4),
    backgroundColor: c.surface,
  },
  trophy: {
    width: 58, height: 58, borderRadius: 29, marginBottom: space.sm,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: withAlpha(c.accent, 0.45),
    backgroundColor: withAlpha(c.accent, 0.1),
  },
  mid: { textAlign: 'center' },
  prizeRow: { flexDirection: 'row', gap: space.xl, marginTop: space.md, marginBottom: space.sm },
  prizeBtns: { marginTop: space.lg, gap: space.xs },
});
