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
  const re = eval(m![1]) as RegExp;
  expect(re.test('Story by inesvictoriaaaa, not seen')).toBe(true);
  expect(re.test('Histoire de Léa')).toBe(true);
  expect(re.test('History of France')).toBe(false);
});

/**
 * Instagram etiquette ses publications sponsorisees « Ad » en anglais, pas
 * « Sponsored ». Vu sur un fil reel : la regex ne reconnaissait que le mot
 * long et laissait passer toutes les publicites d'un compte en anglais.
 */
it('l’étiquette publicitaire reconnaît les formes courtes', () => {
  const m = CLIENTS.instagram.script.match(/const AD = (\/.*?\/i);/);
  expect(m).toBeTruthy();
  const re = eval(m![1]) as RegExp;
  for (const oui of ['Ad', 'Sponsored', 'Sponsorisé', 'Annonce', 'Publicité']) {
    expect(re.test(oui)).toBe(true);
  }
  // Et surtout, ce qu'elle ne doit PAS prendre : un prenom, une marque.
  for (const non of ['Adrien', 'Adidas', 'Adam', 'Addition']) {
    expect(re.test(non)).toBe(false);
  }
});
