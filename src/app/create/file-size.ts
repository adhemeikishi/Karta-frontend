/**
 * « 2,4 Mo » — même graphie que l'import réel de l'onboarding (`ImportComponent`).
 *
 * Extrait dans son propre fichier parce que trois écrans du parcours affichent la
 * taille du fichier déposé, et qu'elle doit s'écrire pareil partout.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} o`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${Math.round(kb)} Ko`;
  }
  return `${(kb / 1024).toFixed(1).replace('.', ',')} Mo`;
}
