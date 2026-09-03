/**
 * Défilement vers une section ancrée de la même page.
 *
 * `PathLocationStrategy` d'Angular réagit aussi aux évènements `hashchange`, pas
 * seulement `popstate` — un `<a href="#id">` brut provoque donc une navigation Router
 * involontaire (observé : redirection vers `admin/dashboard` via la route wildcard).
 * On empêche le comportement natif et on défile nous-mêmes, sauf ouverture explicite
 * dans un nouvel onglet (clic milieu/molette, Ctrl/Cmd/Maj) qu'on laisse au navigateur.
 */
export function scrollToAnchor(id: string, event: MouseEvent): void {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }
  const target = document.getElementById(id);
  if (!target) {
    return;
  }
  event.preventDefault();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
}
