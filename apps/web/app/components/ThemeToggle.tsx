'use client';

// Bascule entre le thème sombre (noir / violet néon) et le thème clair, avec mémorisation locale.
export const THEME_STORAGE_KEY = 'prismai:theme';

export function ThemeToggle({ className = '' }: { className?: string }) {
  // Inverse le thème courant, l’applique sur <html> et le mémorise.
  function toggle() {
    const root = document.documentElement;
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.classList.add('theme-anim');
    root.dataset.theme = next;
    try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* stockage indisponible : le choix vaut pour la page. */ }
    window.setTimeout(() => root.classList.remove('theme-anim'), 300);
  }

  return (
    <button type="button" className={`theme-toggle ${className}`.trim()} onClick={toggle} aria-label="Basculer entre le mode sombre et le mode clair" title="Mode sombre / clair">
      {/* Lune affichée en sombre, soleil en clair. */}
      <svg className="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" /></svg>
      <svg className="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
    </button>
  );
}
