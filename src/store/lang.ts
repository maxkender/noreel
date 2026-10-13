import { I18nManager } from 'react-native';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { deviceLang, isRtl, setLang, type Lang } from '@/lib/format';

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
      set: (lang) => { setLang(lang); set({ lang }); void applyDirection(lang); },
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
        void applyDirection(chosen);
      },
    }
  )
);

/*
 * De droite a gauche, quand la langue l'ecrit.
 *
 * React Native retourne la mise en page — rangees, marges, positions — mais
 * seulement au demarrage : le sens se lit une fois, et la page en cours ne
 * change pas. Quand le sens voulu n'est pas celui en place, on l'enregistre
 * et on relance l'app : une seconde de noir, et tout est du bon cote. Le
 * reglage est garde par le natif, donc le prochain lancement a froid part
 * deja dans le bon sens, avant meme que ce code tourne.
 */
async function applyDirection(lang: Lang): Promise<void> {
  const rtl = isRtl(lang);
  if (I18nManager.isRTL === rtl) return;
  try {
    I18nManager.allowRTL(rtl);
    I18nManager.forceRTL(rtl);
    await Updates.reloadAsync();
  } catch { /* en developpement, sans expo-updates : au prochain lancement */ }
}
