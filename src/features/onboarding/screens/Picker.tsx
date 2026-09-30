import { useMemo, useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AlertTriangle } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { useT } from '@/i18n';
import { Text } from '@/components/type/Text';
// Le paquet fournit une version neutre hors iOS : un import statique est
// donc sans risque, et il evite un require() au milieu du rendu.
import DeviceActivitySelectionView from 'react-native-device-activity/build/DeviceActivitySelectionView';
import { useSettings } from '@/store/settings';
import {
  FAMILY_CONTROLS_ENABLED, authorizationStatus, requestAuthorization,
} from '@/services/shield.real';
import { applySelection } from '@/services/selection';

type P = { onNext: () => void };

/**
 * Le selecteur d'Apple, en entier.
 *
 * On ne peut pas lire ce qu'il contient : la selection est chiffree et
 * n'existe que pour le systeme. Apple ne nous donne que des compteurs — et
 * c'est avec eux qu'on avertit, parce que cocher une categorie entiere
 * emporte des apps auxquelles personne ne pense.
 */
export function Picker({ onNext }: P) {
  const { d, t } = useT();
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const saved = useSettings((s) => s.selection);
  const set = useSettings((s) => s.set);
  const [counts, setCounts] = useState({ apps: 0, cats: 0, webs: 0, whole: false });
  // Sans autorisation Temps d'ecran, le selecteur d'Apple s'affiche VIDE :
  // on voyait un cadre gris et rien d'autre, sans savoir pourquoi.
  const [auth, setAuth] = useState<string>('notDetermined');
  useEffect(() => { void authorizationStatus().then(setAuth); }, []);

  if (FAMILY_CONTROLS_ENABLED && Platform.OS === 'ios' && auth !== 'approved') {
    return (
      <Screen
        cta={d.picker.authorize}
        onPress={() => { void requestAuthorization().then(setAuth); }}
        secondary={d.rate.later}
        onSecondary={onNext}
        center
        hue="accent"
      >
        <Text variant="displayM" style={st.center}>{d.picker.choose}</Text>
        <Text variant="lead" tone="secondary" style={[st.center, { marginTop: space.md }]}>
          {d.ui.pickerNeedsAccess}
        </Text>
      </Screen>
    );
  }

  if (!FAMILY_CONTROLS_ENABLED || Platform.OS !== 'ios') {
    return (
      <Screen cta={d.ob.keepGoing} onPress={onNext} center hue="accent">
        <Text variant="displayM" style={st.center}>{d.picker.choose}</Text>
        <Text variant="lead" tone="secondary" style={[st.center, { marginTop: space.md }]}>
          {d.ui.pickerSoon}
        </Text>
      </Screen>
    );
  }

  return (
    <Screen cta={d.ob.keepGoing} onPress={onNext} hue="accent">
      <Text variant="displayM">{d.picker.choose}</Text>
      {/*
        Des APPS, et rien d'autre.
        Le selecteur d'Apple propose aussi des categories et des sites web.
        Or le blocage d'une categorie ou d'un site s'applique a TOUTES les
        vues web du telephone, la notre comprise : instagram.com ne se
        chargeait plus dans UnSwipe, avec « bloque par un filtre de contenu ».
        Une app cochee ne bloque que l'app.
      */}
      <Text variant="lead" tone="secondary" style={{ marginTop: space.sm }}>
        {d.picker.appsOnly}
      </Text>

      <View style={st.picker}>
        <DeviceActivitySelectionView
          style={StyleSheet.absoluteFill}
          familyActivitySelection={saved}
          onSelectionChange={(e: { nativeEvent: {
            familyActivitySelection: string | null;
            applicationCount: number;
            categoryCount: number;
            webDomainCount: number;
            includeEntireCategory: boolean;
          } }) => {
            const v = e.nativeEvent;
            setCounts({
              apps: v.applicationCount,
              cats: v.categoryCount,
              webs: v.webDomainCount ?? 0,
              whole: v.includeEntireCategory,
            });
            set('selection', v.familyActivitySelection);
            // On n'applique que si le blocage est deja arme : choisir des
            // apps ne doit pas les bloquer a l'insu de l'utilisateur.
            if (useSettings.getState().blocking) applySelection(v.familyActivitySelection);
          }}
        />
      </View>

      {(counts.cats > 0 || counts.webs > 0) && (
        <Animated.View entering={FadeIn.duration(320)} style={st.warn}>
          <AlertTriangle size={16} strokeWidth={2.2} color={c.danger} />
          <Text variant="label" color={c.danger} style={{ flex: 1, lineHeight: 17 }}>
            {counts.cats > 0 ? d.picker.catWarn : d.picker.webWarn}
          </Text>
        </Animated.View>
      )}

      {counts.apps > 0 && counts.cats === 0 && counts.webs === 0 && (
        <Text variant="label" tone="tertiary" style={{ marginTop: space.md }}>
          {t(d.picker.selected, { n: counts.apps, s: counts.apps > 1 ? 's' : '' })}
        </Text>
      )}
    </Screen>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  center: { textAlign: 'center' },
  picker: {
    height: 380, marginTop: space.lg, borderRadius: 20, overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(c.mist, 0.14),
  },
  warn: {
    flexDirection: 'row', alignItems: 'flex-start', gap: space.sm,
    marginTop: space.md, padding: space.md, borderRadius: 14,
    backgroundColor: withAlpha(c.danger, 0.1),
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(c.danger, 0.35),
  },
});
