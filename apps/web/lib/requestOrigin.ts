/** Retourne l’origine publique canonique utilisée pour les liens Auth et les retours OAuth. */
export function getAppOrigin(request: Request): string {
  const configured = process.env.APP_BASE_URL;
  if (configured) {
    try {
      const url = new URL(configured);
      if ((url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password) return url.origin;
    } catch {
      // Une valeur invalide ne doit pas créer une URL de redirection ; on retombe sur l’origine reçue.
    }
  }
  return new URL(request.url).origin;
}
