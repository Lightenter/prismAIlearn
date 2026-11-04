import { redirect } from 'next/navigation';

// Le contenu Fonctionnalités est centralisé sur la landing publique.
export default function FeaturesPage() {
  redirect('/#fonctionnalites');
}
