/**
 * La story de bienvenue : elle se lit d'une touche, se passe, et ne
 * revient pas.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { dict } from '@/i18n';
import { ClientTutorial } from './ClientTutorial';
import { markTutorialSeen, resetTutorial, tutorialSeen } from './tutorial';

it('avance d’une touche, revient, et se passe', () => {
  const onDone = jest.fn();
  const r = render(<ClientTutorial id="instagram" onDone={onDone} />);
  expect(screen.getByText(dict.tuto.t1)).toBeTruthy();
  // Un appui BREF avance : le geste part du toucher et se decide au
  // relachement, parce qu'un doigt qui reste met la story en pause.
  const tap = (id: string) => { fireEvent(screen.getByTestId(id), 'pressIn'); fireEvent(screen.getByTestId(id), 'pressOut'); };
  tap('tuto-next');
  expect(screen.getByText(dict.tuto.t2)).toBeTruthy();
  tap('tuto-prev');
  expect(screen.getByText(dict.tuto.t1)).toBeTruthy();
  fireEvent.press(screen.getByText(dict.tuto.skip));
  expect(onDone).toHaveBeenCalledTimes(1);
  r.unmount();
});

it('ne se montre qu’une fois', async () => {
  await resetTutorial();
  expect(await tutorialSeen('instagram')).toBe(false);
  await markTutorialSeen('instagram');
  expect(await tutorialSeen('instagram')).toBe(true);
  await resetTutorial();
  expect(await tutorialSeen('instagram')).toBe(false);
});
