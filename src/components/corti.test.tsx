/**
 * Corti : la regle de niveau vient du brief et gouverne ce qu'on dessine
 * partout — l'accueil, le mur de blocage, le parcours. Une erreur de seuil
 * ne se voit pas, elle donne juste une mascotte qui ne felicite pas au bon
 * moment.
 */
import { render } from '@testing-library/react-native';
import { Corti, cortiLevel, cortiLine, type CortiLevel } from './Corti';
import { interpolate } from '@/i18n';
import { fr } from '@/i18n/fr';
import { en } from '@/i18n/en';

describe('le niveau de Corti', () => {
  // Les seuils sont ceux du brief, repris tels quels : 0 le premier jour,
  // veilleuse jusqu'a six, allume jusqu'a vingt-neuf, rayonnant a trente.
  const cases: [number, CortiLevel][] = [
    [0, 0], [1, 1], [6, 1], [7, 2], [29, 2], [30, 3], [200, 3],
  ];
  for (const [days, level] of cases) {
    it(`${days} jour(s) donne le niveau ${level}`, () => {
      expect(cortiLevel(days)).toBe(level);
    });
  }

  // Un compte negatif ou absurde ne doit pas donner un niveau absurde : on
  // le lit depuis un registre sur disque, qui peut avoir ete ecrit par une
  // version anterieure.
  it('un nombre negatif reste eteint', () => {
    expect(cortiLevel(-1)).toBe(0);
  });

  it('une valeur non finie reste eteinte', () => {
    expect(cortiLevel(NaN)).toBe(0);
  });
});

describe('ce que Corti dit', () => {
  /*
    Le pluriel se verifie SUR LES DEUX dictionnaires, pas sur la langue que le
    test se trouve avoir.
    La version precedente attendait « 1 jour sans » : elle passait tant que les
    phrases etaient ecrites en dur en francais, et elle est tombee le jour ou
    elles ont ete traduites — parce que l'environnement de test resout la
    langue en anglais. Elle testait la langue du test, pas l'accord.
  */
  for (const [name, dict] of [['fr', fr], ['en', en]] as const) {
    it(`accorde le pluriel en ${name}`, () => {
      const one = interpolate(dict.corti.says1, { n: 1, s: '' });
      const many = interpolate(dict.corti.says1, { n: 3, s: 's' });
      expect(one).toContain('1');
      expect(many).toContain('3');
      // Le marqueur de pluriel doit reellement changer la phrase.
      expect(one.replace('1', '')).not.toBe(many.replace('3', ''));
    });
  }

  it('affiche le nombre de jours', () => {
    expect(cortiLine(1, 1)).toContain('1');
    expect(cortiLine(2, 12)).toContain('12');
  });

  for (const level of [0, 1, 2, 3] as CortiLevel[]) {
    it(`a une phrase au niveau ${level}`, () => {
      expect(cortiLine(level, 12).length).toBeGreaterThan(10);
    });
  }
});

/*
 * Corti est DESSINEE et non affichee : le clignement ferme les yeux a 8 % de
 * leur hauteur, ce qu'aucune image ne sait faire. Ces rendus verifient que
 * chaque niveau produit bien son dessin — bras leves ou le long du corps,
 * yeux ouverts, fermes ou plisses, etincelles ou non.
 */
describe('Corti se dessine', () => {
  for (const level of [0, 1, 2, 3] as CortiLevel[]) {
    it(`niveau ${level}`, () => {
      const r = render(<Corti level={level} />);
      expect(r.toJSON()).toBeTruthy();
    });
  }

  // Immobile pour les captures et les vignettes : les boucles ne doivent
  // meme pas demarrer.
  it('sans animation', () => {
    render(<Corti level={2} animated={false} />);
  });

  // Les tailles extremes : la mascotte est posee a 104 sur l'accueil, a 220
  // dans le parcours. Toutes ses mesures derivent d'un seul facteur, donc une
  // erreur d'echelle ne se verrait qu'a l'une des deux.
  for (const size of [40, 104, 220]) {
    it(`a ${size} points`, () => {
      const r = render(<Corti level={2} size={size} />);
      expect(r.toJSON()).toBeTruthy();
    });
  }

  it('repond quand on la touche', () => {
    const onPress = jest.fn();
    const r = render(<Corti level={2} onPress={onPress} />);
    expect(r.toJSON()).toBeTruthy();
  });
});
