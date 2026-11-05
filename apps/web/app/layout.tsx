// Importe les styles globaux nécessaires à toutes les routes.
import './globals.css';
// Charge Inter depuis le paquet local : aucune requête vers Google Fonts au build ni au runtime.
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
// Définit les métadonnées publiques de PrismAI.
export const metadata = { title: 'PrismAI', description: 'Une IA pour tout ton travail.' };

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
