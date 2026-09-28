/**
 * Les teintes qu'on peut donner a une app filtree.
 *
 * Instagram publie toute sa palette en proprietes CSS personnalisees — des
 * triplets RGB nus, du genre « 12, 16, 20 », qu'il consomme en
 * rgb(var(--ig-primary-background)). Releve dans le navigateur sur le site
 * lui-meme : quatre-vingt-huit variables de ce format.
 *
 * C'est ce qui permet de recolorer proprement au lieu de bricoler un
 * hue-rotate sur toute la page : on remplace la valeur des variables d'accent
 * et rien d'autre ne bouge. Les photos gardent leurs couleurs, les textes
 * gardent leur contraste, et le jour ou Instagram change une variable on perd
 * la teinte sans rien casser.
 */

export type Tint = {
  id: string;
  label: string;
  /** La couleur, pour notre propre bandeau. */
  hex: string;
  /** Le meme, en triplet, pour les variables du site. */
  rgb: string;
  /**
   * Le texte a poser dessus. Calcule une fois ici plutot qu'a chaque rendu :
   * du gris a 50 % sur un vert sature ne se lit pas, et la regle « clair sur
   * fonce, fonce sur clair » se decide sur la luminance, pas a l'oeil.
   */
  ink: string;
};

/** Luminance relative, pour choisir une encre lisible. */
function ink(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  // Ponderation ITU-R BT.601 : l'oeil voit le vert bien plus que le bleu.
  return (r * 299 + g * 587 + b * 114) / 1000 > 140 ? '#0C1014' : '#FFFFFF';
}

function tint(id: string, label: string, hex: string): Tint {
  const n = parseInt(hex.slice(1), 16);
  return {
    id,
    label,
    hex,
    rgb: `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`,
    ink: ink(hex),
  };
}

/**
 * La premiere est celle du site : « aucune teinte » est un choix comme un
 * autre, et il doit etre le defaut.
 */
export const TINTS: Tint[] = [
  tint('default', 'D’origine', '#4A5DF9'),
  tint('green', 'Vert', '#1DB954'),
  tint('red', 'Rouge', '#E0245E'),
  tint('orange', 'Orange', '#F0842A'),
  tint('purple', 'Violet', '#8B5CF6'),
  tint('pink', 'Rose', '#EC4899'),
  tint('teal', 'Turquoise', '#0FB9B1'),
  tint('gold', 'Or', '#D4A24C'),
];

export const DEFAULT_TINT = TINTS[0];

export function tintById(id: string | undefined): Tint {
  return TINTS.find((t) => t.id === id) ?? DEFAULT_TINT;
}
