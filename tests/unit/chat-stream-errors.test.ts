// Importe les primitives Vitest pour tester les réponses d’erreur SSE isolément.
import { beforeEach, describe, expect, it, vi } from 'vitest';
// Prépare des doubles partagés pour Supabase et le runtime chat.
const mocks = vi.hoisted(() => ({ createClient: vi.fn(), getUser: vi.fn(), runChatTurn: vi.fn(), consumeRateLimit: vi.fn(), getConfiguredModels: vi.fn() }));
// Remplace le client Supabase serveur pour piloter chaque état de session.
vi.mock('../../apps/web/lib/supabaseServer', () => ({ createSupabaseServerClient: () => mocks.createClient() }));
// Remplace le runtime afin qu’aucun provider réel ne soit appelé.
vi.mock('@prismai/chat-runtime', () => ({ createRunEvents: vi.fn(() => []), encodeSse: vi.fn(), createRunId: vi.fn(() => 'run-test'), runChatTurn: mocks.runChatTurn }));
// Remplace le rate limiter SQL afin que les tests se concentrent sur le contrat HTTP.
vi.mock('@prismai/db', () => ({ consumeRateLimit: mocks.consumeRateLimit }));
vi.mock('@prismai/provider-router', () => ({ getConfiguredModels: mocks.getConfiguredModels }));
// Importe la route SSE après installation des mocks.
import { POST } from '../../apps/web/app/api/chat/stream/route';
// Construit une requête SSE fonctionnelle.
function request() { return new Request('http://localhost/api/chat/stream', { method: 'POST', body: JSON.stringify({ messages: [{ role: 'user', content: 'bonjour' }] }) }); }
// Regroupe les scénarios de sécurité du flux SSE.
describe('POST /api/chat/stream erreurs', () => {
  // Réinitialise les doubles et fournit un client Supabase par défaut.
  beforeEach(() => { vi.clearAllMocks(); mocks.createClient.mockReturnValue({ auth: { getUser: mocks.getUser }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: 'user' }, error: null }) }) }) }) }); mocks.consumeRateLimit.mockResolvedValue(true); mocks.getConfiguredModels.mockReturnValue([{ id: 'groq:llama-test', provider: 'groq', model: 'llama-test' }]); mocks.runChatTurn.mockResolvedValue({ content: 'ok', fallback_used: false, creditsSpent: 1, balance: 9 }); });
  // Vérifie qu’une erreur inattendue de getUser devient 500 et ne fuit pas son message.
  it('retourne 500 sans divulguer une exception getUser', async () => { mocks.getUser.mockRejectedValue(new Error('secret stream auth detail')); const response = await POST(request()); const body = await response.text(); expect(response.status).toBe(500); expect(body).toBe('{"error":"CHAT_STREAM_FAILED"}'); expect(body).not.toContain('secret stream auth detail'); });
  // Vérifie qu’une erreur Supabase explicitement 401 reste une réponse d’authentification.
  it('retourne 401 pour une session explicitement invalide', async () => { mocks.getUser.mockResolvedValue({ data: { user: null }, error: { status: 401, message: 'secret invalid token' } }); const response = await POST(request()); expect(response.status).toBe(401); expect(await response.text()).not.toContain('secret invalid token'); });
  // Vérifie que les crédits insuffisants restent exposés avec le statut métier attendu.
  it('retourne 402 pour les crédits insuffisants', async () => { mocks.getUser.mockResolvedValue({ data: { user: { id: '44444444-4444-4444-8444-444444444444' } }, error: null }); mocks.runChatTurn.mockRejectedValue(Object.assign(new Error('secret credit detail'), { code: 'INSUFFICIENT_CREDITS' })); const response = await POST(request()); expect(response.status).toBe(402); expect(await response.text()).toBe('{"error":"INSUFFICIENT_CREDITS"}'); });
});
