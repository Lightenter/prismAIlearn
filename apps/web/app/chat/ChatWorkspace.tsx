'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';

type ModelOption = { id: string; provider: string; providerLabel: string; model: string; label: string };
type Conversation = { id: string; title: string; created_at: string; updated_at: string };
type Message = { id: string; role: 'user' | 'assistant'; content: string; provider_used?: string | null; model?: string | null };
type StoredMessage = { id: string; role: string; content: string; provider_used?: string | null; model_used?: string | null };

const SUGGESTIONS = ['Aide-moi à structurer une idée', 'Explique-moi un sujet simplement', 'Écris un plan clair pour mon projet'];
const newId = () => typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

function dateGroup(dateValue: string) {
  const date = new Date(dateValue);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.floor((startToday - startDate) / 86_400_000);
  if (days <= 0) return "Aujourd’hui";
  if (days === 1) return 'Hier';
  if (days < 7) return '7 derniers jours';
  return 'Plus ancien';
}

function InlineMarkdown({ text }: { text: string }) {
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return <>{tokens.map((token, index) => {
    if (token.startsWith('`') && token.endsWith('`')) return <code className="chat-inline-code" key={index}>{token.slice(1, -1)}</code>;
    if (token.startsWith('**') && token.endsWith('**')) return <strong key={index}>{token.slice(2, -2)}</strong>;
    if (token.startsWith('*') && token.endsWith('*')) return <em key={index}>{token.slice(1, -1)}</em>;
    return <span key={index}>{token}</span>;
  })}</>;
}

