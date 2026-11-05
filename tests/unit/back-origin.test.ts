// Vérifie la logique de retour des écrans Auth vers leur page d’origine.
import { describe, expect, it } from 'vitest';
// Importe les fonctions réellement utilisées par les pages login et signup.
import { backOriginLabel, isPricingOrigin, resolveBackOrigin } from '../../apps/web/lib/backOrigin';

// Décrit le contrat attendu : une origine connue est honorée, toute autre est refusée.
describe('retour depuis les écrans Auth', () => {
  it('ramène aux tarifs quand l’origine est /pricing', () => {
    expect(resolveBackOrigin('/pricing')).toBe('/pricing');
    expect(backOriginLabel('/pricing')).toBe('Retour aux tarifs');
    expect(isPricingOrigin('/pricing')).toBe(true);
  });

  it('ramène à la landing sans origine', () => {
    expect(resolveBackOrigin(null)).toBe('/');
    expect(resolveBackOrigin(undefined)).toBe('/');
    expect(resolveBackOrigin('')).toBe('/');
    expect(backOriginLabel('/')).toBe('Retour à l’accueil');
    expect(isPricingOrigin(null)).toBe(false);
  });

  it('ignore une requête ou une ancre accolée au chemin', () => {
    expect(resolveBackOrigin('/pricing?plan=starter')).toBe('/pricing');
    expect(resolveBackOrigin('/pricing#boosters')).toBe('/pricing');
    expect(resolveBackOrigin('/pricing/')).toBe('/pricing');
  });

  it('refuse une redirection ouverte vers un domaine externe', () => {
    expect(resolveBackOrigin('https://evil.example.com')).toBe('/');
    expect(resolveBackOrigin('//evil.example.com')).toBe('/');
    expect(resolveBackOrigin('javascript:alert(1)')).toBe('/');
    expect(resolveBackOrigin('/admin')).toBe('/');
    expect(resolveBackOrigin('/dashboard')).toBe('/');
  });

  it('produit toujours un libellé accessible connu', () => {
    for (const raw of ['/pricing', '/', null, 'https://evil.example.com', '/inconnu']) {
      expect(backOriginLabel(resolveBackOrigin(raw))).toMatch(/^Retour (à l’accueil|aux tarifs)$/);
    }
  });
});
