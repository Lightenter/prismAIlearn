// Importe les primitives de test Vitest pour isoler la route HTTP.
import { beforeEach, describe, expect, it, vi } from 'vitest';
// Prépare les doubles avant l’import de la route afin d’éviter tout accès réseau réel.
const mocks = vi.hoisted(() => ({ createClient: vi.fn(), getUser: vi.fn(), runChatTurn: vi.fn(), consumeRateLimit: vi.fn() }));
// Remplace le client Supabase par un faux client dont l’identité est contrôlée par le test.
vi.mock('../../apps/web/lib/supabaseServer', () => ({ createSupabaseServerClient: () => mocks.createClient() }));
// Remplace le runtime coûteux par un espion pour vérifier l’identité transmise.
vi.mock('@prismai/chat-runtime', () => ({ runChatTurn: mocks.runChatTurn }));
// Remplace le rate limiter SQL afin que les tests se concentrent sur le contrat HTTP.
vi.mock('@prismai/db', () => ({ consumeRateLimit: mocks.consumeRateLimit }));
// Importe la route après l’installation des mocks.
import { POST } from '../../apps/web/app/api/chat/route';
// Construit une requête valide réutilisable entre les scénarios.
function request(body: Record<string, unknown> = { messages: [{ role: 'user', content: 'bonjour' }] }) { return new Request('http://localhost/api/chat', { method: 'POST', body: JSON.stringify(body) }); }
// Regroupe les scénarios obligatoires d’isolation et de gestion d’erreurs.
describe('POST /api/chat authentification et erreurs', () => {
  // Réinitialise les doubles et la configuration par défaut avant chaque scénario.
  beforeEach(() => { vi.clearAllMocks(); mocks.createClient.mockReturnValue({ auth: { getUser: mocks.getUser } }); mocks.consumeRateLimit.mockResolvedValue(true); mocks.runChatTurn.mockResolvedValue({ content: 'ok', provider_used: 'test', tokens: 1, balance: 9 }); });
  // Vérifie que l’absence de configuration reste distinguée d’une panne serveur.
  it('retourne 503 lorsque Supabase est explicitement non configuré', async () => { mocks.createClient.mockReturnValue(null); const response = await POST(request()); expect(response.status).toBe(503); expect(await response.json()).toEqual({ error: 'SUPABASE_CONFIG_MISSING' }); });
  // Vérifie qu’une session absente est refusée avant l’appel runtime.
  it('refuse une requête sans authentification avec 401', async () => { mocks.getUser.mockResolvedValue({ data: { user: null }, error: null }); const response = await POST(request()); expect(response.status).toBe(401); expect(await response.json()).toEqual({ error: 'UNAUTHORIZED' }); expect(mocks.runChatTurn).not.toHaveBeenCalled(); });
  // Vérifie qu’une erreur Supabase explicitement liée à une session invalide donne 401.
  it('refuse une session invalide avec 401 sans révéler le détail Supabase', async () => { mocks.getUser.mockResolvedValue({ data: { user: null }, error: { status: 401, message: 'secret jwt detail' } }); const response = await POST(request()); expect(response.status).toBe(401); expect(await response.text()).not.toContain('secret jwt detail'); });
  // Vérifie qu’une exception inattendue de vérification ne devient pas abusivement un 401.
  it('retourne 500 pour une exception inattendue de getUser sans fuite', async () => { mocks.getUser.mockRejectedValue(new Error('secret auth backend detail')); const response = await POST(request()); const body = await response.text(); expect(response.status).toBe(500); expect(body).toBe('{"error":"CHAT_FAILED"}'); expect(body).not.toContain('secret auth backend detail'); });
  // Vérifie qu’une exception de création du client reste générique.
  it('retourne 500 pour une exception de création Supabase sans fuite', async () => { mocks.createClient.mockImplementation(() => { throw new Error('secret client detail'); }); const response = await POST(request()); expect(response.status).toBe(500); expect(await response.json()).toEqual({ error: 'CHAT_FAILED' }); });
  // Vérifie que seul l’identifiant Supabase vérifié arrive au runtime.
  it('transmet l’identité vérifiée et ignore un userId falsifié', async () => { const verifiedId = '11111111-1111-4111-8111-111111111111'; mocks.getUser.mockResolvedValue({ data: { user: { id: verifiedId } }, error: null }); const response = await POST(request({ userId: '22222222-2222-4222-8222-222222222222', messages: [{ role: 'user', content: 'bonjour' }] })); expect(response.status).toBe(200); expect(mocks.runChatTurn).toHaveBeenCalledWith(verifiedId, [{ role: 'user', content: 'bonjour' }], expect.objectContaining({ idempotencyKey: expect.stringContaining(`chat:${verifiedId}:`) })); });
  // Vérifie que le code métier des crédits conserve son statut 402.
  it('préserve le statut 402 des crédits insuffisants', async () => { mocks.getUser.mockResolvedValue({ data: { user: { id: '33333333-3333-4333-8333-333333333333' } }, error: null }); mocks.runChatTurn.mockRejectedValue(Object.assign(new Error('secret credit detail'), { code: 'INSUFFICIENT_CREDITS' })); const response = await POST(request()); expect(response.status).toBe(402); expect(await response.json()).toEqual({ error: 'INSUFFICIENT_CREDITS' }); });
});
