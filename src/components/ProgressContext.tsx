import { createContext, type ReactNode } from 'react';

/** Fichier dedie : evite un import circulaire entre Screen et OnboardingFlow. */
export const ProgressContext = createContext<ReactNode>(null);
