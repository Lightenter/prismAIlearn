// Importe les styles globaux nécessaires à toutes les routes.
import './globals.css';
// Définit les métadonnées publiques de PrismAI.
export const metadata = { title: 'PrismAI', description: 'Toutes les IA. Un seul Prisme.' };
// Rend le squelette HTML partagé par toutes les pages.
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="fr"><body>{children}</body></html>; }
