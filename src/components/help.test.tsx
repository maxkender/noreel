/**
 * L'aide se replie, et n'en montre qu'une a la fois.
 *
 * Tout deplier redonne la page de texte qu'on voulait eviter : l'interet de
 * la liste est qu'on voie les QUESTIONS d'abord, et qu'on ne lise que la
 * sienne. C'est aussi le seul endroit de l'app ou l'on repond a « qu'est-ce
 * que vous voyez de tout ca ? » — une reponse qu'on ne peut pas se permettre
 * de rendre illisible.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { HelpSheet } from './HelpSheet';

const TOPICS = [
  { t: 'Connexion', h: 'accroche 1', b: 'reponse 1' },
  { t: 'Données', h: 'accroche 2', b: 'reponse 2' },
];

it('ne montre que les questions tant qu’on n’a rien ouvert', () => {
  render(<HelpSheet visible onClose={() => {}} topics={TOPICS} />);
  expect(screen.getByText('Connexion')).toBeTruthy();
  expect(screen.queryByText('reponse 1')).toBeNull();
});

it('n’en garde qu’une ouverte', () => {
  render(<HelpSheet visible onClose={() => {}} topics={TOPICS} />);
  fireEvent.press(screen.getByText('Connexion'));
  expect(screen.getByText('reponse 1')).toBeTruthy();

  fireEvent.press(screen.getByText('Données'));
  expect(screen.getByText('reponse 2')).toBeTruthy();
  expect(screen.queryByText('reponse 1')).toBeNull();
});

it('se referme sur la meme question', () => {
  render(<HelpSheet visible onClose={() => {}} topics={TOPICS} />);
  fireEvent.press(screen.getByText('Connexion'));
  fireEvent.press(screen.getByText('Connexion'));
  expect(screen.queryByText('reponse 1')).toBeNull();
});