function highlightedCode(code: string) {
  const pieces = code.split(/(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:const|let|var|function|return|if|else|async|await|import|from|export|class|new|throw|try|catch|true|false|null|def|print|SELECT|FROM|WHERE)\b|\b\d+(?:\.\d+)?\b)/g);
  return pieces.map((part, index) => {
    let kind = '';
    if (/^(\/\/|#|\/\*)/.test(part)) kind = 'comment';
    else if (/^("|'|`)/.test(part)) kind = 'string';
    else if (/^(const|let|var|function|return|if|else|async|await|import|from|export|class|new|throw|try|catch|true|false|null|def|print|SELECT|FROM|WHERE)$/.test(part)) kind = 'keyword';
    else if (/^\d/.test(part)) kind = 'number';
    return <span className={kind ? `syntax-${kind}` : undefined} key={index}>{part}</span>;
  });
}

function MarkdownMessage({ content }: { content: string }) {
  const blocks = content.split(/(```[\s\S]*?```)/g);
  return <div className="chat-markdown">{blocks.map((block, index) => {
    if (block.startsWith('```') && block.endsWith('```')) {
      const body = block.slice(3, -3).replace(/^\w*\n/, '');
      return <pre className="chat-code-block" key={index}><code>{highlightedCode(body)}</code></pre>;
    }
    return <p key={index}>{block.split('\n').map((line, lineIndex) => <span key={lineIndex}><InlineMarkdown text={line} />{lineIndex < block.split('\n').length - 1 && <br />}</span>)}</p>;
  })}</div>;
}

function errorLabel(code: string) {
  const labels: Record<string, string> = {
    NO_PROVIDER_CONFIGURED: 'Aucun fournisseur IA n’est configuré côté serveur. Ajoute au moins une clé API fournisseur pour activer le chat.',
    MODEL_UNAVAILABLE: 'Ce modèle n’est plus configuré. Choisis un modèle disponible puis réessaie.',
    INSUFFICIENT_CREDITS: 'Crédits insuffisants pour démarrer cette génération.',
    RATE_LIMITED: 'Trop de requêtes rapprochées. Patiente un instant avant de réessayer.',
    REQUEST_ALREADY_PROCESSED: 'Cette requête a déjà été revendiquée ou traitée. PrismAI ne relance pas un appel potentiellement facturable ; envoie une nouvelle requête seulement après avoir vérifié l’historique.',
    UNAUTHORIZED: 'Ta session a expiré. Reconnecte-toi pour continuer.',
    CHAT_STREAM_FAILED: 'La génération a échoué. Vérifie la configuration puis réessaie.',
    CONVERSATION_NOT_FOUND: 'Cette conversation est introuvable ou n’est pas accessible.',
  };
  return labels[code] ?? 'La requête n’a pas abouti. Réessaie dans un instant.';
}

export function ChatWorkspace({ initialConversations, initialBalance }: { initialConversations: Conversation[]; initialBalance: number | null }) {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState('Nouvelle conversation');
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedModel, setSelectedModel] = useState('auto');
  const [balance, setBalance] = useState(initialBalance);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [mobileHistory, setMobileHistory] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down'>>({});
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  const refreshConversations = useCallback(async () => {
    const response = await fetch('/api/chat/conversations', { cache: 'no-store' });
    if (response.status === 401) { window.location.assign('/login?next=%2Fchat'); return; }
    if (!response.ok) return;
    const payload = await response.json();
    setConversations(payload.conversations ?? []);
  }, []);

  useEffect(() => {
    let alive = true;
    fetch('/api/chat/models', { cache: 'no-store' }).then(async (response) => {
      if (response.status === 401) { window.location.assign('/login?next=%2Fchat'); return null; }
      if (!response.ok) return null;
      return response.json();
    }).then((payload) => { if (alive && payload) setModels(payload.models ?? []); }).catch(() => undefined);
    refreshConversations();
    return () => { alive = false; abortRef.current?.abort(); };
  }, [refreshConversations]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, busy]);
  const grouped = useMemo(() => {
    const filtered = conversations.filter((conversation) => conversation.title.toLowerCase().includes(search.toLowerCase()));
    return filtered.reduce<Record<string, Conversation[]>>((groups, conversation) => {
      const label = dateGroup(conversation.updated_at || conversation.created_at);
      (groups[label] ||= []).push(conversation);
      return groups;
    }, {});
  }, [conversations, search]);
  const hasModels = models.length > 0;

  function startNew() {
    abortRef.current?.abort(); setActiveId(null); setActiveTitle('Nouvelle conversation'); setMessages([]); setDraft(''); setError(''); setNotice(''); setMobileHistory(false);
  }

  async function openConversation(conversation: Conversation) {
    const response = await fetch(`/api/chat/conversations/${conversation.id}`, { cache: 'no-store' });
    if (response.status === 401) { window.location.assign('/login?next=%2Fchat'); return; }
    if (!response.ok) { setError(errorLabel('CONVERSATION_NOT_FOUND')); return; }
    const payload = await response.json();
    setActiveId(conversation.id); setActiveTitle(payload.conversation.title); setError(''); setNotice('');
    setMessages((payload.messages as StoredMessage[]).filter((item) => item.role === 'user' || item.role === 'assistant').map((item) => ({ id: item.id, role: item.role as 'user' | 'assistant', content: item.content, provider_used: item.provider_used, model: item.model_used })));
    setMobileHistory(false);
  }

  async function renameConversation(conversation: Conversation) {
    const title = window.prompt('Nouveau titre de la conversation', conversation.title)?.trim();
    if (!title || title === conversation.title) return;
    const response = await fetch(`/api/chat/conversations/${conversation.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title }) });
    if (!response.ok) { setError('Le titre n’a pas pu être modifié.'); return; }
    setActiveTitle(conversation.id === activeId ? title : activeTitle);
    await refreshConversations();
  }

  async function deleteConversation(conversation: Conversation) {
    if (!window.confirm(`Supprimer « ${conversation.title} » et son historique ?`)) return;
    const response = await fetch(`/api/chat/conversations/${conversation.id}`, { method: 'DELETE' });
    if (!response.ok) { setError('La conversation n’a pas pu être supprimée.'); return; }
    if (conversation.id === activeId) startNew();
    await refreshConversations();
  }

  async function sendText(text: string, history = messages) {
    const clean = text.trim();
    if (!clean || busy || !hasModels) return;
    setError(''); setNotice('');
    const userMessage: Message = { id: newId(), role: 'user', content: clean };
    const assistantMessage: Message = { id: newId(), role: 'assistant', content: '' };
    const next = [...history, userMessage];
    setMessages([...next, assistantMessage]); setActiveTitle(activeId ? activeTitle : clean.slice(0, 48)); setDraft(''); setBusy(true);
    const controller = new AbortController(); abortRef.current = controller;
    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST', signal: controller.signal,
        headers: { 'content-type': 'application/json', 'idempotency-key': `chat-ui:${newId()}` },
        body: JSON.stringify({ conversationId: activeId ?? undefined, model: selectedModel, messages: next.map(({ role, content }) => ({ role, content })) }),
      });
      if (response.status === 401) { window.location.assign('/login?next=%2Fchat'); return; }
      if (!response.ok) {
        let code = 'CHAT_STREAM_FAILED'; try { const payload = await response.json(); code = payload.error || code; } catch { /* réponse HTTP sans JSON */ }
        setMessages(next); setError(errorLabel(code)); return;
      }
      const returnedId = response.headers.get('x-prismai-conversation-id');
      if (returnedId) setActiveId(returnedId);
      const returnedBalance = Number(response.headers.get('x-prismai-balance'));
      if (Number.isFinite(returnedBalance)) setBalance(returnedBalance);
      const reader = response.body?.getReader();
      if (!reader) throw new Error('CHAT_STREAM_FAILED');
      const decoder = new TextDecoder(); let buffer = ''; let answer = ''; let usedModel = ''; let usedProvider = '';
      const handleEvent = (frame: string) => {
        const dataLine = frame.split('\n').find((line) => line.startsWith('data:'));
        if (!dataLine) return;
        const event = JSON.parse(dataLine.slice(5).trim());
        if (event.type === 'message.delta') {
          answer += event.text;
          setMessages([...next, { ...assistantMessage, content: answer, model: usedModel || null, provider_used: usedProvider || null }]);
        } else if (event.type === 'run.completed') {
          usedProvider = event.provider || ''; usedModel = event.model || '';
          setMessages([...next, { ...assistantMessage, content: answer, model: usedModel || null, provider_used: usedProvider || null }]);
        }
      };
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split('\n\n'); buffer = frames.pop() ?? '';
        for (const frame of frames) handleEvent(frame);
      }
      buffer += decoder.decode(); if (buffer.trim()) handleEvent(buffer);
      if (!answer) setMessages(next);
      if (usedModel || usedProvider) setNotice(`Réponse produite par ${usedProvider}${usedModel ? ` · ${usedModel}` : ''}.`);
      await refreshConversations();
    } catch (caught) {
      if (caught instanceof Error && caught.name === 'AbortError') { setMessages((current) => current.filter((message) => message.id !== assistantMessage.id)); setNotice('Génération arrêtée.'); }
      else { setMessages((current) => current.filter((message) => message.id !== assistantMessage.id)); setError(errorLabel('CHAT_STREAM_FAILED')); }
    } finally { if (abortRef.current === controller) abortRef.current = null; setBusy(false); }
  }

  function onSubmit(event: FormEvent) { event.preventDefault(); void sendText(draft); }
  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendText(draft); }
  }
  function stopGeneration() { abortRef.current?.abort(); }
  async function copyMessage(content: string) { try { await navigator.clipboard.writeText(content); setNotice('Réponse copiée.'); } catch { setNotice('La copie n’est pas disponible dans ce navigateur.'); } }
  function regenerate(messageIndex: number) {
    const lastUserIndex = messages.slice(0, messageIndex).map((message) => message.role).lastIndexOf('user');
    if (lastUserIndex < 0) return;
    const source = messages[lastUserIndex];
    void sendText(source.content, messages.slice(0, lastUserIndex));
  }

  return (
    <div className="chat-app">
      <aside className={`chat-rail ${mobileHistory ? 'chat-rail-open' : ''}`} aria-label="Navigation PrismAI">
        <div className="chat-brand"><Link href="/dashboard" className="chat-brand-link"><span className="prism" aria-hidden="true" /> PrismAI</Link><button type="button" className="chat-icon-button chat-collapse" aria-label="Fermer l’historique" onClick={() => setMobileHistory(false)}>×</button></div>
        <button type="button" className="chat-new-button" onClick={startNew}><span aria-hidden="true">＋</span> Nouvelle conversation</button>
        <label className="chat-search"><span aria-hidden="true">⌕</span><input aria-label="Rechercher une conversation" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher" /></label>
        <div className="chat-history" aria-label="Historique des conversations">
          {Object.entries(grouped).map(([group, items]) => <section className="chat-history-group" key={group}><h2>{group}</h2>{items.map((conversation) => <div className={`chat-history-row ${activeId === conversation.id ? 'active' : ''}`} key={conversation.id}><button type="button" className="chat-history-title" onClick={() => void openConversation(conversation)}>{conversation.title || 'Nouvelle conversation'}</button><details className="chat-history-menu"><summary aria-label={`Actions pour ${conversation.title}`}>•••</summary><div><button type="button" onClick={() => void renameConversation(conversation)}>Renommer</button><button type="button" onClick={() => void deleteConversation(conversation)}>Supprimer</button></div></details></div>)}</section>)}
          {Object.keys(grouped).length === 0 && <p className="chat-sidebar-empty">{search ? 'Aucun résultat.' : 'Tes discussions apparaîtront ici.'}</p>}
        </div>
        <nav className="chat-space-links" aria-label="Autres espaces"><span>ESPACES</span><Link href="/studio/image">▧ Image Studio</Link><Link href="/studio/video">◫ Vidéo Studio</Link><Link href="/studio/code">&lt;/&gt; Code Studio</Link><Link href="/studio/document">▤ Document Studio</Link><Link href="/chat">⌕ Recherche</Link><Link href="/chat">♧ Agents &amp; Mémoire</Link><Link href="/dashboard">□ Projets</Link></nav>
        <Link className="chat-profile" href="/dashboard"><span className="chat-avatar">P</span><span>Mon espace<small>{balance === null ? 'Crédits indisponibles' : `${balance.toLocaleString('fr-FR')} crédits`}</small></span><span aria-hidden="true">⚙</span></Link>
      </aside>

      <main className="chat-main-pane">
        <header className="chat-toolbar"><button type="button" className="chat-icon-button chat-mobile-history" aria-label="Ouvrir l’historique" onClick={() => setMobileHistory(true)}>☰</button><div className="chat-conversation-heading"><strong>{activeTitle}</strong><span>Conversation privée</span></div><div className="chat-toolbar-actions"><label className="chat-model-select"><span>Modèle</span><select aria-label="Choisir un modèle d’intelligence artificielle" value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)}><option value="auto">Automatique</option>{models.map((model) => <option value={model.id} key={model.id}>{model.label}</option>)}</select></label><span className="chat-credit-chip" title="Solde fourni par Supabase">◆ {balance === null ? '—' : balance.toLocaleString('fr-FR')}</span><Link className="chat-avatar chat-toolbar-avatar" href="/dashboard" aria-label="Profil et paramètres">P</Link></div></header>
        <section className="chat-thread" aria-label="Messages de la conversation" aria-live="polite">
          {messages.length === 0 ? <div className="chat-welcome"><div className="chat-welcome-prism"><span className="prism" aria-hidden="true" /></div><p className="chat-eyebrow">CHAT PRISMAI</p><h1>Une idée, plusieurs perspectives.</h1><p className="chat-welcome-copy">Pose ta question. PrismAI choisira un modèle configuré, ou suivra ton choix manuel avec un fallback contrôlé.</p>
            <div className="chat-suggestions">{SUGGESTIONS.map((suggestion) => <button type="button" key={suggestion} onClick={() => void sendText(suggestion)} disabled={!hasModels}>{suggestion}<span aria-hidden="true">↗</span></button>)}</div>
            {!hasModels && <div className="chat-provider-empty"><strong>Aucun modèle IA n’est configuré.</strong><span>Ajoute une clé fournisseur côté serveur (Groq, Gemini, OpenRouter ou Mistral) pour activer l’envoi. Aucun modèle fictif n’est affiché.</span></div>}
          </div> : <div className="chat-message-list">{messages.map((message, index) => <article className={`chat-message chat-message-${message.role}`} key={message.id}><div className="chat-message-avatar" aria-hidden="true">{message.role === 'assistant' ? <span className="prism" /> : 'M'}</div><div className="chat-message-body"><div className="chat-message-meta"><strong>{message.role === 'assistant' ? 'PrismAI' : 'Vous'}</strong>{message.role === 'assistant' && message.provider_used && <span>{message.provider_used}{message.model ? ` · ${message.model}` : ''}</span>}</div>{message.content ? <MarkdownMessage content={message.content} /> : busy && message.role === 'assistant' ? <span className="chat-thinking"><i /><i /><i /> Réflexion en cours…</span> : null}
              {message.role === 'assistant' && message.content && <div className="chat-message-actions"><button type="button" onClick={() => void copyMessage(message.content)} aria-label="Copier la réponse">Copier</button>{index === messages.length - 1 && <button type="button" onClick={() => regenerate(index)} disabled={busy || !hasModels}>Régénérer</button>}<button type="button" className={feedback[message.id] === 'up' ? 'selected' : ''} onClick={() => setFeedback((current) => ({ ...current, [message.id]: 'up' }))} aria-label="Réponse utile">Utile</button><button type="button" className={feedback[message.id] === 'down' ? 'selected' : ''} onClick={() => setFeedback((current) => ({ ...current, [message.id]: 'down' }))} aria-label="Réponse à améliorer">À améliorer</button></div>}
            </div></article>)}</div>}
          {error && <div className="chat-alert" role="alert">{error}{!hasModels && error.includes('Aucun fournisseur') ? null : <button type="button" onClick={() => setError('')}>Fermer</button>}</div>}
          {notice && <p className="chat-status" role="status">{notice}</p>}
          <div ref={bottomRef} />
        </section>
        <form className="chat-composer" onSubmit={onSubmit}><textarea ref={textAreaRef} aria-label="Écrire un message" value={draft} onChange={(event) => { setDraft(event.target.value); event.currentTarget.style.height = 'auto'; event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 220)}px`; }} onKeyDown={onComposerKeyDown} placeholder={hasModels ? 'Écris ton message…' : 'Configure un provider IA pour commencer…'} rows={1} disabled={!hasModels || busy} /><div className="chat-composer-footer"><span>Entrée pour envoyer · Maj + Entrée pour une nouvelle ligne · Les fichiers ne sont pas encore pris en charge</span>{busy ? <button type="button" className="chat-stop-button" onClick={stopGeneration}>■ Arrêter</button> : <button type="submit" className="chat-send-button" disabled={!draft.trim() || !hasModels} aria-label="Envoyer le message">Envoyer <span aria-hidden="true">↑</span></button>}</div></form>
        <p className="chat-disclaimer">Les réponses peuvent contenir des erreurs. Vérifie les informations importantes.</p>
      </main>
      {mobileHistory && <button className="chat-backdrop" aria-label="Fermer l’historique" onClick={() => setMobileHistory(false)} />}
    </div>
  );
}
