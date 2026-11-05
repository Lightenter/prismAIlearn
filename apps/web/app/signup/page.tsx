// Page d’inscription : le serveur valide l’origine du parcours puis rend le formulaire complet.
// Le rendu reste côté serveur (pas de `useSearchParams`), donc le HTML est complet dès l’arrivée.
import { resolveBackOrigin, backOriginLabel } from '../../lib/backOrigin';
import { SignupForm } from './SignupForm';

// Décrit les paramètres de recherche reçus (`?from=/pricing`).
type SignupPageProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

// Rend la page avec la destination de retour déjà validée.
export default function SignupPage({ searchParams }: SignupPageProps) {
  // `from` peut arriver sous forme de tableau si le paramètre est répété.
  const raw = searchParams?.from;
  // Valide l’origine contre la liste fermée des pages publiques autorisées.
  const backHref = resolveBackOrigin(Array.isArray(raw) ? raw[0] : raw);
  // Transmet la destination et son libellé accessible au formulaire client.
  return <SignupForm backHref={backHref} backLabel={backOriginLabel(backHref)} />;
}
