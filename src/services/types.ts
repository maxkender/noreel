export type SocialApp = 'instagram' | 'tiktok';

export interface FilteredAppsService {
  /** TODO produit : ouvre la version UnSwipe. La webview de ReelsFree ira ici. */
  open(app: SocialApp): Promise<void>;
}

export interface HomeScreenService {
  canPinNatively(): boolean;
  add(app: SocialApp): Promise<'added' | 'guided' | 'unavailable'>;
}

export interface ShieldService {
  isActive(): Promise<boolean>;
  /** `selection` : le jeton du selecteur d'Apple. Absent, on bloque tout. */
  /** Faux quand il n'y a rien a bloquer : aucune selection n'a ete faite. */
  setActive(active: boolean, selection?: string | null): Promise<boolean>;
}

export interface StatsService {
  today(): Promise<{ reclaimedMinutes: number; goalMinutes: number }>;
  week(): Promise<number[]>;   // lundi -> dimanche
  year(): Promise<number[]>;   // par jour depuis le 1er janvier
  reelsAvoidedThisWeek(): Promise<number>;
  streakDays(): Promise<number>;
}

export type AnalyticsEvent =
  | 'onboarding_started' | 'step_viewed' | 'intro_skipped'
  | 'demo_platform_toggled' | 'pain_answered' | 'screen_time_set'
  | 'age_set' | 'life_reclaimed' | 'sources_opened'
  // Le seul canal d'acquisition qu'on aura jamais : l'App Store ne dit pas
  // d'ou viennent les installations.
  | 'source_answered'
  | 'home_add_tapped' | 'onboarding_completed';
