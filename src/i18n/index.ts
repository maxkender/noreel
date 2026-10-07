import { useMemo } from 'react';
import { lang as current, type Lang } from '@/lib/format';
import { useLang } from '@/store/lang';
import { de } from './de';
import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { it } from './it';
import { tr } from './tr';
import type { Dict } from './fr';

const dicts: Record<Lang, Dict> = { fr: fr as unknown as Dict, en, de, tr, it, es };

/** Le dictionnaire d'une langue donnee, pour les tests et les apercus. */
export const dictOf = (l: Lang): Dict => dicts[l];

/*
 * `dict` suit la langue COURANTE.
 *
 * C'etait un objet choisi une fois a l'import ; changer de langue n'aurait
 * rien change avant un redemarrage. Chaque bloc est ici un accesseur qui lit
 * la langue du moment : `dict.ui.share` donne la phrase de la langue en cours,
 * ou qu'on l'appelle. Ce qu'il ne faut PAS faire, c'est en copier une valeur
 * dans une constante de module — elle serait figee a l'import, avant meme
 * que le disque ait dit quelle langue on veut.
 */
export const dict: Dict = {} as Dict;
for (const key of Object.keys(en) as (keyof Dict)[]) {
  Object.defineProperty(dict, key, {
    enumerable: true,
    get: () => dicts[current][key],
  });
}

export const lang = (): Lang => current;

type Vars = Record<string, string | number>;

/**
 * Remplace {clé} et le raccourci {nbsp}.
 *
 * Une cle peut porter deux formes, « {s:a|b} » : la premiere quand la valeur
 * est vide, la seconde sinon. C'est ce qui permet a l'italien d'ecrire
 * « giorn{s:o|i} » la ou le francais ecrit « jour{s} », avec le meme `s`.
 */
export function interpolate(template: string, vars?: Vars): string {
  let out = template.replace(/\{nbsp\}/g, ' ');
  if (!vars) return out;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{${k}:([^|}]*)\\|([^}]*)\\}`, 'g'), (_, a: string, b: string) => (v ? b : a));
    out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }
  return out;
}

export function plural(n: number, forms: { one: string; other: string }): string {
  // fr : 0 et 1 au singulier. Les autres : 1 seulement.
  const singular = current === 'fr' ? Math.abs(n) < 2 : Math.abs(n) === 1;
  return singular ? forms.one : forms.other;
}

/**
 * Le dictionnaire, depuis un composant.
 * S'abonne a la langue : en changer redessine tout ce qui passe par ici.
 */
export function useT() {
  const l = useLang((s) => s.lang);
  return useMemo(
    () => ({
      d: dicts[l],
      t: (template: string, vars?: Vars) => interpolate(template, vars),
      plural,
      lang: l,
    }),
    [l]
  );
}
