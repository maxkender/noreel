import { combine } from './realtime';

/*
 * Le seul chiffre que les gens viennent verifier.
 *
 * Apple ne donne pas le temps passe dans les vraies apps — le rapport de
 * Temps d'ecran vit dans une extension isolee et ses nombres ne traversent
 * jamais. Il accepte seulement de prevenir quand un seuil est franchi. Ce
 * qu'on en tire est donc une BORNE BASSE, et tout l'enjeu est de ne jamais
 * la presenter comme un total.
 */
describe('le temps du jour, mis bout a bout', () => {
  it('n’invente rien quand iOS ne dit rien', () => {
    // Pas d'autorisation, pas de selection, pas d'entitlement : on affiche ce
    // qu'on a mesure nous-memes, et on ne prefixe surtout pas d'« au moins ».
    expect(combine(42, null)).toEqual({
      filtered: 42, realFloor: null, total: 42, atLeast: false,
    });
  });

  it('additionne le palier et le dit', () => {
    const r = combine(12, 30);
    expect(r.total).toBe(42);
    expect(r.atLeast).toBe(true);
  });

  it('ne dit pas « au moins » quand aucun palier n’a sonne', () => {
    /*
      Zero n'est pas une borne basse utile : personne n'a franchi le premier
      seuil. « Au moins 12 min » alors qu'on en a mesure exactement 12 se lit
      comme une precaution inutile, et une precaution inutile use la confiance
      qu'on veut garder pour les vraies.
    */
    const r = combine(12, 0);
    expect(r.total).toBe(12);
    expect(r.atLeast).toBe(false);
  });
});
