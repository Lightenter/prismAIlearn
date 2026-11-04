// Importe les styles globaux nécessaires à toutes les routes.
import './globals.css';
// Définit les métadonnées publiques de PrismAI.
export const metadata = { title: 'PrismAI', description: 'Toutes les IA. Un seul Prisme.' };

// Applique le thème mémorisé avant le premier rendu pour éviter tout flash (sombre par défaut).
const themeScript = `(function(){try{var t=localStorage.getItem('prismai:theme');document.documentElement.dataset.theme=t==='light'?'light':'dark';}catch(e){document.documentElement.dataset.theme='dark';}})();`;

// Rend le squelette HTML partagé par toutes les pages.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-theme="dark" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>{children}</body>
    </html>
  );
}
