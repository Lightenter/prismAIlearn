// Importe les primitives de test Vitest pour isoler la route HTTP.
import { beforeEach, describe, expect, it, vi } from 'vitest';
// Prépare les doubles avant l’import de la route afin d’éviter tout accès réseau réel.
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), runChatTurn: vi.fn() }));
// Remplace le client Supabase par un faux client dont l’identité est contrôlée par le test.
vi.mock('../../apps/web/lib/supabaseServer', () => ({ createSupabaseServerClient: () => ({ auth: { getUser: mocks.getUser } }) }));
// Remplace le runtime coûteux par un espion pour vérifier l’identifiant transmis.
vi.mock('@prismai/chat-runtime', () => ({ runChatTurn: mocks.runChatTurn }));
// Importe la route après l’installation des mocks.
import { POST } from '../../apps/web/app/api/chat/route';
// Regroupe les scénarios obligatoires d’isolation d’identité.
describe('POST /api/chat authentification', () => {
  // Réinitialise les doubles entre les scénarios pour éviter les effets de bord.
  beforeEach(() => { vi.clearAllMocks(); mocks.runChatTurn.mockResolvedValue({ content: 'ok', provider_used: 'test', tokens: 1, balance: 9 }); });
  // Vérifie qu’une session absente est refusée avant l’appel runtime.
  it('refuse une requête sans authentification avec 401', async () => { mocks.getUser.mockResolvedValue({ data: { user: null }, error: null }); const response = await POST(new Request('http://localhost/api/chat', { method: 'POST', body: JSON.stringify({ messages: [{ role: 'user', content: 'bonjour' }] }) })); expect(response.status).toBe(401); expect(await response.json()).toEqual({ error: 'UNAUTHORIZED' }); expect(mocks.runChatTurn).not.toHaveBeenCalled(); });
  // Vérifie qu’une erreur Supabase de session est traitée comme une session invalide.
  it('refuse une session invalide sans révéler le détail Supabase', async () => { mocks.getUser.mockResolvedValue({ data: { user: null }, error: new Error('secret jwt detail') }); const response = await POST(new Request('http://localhost/api/chat', { method: 'POST', body: JSON.stringify({ messages: [{ role: 'user', content: 'bonjour' }] }) })); expect(response.status).toBe(401); expect(await response.text()).not.toContain('secret jwt detail'); });
  // Vérifie que seul l’identifiant Supabase vérifié arrive au runtime.
  it('transmet l’identité vérifiée et ignore un userId falsifié', async () => { const verifiedId = '11111111-1111-4111-8111-111111111111'; mocks.getUser.mockResolvedValue({ data: { user: { id: verifiedId } }, error: null }); const response = await POST(new Request('http://localhost/api/chat', { method: 'POST', body: JSON.stringify({ userId: '22222222-2222-4222-8222-222222222222', messages: [{ role: 'user', content: 'bonjour' }] }) })); expect(response.status).toBe(200); expect(mocks.runChatTurn).toHaveBeenCalledWith(verifiedId, [{ role: 'user', content: 'bonjour' }]); });
  // Vérifie que le fonctionnement authentifié conserve la réponse runtime existante.
  it('préserve le succès authentifié', async () => { mocks.getUser.mockResolvedValue({ data: { user: { id: '33333333-3333-4333-8333-333333333333' } }, error: null }); const response = await POST(new Request('http://localhost/api/chat', { method: 'POST', body: JSON.stringify({ messages: [{ role: 'user', content: 'bonjour' }] }) })); expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ content: 'ok', provider_used: 'test' }); });
});
