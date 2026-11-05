// Détermine où ramène la flèche retour des écrans Auth.
// Objectif : un visiteur venu des tarifs revient aux tarifs, pas à l’accueil.
// Sécurité : la valeur vient de l’URL, donc elle est validée contre une liste fermée.

// Pages publiques autorisées comme origine d’un parcours Auth.
// Aucune valeur arbitraire n’est acceptée, ce qui empêche une redirection ouverte.
const ALLOWED_ORIGINS: Record<string, string> = {
  '/pricing': 'Retour aux tarifs',
  '/': 'Retour à l’accueil',
};

// Valeur par défaut si l’origine est absente ou refusée.
const DEFAULT_ORIGIN = '/';

// Normalise une origine reçue depuis l’URL.
// `null`, une chaîne vide, une valeur inconnue ou une URL absolue renvoient la valeur par défaut.
export function resolveBackOrigin(raw: string | null | undefined): string {
  // Une origine doit être un chemin interne court, sans protocole ni autorité.
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//')) return DEFAULT_ORIGIN;
  // Retire une éventuelle requête ou ancre pour ne garder que le chemin.
  const path = raw.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  // N’accepte que les pages explicitement listées.
  return Object.prototype.hasOwnProperty.call(ALLOWED_ORIGINS, path) ? path : DEFAULT_ORIGIN;
}

// Traduit l’origine validée en libellé accessible pour la flèche retour.
export function backOriginLabel(path: string): string {
  return ALLOWED_ORIGINS[path] ?? ALLOWED_ORIGINS[DEFAULT_ORIGIN];
}

// Indique si la page Tarifs est l’origine du parcours.
export function isPricingOrigin(raw: string | null | undefined): boolean {
  return resolveBackOrigin(raw) === '/pricing';
}
