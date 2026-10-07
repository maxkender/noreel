import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollView, View } from 'react-native';

/*
 * Les ANCRES de la visite guidee.
 *
 * La visite ne dessine plus une page a elle : elle eclaire les vrais
 * elements de l'onglet, la ou ils sont. Pour ca, chaque element qu'elle
 * peut montrer s'inscrit ici sous un nom, et la visite le mesure a l'ecran
 * au moment de l'eclairer. Un element absent — un badge deja range — n'est
 * pas une erreur : l'etape le dit ou passe son tour.
 */
export type Rect = { x: number; y: number; w: number; h: number };

const anchors = new Map<string, RefObject<View | null>>();

/** La reference a poser sur la vue a eclairer, avec `collapsable={false}`. */
export function useAnchor(id: string) {
  const ref = useRef<View>(null);
  useEffect(() => {
    anchors.set(id, ref);
    return () => { if (anchors.get(id) === ref) anchors.delete(id); };
  }, [id]);
  return ref;
}

/** La position a l'ecran, ou rien si l'element n'est pas la. */
export function measureAnchor(id: string): Promise<Rect | null> {
  return new Promise((resolve) => {
    const node = anchors.get(id)?.current;
    if (!node || typeof node.measureInWindow !== 'function') { resolve(null); return; }
    let done = false;
    // Sous Jest la mesure ne repond jamais : on n'attend pas pour rien.
    const timer = setTimeout(() => { if (!done) { done = true; resolve(null); } }, 300);
    node.measureInWindow((x, y, w, h) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(w > 0 && h > 0 ? { x, y, w, h } : null);
    });
  });
}

/*
 * Les listes des onglets, pour amener un element dans le champ.
 * On garde la position de chacune au fil du defilement : c'est ce qui permet
 * de la deplacer d'un ecart connu, sans rien demander au natif.
 */
type Scroller = { ref: RefObject<ScrollView | null>; offset: number };
const scrollers = new Map<string, Scroller>();

export function useTourScroll(tab: string): [RefObject<ScrollView | null>, (e: NativeSyntheticEvent<NativeScrollEvent>) => void] {
  const ref = useRef<ScrollView>(null);
  const reg = useRef<Scroller>({ ref, offset: 0 });
  useEffect(() => {
    scrollers.set(tab, reg.current);
    return () => { if (scrollers.get(tab) === reg.current) scrollers.delete(tab); };
  }, [tab]);
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    reg.current.offset = e.nativeEvent.contentOffset.y;
  }, []);
  return [ref, onScroll];
}

/** Fait defiler la liste de l'onglet de `dy`. Vrai si une liste a repondu. */
export function scrollTabBy(tab: string, dy: number): boolean {
  const s = scrollers.get(tab);
  const node = s?.ref.current;
  if (!s || !node || typeof node.scrollTo !== 'function') return false;
  const y = Math.max(0, s.offset + dy);
  if (Math.abs(y - s.offset) < 1) return false;
  node.scrollTo({ y, animated: true });
  s.offset = y;
  return true;
}
