import { Menu, hasStructuredContent } from '../menu/menu.model';
import { Restaurant } from '../models/restaurant.model';
import { can } from '../restaurateur/plan';

/**
 * Les étapes du parcours de configuration, dans l'ordre où le restaurateur les traverse.
 *
 * `welcome` et `processing` n'ont pas d'équivalent en base : le premier est un accueil,
 * le second dure le temps d'un appel. Toutes les autres correspondent à un état réel du
 * menu côté serveur — c'est ce qui rend la reprise possible sans rien mémoriser.
 */
export type OnboardingStep =
  | 'welcome'
  | 'menu'
  | 'processing'
  | 'review'
  | 'style'
  | 'publish'
  | 'success';

/** Étapes affichées dans l'indicateur de progression, et leur libellé. */
export const ONBOARDING_STEPS: readonly { id: OnboardingStep; label: string }[] = [
  { id: 'menu', label: 'Votre menu' },
  { id: 'review', label: 'Vérification' },
  { id: 'style', label: 'Style' },
  { id: 'publish', label: 'Publication' },
];

/** Rang d'une étape dans l'indicateur. `-1` pour celles qui n'y figurent pas. */
export function stepIndex(step: OnboardingStep): number {
  if (step === 'processing') {
    return ONBOARDING_STEPS.findIndex((s) => s.id === 'menu');
  }
  if (step === 'success') {
    return ONBOARDING_STEPS.length;
  }
  return ONBOARDING_STEPS.findIndex((s) => s.id === step);
}

/**
 * Où en est le restaurateur, déduit de l'état réel du serveur.
 *
 * <strong>Rien n'est mémorisé côté navigateur.</strong> Fermer l'onglet au milieu du
 * parcours et revenir depuis un autre appareil doit reprendre au même endroit : la seule
 * façon d'y arriver honnêtement est de relire ce que le backend contient déjà — un PDF
 * importé, un brouillon KartaIA en attente, une carte enregistrée, un menu publié.
 *
 * Le parcours dépend de l'offre : une carte BASIC <em>est</em> le PDF, il n'y a donc ni
 * analyse, ni vérification, ni style à choisir (voir {@link can}).
 *
 * @param restaurant restaurant courant
 * @param menu       état du menu (`GET .../menu`)
 * @param hasDraft   un brouillon KartaIA attend d'être relu (`GET .../menu/ai/draft`)
 */
export function stepFor(
  restaurant: Restaurant | null,
  menu: Menu | null,
  hasDraft: boolean,
): OnboardingStep {
  if (!menu) {
    return 'welcome';
  }
  if (menu.published) {
    return 'success';
  }

  const offer = restaurant?.offer ?? menu.offer;

  // Carte PDF (BASIC) : importer puis publier, rien d'autre n'est ouvert.
  if (!can(offer, 'structuredMenu')) {
    return menu.pdf ? 'publish' : 'menu';
  }

  if (hasDraft) {
    return 'review';
  }
  if (hasStructuredContent(menu)) {
    return 'style';
  }
  // Un PDF déposé mais pas encore analysé : l'étape « menu » porte aussi ce bouton.
  return menu.pdf ? 'menu' : 'welcome';
}
