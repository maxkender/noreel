import { useEffect, useRef } from 'react';
import {
  Animated, Modal, Pressable, StyleSheet, Text, View,
} from 'react-native';
import { T } from './theme';

const ITEMS = [
  { key: 'home',     label: 'Fil',       path: '/' },
  { key: 'search',   label: 'Recherche', path: '/explore/' },
  { key: 'messages', label: 'Messages',  path: '/direct/inbox/' },
  { key: 'profile',  label: 'Profil',    path: '/accounts/activity/' },
];

export default function NavSheet({ visible, onClose, onNavigate, onReload }) {
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: visible ? 1 : 0, duration: 220, useNativeDriver: true,
    }).start();
  }, [visible, slide]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [260, 0] }) }] },
          ]}
        >
          <View style={styles.grip} />

          {ITEMS.map(it => (
            <Pressable
              key={it.key}
              style={styles.row}
              onPress={() => { onNavigate(it.path); onClose(); }}
            >
              <Text style={styles.rowText}>{it.label}</Text>
            </Pressable>
          ))}

          <View style={styles.sep} />

          <Pressable style={styles.row} onPress={() => { onReload(); onClose(); }}>
            <Text style={[styles.rowText, { color: T.dim }]}>Recharger</Text>
          </Pressable>

          <Text style={styles.footer}>Reels bloqués · ReelsFree</Text>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: '#000000A0', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: T.bgSoft, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 34,
  },
  grip: {
    width: 38, height: 4, borderRadius: 2, backgroundColor: T.line,
    alignSelf: 'center', marginBottom: 10,
  },
  row: { paddingVertical: 15, paddingHorizontal: 8 },
  rowText: { color: T.text, fontSize: 16, fontWeight: '600' },
  sep: { height: 1, backgroundColor: T.line, marginVertical: 6 },
  footer: {
    color: T.dim, fontSize: 11, textAlign: 'center', marginTop: 12,
    letterSpacing: 0.6,
  },
});
