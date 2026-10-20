// Écrit un événement d’observabilité sans exposer les secrets.
export function recordMetric(name: string, value: number, tags: Record<string, string> = {}) { return { name, value, tags, at: new Date().toISOString() }; }
