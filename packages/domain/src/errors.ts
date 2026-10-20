// Crée une erreur métier identifiable par les routes API.
export function insufficientCredits() { const error = new Error('INSUFFICIENT_CREDITS') as Error & { code: string }; error.code = 'INSUFFICIENT_CREDITS'; return error; }
