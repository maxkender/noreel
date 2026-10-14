import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { BellRing, Check } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { gutter, space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { Button } from '@/components/Button';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import { alertsOn, disableAlerts, enableAlerts, readCounts, type EnableResult } from '@/services/igAlerts';

// La meme identite que la vue Instagram d'UnSwipe : la session ouverte ici est la sienne.
const UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) ' +
  'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

/**
 * Activer les alertes Instagram.
 *
 * Si la session d'UnSwipe est deja ouverte, on le dit et un bouton suffit.
 * Sinon, la page de connexion d'Instagram s'affiche ici meme : on se
 * connecte, puis on active. Le bouton reste en bas, toujours visible.
 */
export function InstagramAlerts() {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d } = useT();
  const router = useRouter();
  const [logged, setLogged] = useState<boolean | null>(null);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const check = useCallback(async () => {
    setLogged((await readCounts()) !== null);
  }, []);
  useEffect(() => {
    void readCounts().then((r) => setLogged(r !== null));
    void alertsOn().then(setOn);
  }, []);

  const words = { title: d.alerts.notifTitle, dm: d.alerts.notifDm, act: d.alerts.notifAct };
  const turnOn = async () => {
    haptics.press();
    setBusy(true);
    setNote(null);
    const r: EnableResult = await enableAlerts(words).catch(() => 'login' as const);
    setBusy(false);
    if (r === 'on') { haptics.success(); setOn(true); setLogged(true); return; }
    if (r === 'login') { setLogged(false); setNote(d.alerts.needLogin); return; }
    setNote(r === 'denied' ? d.alerts.denied : d.alerts.unavailable);
  };
  const turnOff = async () => {
    haptics.tap();
    await disableAlerts();
    setOn(false);
  };

  return (
    <View style={st.root}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <View style={st.top}>
          <Pressable onPress={() => { haptics.tap(); router.back(); }} hitSlop={12} style={st.cancel} accessibilityRole="button">
            <Text variant="label">{d.alerts.cancel}</Text>
          </Pressable>
          <Text variant="title" style={{ flex: 1 }} numberOfLines={1}>{d.alerts.title}</Text>
        </View>

        {logged === false && !on ? (
          <>
            <View style={st.banner}>
              <View style={[st.dot, { backgroundColor: c.accent }]} />
              <Text variant="body" style={{ flex: 1 }}>{d.alerts.intro}</Text>
            </View>
            <WebView
              source={{ uri: 'https://www.instagram.com/accounts/login/' }}
              userAgent={UA}
              sharedCookiesEnabled
              thirdPartyCookiesEnabled
              domStorageEnabled
              javaScriptEnabled
              originWhitelist={['http://*', 'https://*']}
              // Chaque page qui finit de charger peut etre celle d'apres la connexion.
              onLoadEnd={() => { void check(); }}
              style={{ flex: 1, backgroundColor: '#fff' }}
            />
          </>
        ) : (
          <View style={st.middle}>
            {logged === null && !on ? (
              <>
                <ActivityIndicator color={c.mist} />
                <Text variant="body" tone="secondary" style={st.center}>{d.alerts.checking}</Text>
              </>
            ) : (
              <>
                <View style={[st.badge, { backgroundColor: on ? c.accent : withAlpha(c.mist, 0.1) }]}>
                  {on
                    ? <Check size={34} strokeWidth={2.4} color={c.night} />
                    : <BellRing size={34} strokeWidth={1.8} color={c.mist} />}
                </View>
                <Text variant="displayM" style={st.center}>{on ? d.alerts.on : d.alerts.connected}</Text>
                <Text variant="body" tone="secondary" style={st.center}>{on ? d.alerts.enabled : d.alerts.intro}</Text>
              </>
            )}
          </View>
        )}

        <View style={st.foot}>
          {note ? <Text variant="label" color={c.ember} style={st.center}>{note}</Text> : null}
          <Text variant="label" tone="tertiary" style={st.center}>{d.alerts.delay}</Text>
          {on
            ? <Button label={d.alerts.turnOff} onPress={() => { void turnOff(); }} variant="ghost" />
            : <Button label={d.alerts.turnOn} onPress={() => { void turnOn(); }} disabled={busy || logged === null} />}
        </View>
      </SafeAreaView>
    </View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.night },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: gutter, paddingVertical: space.sm },
  cancel: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: c.glassSolid, borderWidth: 1, borderColor: c.glassEdge },
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: gutter, paddingVertical: space.md },
  dot: { width: 10, height: 10, borderRadius: 5 },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, paddingHorizontal: gutter },
  badge: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  center: { textAlign: 'center' },
  foot: { paddingHorizontal: gutter, paddingTop: space.md, paddingBottom: space.sm, gap: space.sm },
});
