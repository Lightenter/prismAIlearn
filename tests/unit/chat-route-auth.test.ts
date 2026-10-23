import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), getUser: vi.fn(), runChatTurn: vi.fn(), consumeRateLimit: vi.fn(), getConfiguredModels: vi.fn() }));
vi.mock('../../apps/web/lib/supabaseServer', () => ({ createSupabaseServerClient: () => mocks.createClient() }));
vi.mock('@prismai/chat-runtime', () => ({ runChatTurn: mocks.runChatTurn }));
vi.mock('@prismai/db', () => ({ consumeRateLimit: mocks.consumeRateLimit }));
vi.mock('@prismai/provider-router', () => ({ getConfiguredModels: mocks.getConfiguredModels }));
import { POST } from '../../apps/web/app/api/chat/route';

function request(body: Record<string, unknown> = { messages: [{ role: 'user', content: 'bonjour' }] }) {
  return new Request('http://localhost/api/chat', { method: 'POST', body: JSON.stringify(body) });
}
function profileRole(role: string) {
  return { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role }, error: null }) }) }) }) };
}

describe('POST /api/chat authentification et erreurs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockReturnValue({ auth: { getUser: mocks.getUser }, ...profileRole('user') });
    mocks.consumeRateLimit.mockResolvedValue(true);
    mocks.getConfiguredModels.mockReturnValue([{ id: 'groq:llama-test', provider: 'groq', model: 'llama-test' }]);
    mocks.runChatTurn.mockResolvedValue({ content: 'ok', provider_used: 'private-provider', model: 'private-model', tokens: 1, balance: 9, creditsSpent: 3, fallback_used: false, conversationId: null, persistenceWarning: false });
  });

  it('retourne 503 lorsque Supabase est explicitement non configuré', async () => {
    mocks.createClient.mockReturnValue(null);
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'SUPABASE_CONFIG_MISSING' });
  });
  it('refuse une requête sans authentification avec 401 avant le runtime', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'UNAUTHORIZED' });
    expect(mocks.runChatTurn).not.toHaveBeenCalled();
  });
  it('refuse une session invalide sans révéler le détail Supabase', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { status: 401, message: 'secret jwt detail' } });
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(await response.text()).not.toContain('secret jwt detail');
  });
  it('retourne 500 pour une exception inattendue de getUser sans fuite', async () => {
    mocks.getUser.mockRejectedValue(new Error('secret auth backend detail'));
    const response = await POST(request());
    const body = await response.text();
    expect(response.status).toBe(500);
    expect(body).toBe('{"error":"CHAT_FAILED"}');
    expect(body).not.toContain('secret auth backend detail');
  });
  it('retourne 500 pour une exception de création Supabase sans fuite', async () => {
    mocks.createClient.mockImplementation(() => { throw new Error('secret client detail'); });
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'CHAT_FAILED' });
  });
  it('bloque avant runtime si aucun provider n’est configuré', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: '33333333-3333-4333-8333-333333333333' } }, error: null });
    mocks.getConfiguredModels.mockReturnValue([]);
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'NO_PROVIDER_CONFIGURED' });
    expect(mocks.runChatTurn).not.toHaveBeenCalled();
  });
  it('transmet l’identité vérifiée, ignore userId falsifié et masque les métadonnées provider', async () => {
    const verifiedId = '11111111-1111-4111-8111-111111111111';
    mocks.getUser.mockResolvedValue({ data: { user: { id: verifiedId } }, error: null });
    const response = await POST(request({ userId: '22222222-2222-4222-8222-222222222222', messages: [{ role: 'user', content: 'bonjour' }] }));
    expect(response.status).toBe(200);
    expect(mocks.runChatTurn).toHaveBeenCalledWith(verifiedId, [{ role: 'user', content: 'bonjour' }], expect.objectContaining({ idempotencyKey: expect.stringContaining(`chat:${verifiedId}:`), planTier: 'FREE' }));
    const body = await response.json();
    expect(body).not.toHaveProperty('provider_used');
    expect(body).not.toHaveProperty('model');
    expect(body).toMatchObject({ content: 'ok', fallbackUsed: false });
  });
  it('résout Pro depuis profiles côté serveur, pas depuis le corps client', async () => {
    const verifiedId = '44444444-4444-4444-8444-444444444444';
    mocks.getUser.mockResolvedValue({ data: { user: { id: verifiedId } }, error: null });
    mocks.createClient.mockReturnValue({ auth: { getUser: mocks.getUser }, ...profileRole('premium') });
    const response = await POST(request({ planTier: 'FREE', messages: [{ role: 'user', content: 'bonjour' }] }));
    expect(response.status).toBe(200);
    expect(mocks.runChatTurn).toHaveBeenCalledWith(verifiedId, [{ role: 'user', content: 'bonjour' }], expect.objectContaining({ planTier: 'PRO' }));
  });
  it('préserve le statut 402 des crédits insuffisants', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: '33333333-3333-4333-8333-333333333333' } }, error: null });
    mocks.runChatTurn.mockRejectedValue(Object.assign(new Error('secret credit detail'), { code: 'INSUFFICIENT_CREDITS' }));
    const response = await POST(request());
    expect(response.status).toBe(402);
    expect(await response.json()).toEqual({ error: 'INSUFFICIENT_CREDITS' });
  });
});
