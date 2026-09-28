/**
 * Le rig monte, a tous les niveaux et dans toutes ses poses.
 *
 * Quarante-trois calques empiles, trois etages de transformation et des
 * calques qui n'existent que pour certains niveaux : c'est exactement le genre
 * de composant qui tombe sur un `undefined` au montage sans qu'aucun typage ne
 * l'ait vu venir — `ARMS[pose][0]` est nul pour le niveau 0, et le niveau 0
 * n'a ni bras, ni pieds, ni aura.
 */
import { act, render } from '@testing-library/react-native';
import { CortiRig, cortiReact, type CortiPose } from './CortiRig';
import type { CortiLevel } from './Corti';

const LEVELS: CortiLevel[] = [0, 1, 2, 3];
const POSES: CortiPose[] = ['idle', 'wave', 'up', 'sit', 'sleep', 'float'];

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('monte a chacun des quatre niveaux', () => {
  for (const level of LEVELS) {
    const r = render(<CortiRig level={level} />);
    expect(r.toJSON()).toBeTruthy();
    r.unmount();
  }
});

it('monte dans chaque pose, a chaque niveau', () => {
  // La pose choisit quels calques existent : assise et flottante retirent les
  // pieds et l'ombre, endormie remplace les yeux et ajoute les zzz.
  for (const level of LEVELS) {
    for (const pose of POSES) {
      const r = render(<CortiRig level={level} pose={pose} />);
      expect(r.toJSON()).toBeTruthy();
      r.unmount();
    }
  }
});

it('joue chaque reaction sans tomber', () => {
  for (const kind of ['tap', 'no', 'wave', 'celebrate', 'hop', 'rise', 'collapse'] as const) {
    const r = render(<CortiRig level={2} reaction={cortiReact(kind)} />);
    act(() => { jest.advanceTimersByTime(2500); });
    expect(r.toJSON()).toBeTruthy();
    r.unmount();
  }
});

it('ne rejoue pas la meme demande deux fois', () => {
  // L'identifiant est ce qui declenche : re-rendre avec le MEME objet ne doit
  // rien relancer, sinon la moindre mise a jour du parent fait secouer Corti.
  const same = cortiReact('no');
  const r = render(<CortiRig level={2} reaction={same} />);
  r.rerender(<CortiRig level={2} reaction={same} />);
  act(() => { jest.advanceTimersByTime(2000); });
  expect(r.toJSON()).toBeTruthy();
});

it('ne laisse aucun minuteur derriere lui', () => {
  // Le clignement, le regard et le saut bouclent sans fin : demontes sans
  // menage, ils rappellent setState sur un composant disparu.
  const r = render(<CortiRig level={3} reaction={cortiReact('celebrate')} />);
  act(() => { jest.advanceTimersByTime(1000); });
  r.unmount();
  expect(() => act(() => { jest.advanceTimersByTime(20000); })).not.toThrow();
});

it('se tient tranquille quand on le lui demande', () => {
  const r = render(<CortiRig level={3} animated={false} />);
  expect(() => act(() => { jest.advanceTimersByTime(20000); })).not.toThrow();
  expect(r.toJSON()).toBeTruthy();
});
