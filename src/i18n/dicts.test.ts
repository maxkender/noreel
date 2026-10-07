/**
 * Les six dictionnaires doivent se correspondre exactement.
 *
 * Le francais est la langue de reference : c'est celle qu'on ecrit d'abord,
 * et les autres suivent. Une cle ajoutee d'un seul cote ne fait pas tomber la
 * compilation — `Dict` est deduit du francais, et le francais est lu a
 * travers un cast — donc la seule chose qui puisse l'attraper est ce test.
 * Sans lui, une phrase ajoutee en francais s'affiche « undefined » a tous
 * ceux qui ont leur telephone dans une autre langue, et personne chez nous
 * ne le voit jamais.
 */
import { setLang } from '@/lib/format';
import { de } from './de';
import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { it as itDict } from './it';
import { tr } from './tr';
import { dict, interpolate, plural } from './index';

type Tree = Record<string, unknown>;

/** Tous les chemins de feuilles, a plat : « s6.activities.books.one ». */
function paths(node: unknown, prefix = ''): string[] {
  if (node === null || typeof node !== 'object') return [prefix];
  if (Array.isArray(node)) return [prefix];
  return Object.entries(node as Tree).flatMap(
    ([k, v]) => paths(v, prefix ? `${prefix}.${k}` : k)
  );
}

const ALL = { fr, en, de, tr, it: itDict, es } as const;
const inFr = paths(fr).sort();

describe('les dictionnaires', () => {
  it.each(Object.keys(ALL).filter((k) => k !== 'fr'))('%s a les mêmes clés que le français', (code) => {
    const other = paths(ALL[code as keyof typeof ALL]).sort();
    expect(inFr.filter((k) => !other.includes(k))).toEqual([]);
    expect(other.filter((k) => !inFr.includes(k))).toEqual([]);
  });

  /*
    Aucune valeur vide : une chaine vide ne se voit pas a la relecture, et a
    l'ecran elle donne un titre absent ou un bouton sans libelle.
  */
  it.each(Object.keys(ALL))('%s n’a aucune valeur vide', (code) => {
    const empty = (d: unknown, p = ''): string[] => {
      if (typeof d === 'string') return d.trim() ? [] : [p];
      if (d === null || typeof d !== 'object' || Array.isArray(d)) return [];
      return Object.entries(d as Tree).flatMap(([k, v]) => empty(v, p ? `${p}.${k}` : k));
    };
    expect(empty(ALL[code as keyof typeof ALL])).toEqual([]);
  });

  /*
    Les variables d'une phrase sont les memes dans toutes les langues : une
    traduction qui perd « {n} » afficherait une phrase sans son chiffre.
  */
  it.each(Object.keys(ALL).filter((k) => k !== 'fr'))('%s garde les variables du français', (code) => {
    const KNOWN = new Set(['n', 'm', 'y', 'h', 'p', 'i', 'a', 'b', 'total', 'age', 'name', 'lived', 'lost', 'ahead', 'what', 'duration', 'level', 'app', 'email', 'who', 'from', 'to', 'day', 'life', 'waking', 'accent']);
    const vars = (s: string) => (s.match(/\{([a-zA-Z]+)[:}]/g) ?? []).map((m) => m.slice(1, -1)).filter((v) => KNOWN.has(v)).sort().join(',');
    const flat = (d: unknown, p = ''): [string, string][] => {
      if (typeof d === 'string') return [[p, d]];
      if (d === null || typeof d !== 'object' || Array.isArray(d)) return [];
      return Object.entries(d as Tree).flatMap(([k, v]) => flat(v, p ? `${p}.${k}` : k));
    };
    const ref = new Map(flat(fr));
    const bad = flat(ALL[code as keyof typeof ALL])
      .filter(([k, v]) => ref.has(k) && vars(ref.get(k)!) !== vars(v))
      .map(([k]) => k);
    expect(bad).toEqual([]);
  });
});

describe('la langue courante', () => {
  afterEach(() => setLang('fr'));

  it('change ce que `dict` renvoie', () => {
    setLang('en');
    expect(dict.tuto.skip).toBe(en.tuto.skip);
    setLang('de');
    expect(dict.tuto.skip).toBe(de.tuto.skip);
  });

  it('écrit les pluriels à deux formes', () => {
    expect(interpolate('{n} giorn{s:o|i}', { n: 1, s: '' })).toBe('1 giorno');
    expect(interpolate('{n} giorn{s:o|i}', { n: 3, s: 's' })).toBe('3 giorni');
    expect(interpolate('{n} day{s}', { n: 3, s: 's' })).toBe('3 days');
  });

  it('met le zéro au singulier en français seulement', () => {
    setLang('fr');
    expect(plural(0, { one: 'un', other: 'plusieurs' })).toBe('un');
    setLang('en');
    expect(plural(0, { one: 'one', other: 'many' })).toBe('many');
  });
});
