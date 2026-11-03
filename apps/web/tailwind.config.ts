import type { Config } from 'tailwindcss';

// Tailwind ne s’applique qu’à la landing : le reste de l’app garde globals.css.
const config: Config = {
  content: ['./app/page.tsx', './app/components/landing/**/*.{ts,tsx}'],
  // Preflight désactivé pour ne pas modifier les autres écrans ; landing.css porte un reset local.
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        ground: '#0A0A0D',
        surface: '#131318',
        raise: '#1C1C23',
        ink: '#F5F5F7',
        soft: '#B4B4BD',
        accent: { DEFAULT: '#8F3CFF', hover: '#9D52FF', press: '#7A2AE6' },
        cyan: '#5EF2FF',
      },
      fontFamily: { sans: ['var(--font-inter)', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'] },
      maxWidth: { page: '1240px' },
      borderRadius: { lg: '8px' },
    },
  },
  plugins: [],
};

export default config;
