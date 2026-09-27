/*
 * Les icones, remplacees par des vues vides.
 *
 * lucide-react-native ne publie que des modules ES que Jest ne transforme pas,
 * et la bibliotheque exporte plus de mille icones : les faire passer par le
 * transformeur coute plusieurs secondes par fichier de test pour des dessins
 * dont aucun test ne regarde la forme. Un mandataire repond a n'importe quel
 * nom d'icone, donc ce fichier n'a pas a etre tenu a jour.
 *
 * Il est dans __mocks__ a la racine : Jest s'en sert automatiquement pour un
 * paquet de node_modules, sans qu'un test ait a le demander.
 */
const React = require('react');

const Icon = () => null;

module.exports = new Proxy(
  {},
  {
    get: (_t, name) => {
      // Ces deux-la sont interroges par l'interoperabilite des modules, pas
      // par le code qui dessine : repondre une icone les ferait mentir.
      if (name === '__esModule') return true;
      if (typeof name === 'symbol') return undefined;
      return Icon;
    },
  }
);

// `React` est requis pour que le module soit reconnu comme un module React ;
// le garder nomme evite un avertissement de variable inutilisee.
void React;
