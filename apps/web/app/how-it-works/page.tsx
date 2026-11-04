import { redirect } from 'next/navigation';

// Le parcours d’utilisation est centralisé sur la landing publique.
export default function HowItWorksPage() {
  redirect('/#fonctionnement');
}
