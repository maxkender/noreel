import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { deviceLang, setLang, type Lang } from '@/lib/format';

/*
 * La langue choisie, gardee sur le disque.
 *
 * Tant qu'on n'a rien choisi, c'est celle du telephone — ou l'anglais si on
 * ne l'a pas. Le choix se fait sur la premiere page du parcours et s'applique
 * sur-le-champ : chaque ecran qui lit le dictionnaire par `useT()` se
 * redessine. Le magasin pousse aussi la valeur dans `lib/format`, que les
 * fonctions hors React lisent sans s'abonner.
 */
type State = {
  lang: Lang;
  /** Vrai une fois le disque lu : avant, on ne dessine rien. */
  hydrated: boolean;
  set: (lang: Lang) => void;
};

export const useLang = create<State>()(
  persist(
    (set) => ({
      lang: deviceLang(),
      hydrated: false,
      set: (lang) => { setLang(lang); set({ lang }); },
    }),
    {
      name: 'unswipe.lang.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ lang }) => ({ lang }),
      onRehydrateStorage: () => (state) => {
        // Rien sur le disque : on garde celle du telephone.
        const chosen = state?.lang ?? deviceLang();
        setLang(chosen);
        useLang.setState({ lang: chosen, hydrated: true });
      },
    }
  )
);
