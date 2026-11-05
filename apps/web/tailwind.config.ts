import type { Config } from 'tailwindcss';

// Tailwind ne s’applique qu’à la landing : le reste de l’app garde globals.css.
const config: Config = {
  content: ['./app/page.tsx', './app/components/landing/**/*.{ts,tsx}'],
  // Preflight désactivé pour ne pas modifier les autres écrans ; landing.css porte un reset local.
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        // Couleurs pilotées par des variables CSS (landing.css) pour basculer sombre / clair.
        ground: 'rgb(var(--lp-ground) / <alpha-value>)',
        surface: { DEFAULT: 'rgb(var(--lp-surface) / <alpha-value>)', hover: 'rgb(var(--lp-surface-hover) / <alpha-value>)' },
        raise: 'rgb(var(--lp-raise) / <alpha-value>)',
        edge: 'rgb(var(--lp-edge) / <alpha-value>)',
        ink: 'rgb(var(--lp-ink) / <alpha-value>)',
        soft: 'rgb(var(--lp-soft) / <alpha-value>)',
        accent: { DEFAULT: 'rgb(var(--lp-accent) / <alpha-value>)', hover: 'rgb(var(--lp-accent-hover) / <alpha-value>)', press: 'rgb(var(--lp-accent-press) / <alpha-value>)' },
        cyan: 'rgb(var(--lp-cyan) / <alpha-value>)',
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'] },
      maxWidth: { page: '1240px' },
      borderRadius: { lg: '8px' },
    },
  },
  plugins: [],
};

export default config;
