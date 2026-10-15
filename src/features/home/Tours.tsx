import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Spotlight, type SpotStep } from '@/components/Spotlight';
import { useT } from '@/i18n';
import { markTourSeen, tourSeen, type TourId } from './tourSeen';

/*
 * La visite guidee des trois onglets : Applis, Corti, Blocage.
 *
 * Elle se joue PAR-DESSUS l'onglet, la premiere fois qu'on y arrive, et
 * eclaire tour a tour les vrais elements de la page — l'icone qu'on tape, la
 * jauge, l'interrupteur. Une phrase par element. Puis plus jamais, sauf si
 * on la redemande (« Comment ca marche ? » sur Corti). Rien sur le compte :
 * il n'y a rien a y apprendre.
 */
export function TabTour({
  tab, replay, onDone,
}: {
  tab: TourId | 'account';
  /** Rejouer une visite deja vue : un compteur, qui change a chaque demande. */
  replay?: { id: TourId; n: number } | null;
  onDone: () => void;
}) {
  const { d } = useT();
  // Ce qu'on sait du disque, onglet par onglet : rien, vue, pas vue.
  const [seen, setSeen] = useState<Partial<Record<TourId, boolean>>>({});
  useEffect(() => {
    if (tab === 'account' || seen[tab] !== undefined) return;
    let alive = true;
    void tourSeen(tab).then((v) => { if (alive) setSeen((x) => ({ ...x, [tab]: v })); });
    return () => { alive = false; };
  }, [tab, seen]);

  // La visite ne se lance d'elle-meme QUE sur l'accueil : trois etapes, et c'est tout.
  const show: TourId | null = replay ? replay.id : (tab === 'home' && seen[tab] === false ? tab : null);
  if (!show) return null;
  const done = () => {
    void markTourSeen(show);
    setSeen((x) => ({ ...x, [show]: true }));
    onDone();
  };

  const steps: Record<TourId, SpotStep[]> = {
    home: [
      { target: 'home-apps', title: d.tour.h1, body: d.tour.h1b },
      { target: ['home-open', 'home-apps'], title: d.tour.h2, body: d.tour.h2b },
      { target: ['home-blockReal', 'nav-block'], title: d.tour.h4, body: d.tour.h4b, optional: true },
    ],
    block: [
      { target: 'block-status', title: d.tour.b1, body: d.tour.b1b },
      { target: 'block-btn', title: d.tour.b2, body: d.tour.b2b },
      { target: 'block-btn', title: d.tour.b3, body: d.tour.b3b },
      { target: 'block-strict', title: d.tour.b4, body: d.tour.b4b, optional: true },
    ],
  };

  return (
    <View style={StyleSheet.absoluteFill} testID={`tour-${show}`}>
      <Spotlight key={`${show}-${replay?.n ?? 0}`} tab={show} steps={steps[show]} onDone={done} testID={`story-${show}`} />
    </View>
  );
}
