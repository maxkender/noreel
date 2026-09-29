/**
 * La machine a ecrire ne change JAMAIS les retours a la ligne.
 *
 * Elle posait le texte complet en transparent pour tenir la hauteur, puis
 * ecrivait le texte visible par-dessus — et ce texte-la, plus court, se
 * coupait a sa facon : le dernier mot d'une ligne sautait a la suivante au
 * moment ou il se terminait. On voyait le texte se reorganiser pendant
 * qu'on le lisait.
 *
 * Le seul moyen de le garantir est qu'il n'y ait qu'UN texte, toujours
 * complet, dont la partie pas encore ecrite est transparente. Ce test lit
 * donc la chaine rendue a chaque instant : si elle n'est pas le texte entier,
 * la mise en page peut bouger.
 */
import { act, render } from '@testing-library/react-native';
import { Typewriter, typeDuration } from './Typewriter';

/** Tout le texte present dans l'arbre, dans l'ordre, sans le curseur. */
function rendered(tree: unknown): string {
  const out: string[] = [];
  const walk = (n: unknown) => {
    if (typeof n === 'string') out.push(n);
    else if (Array.isArray(n)) n.forEach(walk);
    else if (n && typeof n === 'object' && 'children' in n) walk((n as { children: unknown }).children);
  };
  walk(tree);
  return out.join('').replace('|', '');
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('rend le texte ENTIER a chaque instant de la frappe', () => {
  const text = 'Voici la part de ton temps éveillé passée sur un écran.';
  const r = render(<Typewriter text={text} speed={10} cursor={false} />);

  // Avant la premiere lettre, apres trois, au milieu, a la fin : toujours
  // la chaine complete dans l'arbre. Seule la couleur change.
  const checkpoints = [0, 30, 200, typeDuration(text, 10) + 50];
  let at = 0;
  for (const ms of checkpoints) {
    act(() => { jest.advanceTimersByTime(ms - at); });
    at = ms;
    expect(rendered(r.toJSON())).toBe(text);
  }
});

it('ne compte pas les accolades du balisage', () => {
  // « {temps éveillé} » se lit « temps éveillé » : la duree et la frappe
  // portent sur ce qui s'affiche, pas sur les accolades.
  expect(typeDuration('a {bc} d', 10, 0)).toBe(60);
  const r = render(<Typewriter text="a {bc} d" speed={10} cursor={false} />);
  act(() => { jest.advanceTimersByTime(1000); });
  expect(rendered(r.toJSON())).toBe('a bc d');
});
