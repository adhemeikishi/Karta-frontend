import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CreationDraftService } from './creation-draft.service';

/**
 * Le parcours de création n'existe pas sans carte à travailler.
 *
 * Ouvrir `/create/design` dans un onglet neuf ne doit pas afficher un écran vide : on
 * ramène à l'accueil, où le parcours commence par un fichier. Le brouillon vit dans la
 * session de l'onglet, donc cette garde laisse passer un rechargement de page en plein
 * milieu du parcours — c'est justement ce qu'on veut préserver.
 */
export const creationDraftGuard: CanActivateFn = () => {
  if (inject(CreationDraftService).exists()) {
    return true;
  }
  return inject(Router).createUrlTree(['/']);
};
