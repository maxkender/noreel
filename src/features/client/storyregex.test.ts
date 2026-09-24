import { CLIENTS } from './blockers';

/**
 * Un \b ecrit simplement dans un litteral de gabarit devient un caractere
 * d'effacement : la regex compile, mais ne reconnait plus rien. Le fichier
 * documentait deja le piege pour \/ ; il se repose a chaque nouvelle regex.
 */
it('les ancres de mot survivent au gabarit', () => {
  const src = CLIENTS.instagram.script;
  const m = src.match(/const STORY = (\/.*?\/i);/);
  expect(m).toBeTruthy();
  // eslint-disable-next-line no-eval
  const re = eval(m![1]) as RegExp;
  expect(re.test('Story by inesvictoriaaaa, not seen')).toBe(true);
  expect(re.test('Histoire de Léa')).toBe(true);
  expect(re.test('History of France')).toBe(false);
});
