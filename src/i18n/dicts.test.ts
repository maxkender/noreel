/**
 * Les deux dictionnaires doivent se correspondre exactement.
 *
 * Le francais est la langue de reference : c'est celle qu'on ecrit d'abord,
 * et l'anglais suit. Une cle ajoutee d'un seul cote ne fait pas tomber la
 * compilation — `Dict` est deduit du francais, et l'anglais est lu a travers
 * un cast — donc la seule chose qui puisse l'attraper est ce test. Sans lui,
 * une phrase ajoutee en francais s'affiche « undefined » a tous ceux qui ont
 * leur telephone en anglais, et personne chez nous ne le voit jamais.
 */
import { en } from './en';
import { fr } from './fr';

type Tree = Record<string, unknown>;

/** Tous les chemins de feuilles, a plat : « s6.activities.books.one ». */
function paths(node: unknown, prefix = ''): string[] {
  if (node === null || typeof node !== 'object') return [prefix];
  if (Array.isArray(node)) return [prefix];
  return Object.entries(node as Tree).flatMap(
    ([k, v]) => paths(v, prefix ? `${prefix}.${k}` : k)
  );
}

const inFr = paths(fr).sort();
const inEn = paths(en).sort();

describe('les dictionnaires', () => {
  it('ont les mêmes clés en français et en anglais', () => {
    expect(inFr.filter((k) => !inEn.includes(k))).toEqual([]);
    expect(inEn.filter((k) => !inFr.includes(k))).toEqual([]);
  });

  /*
    Aucune valeur vide : une chaine vide ne se voit pas a la relecture, et a
    l'ecran elle donne un titre absent ou un bouton sans libelle.
  */
  it('n’ont aucune valeur vide', () => {
    const empty = (d: unknown, p = ''): string[] => {
      if (typeof d === 'string') return d.trim() ? [] : [p];
      if (d === null || typeof d !== 'object' || Array.isArray(d)) return [];
      return Object.entries(d as Tree).flatMap(([k, v]) => empty(v, p ? `${p}.${k}` : k));
    };
    expect(empty(fr)).toEqual([]);
    expect(empty(en)).toEqual([]);
  });
});
