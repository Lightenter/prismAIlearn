import { redirect } from 'next/navigation';
import { getConfiguredModels } from '@prismai/provider-router';
import { ChatWorkspace } from './ChatWorkspace';
import { createSupabaseServerClient } from '../../lib/supabaseServer';

type ConversationRow = { id: string; title: string; created_at: string; updated_at: string };
type CreditSummary = { total_available?: number | string | null };

export default async function ChatPage() {
  const supabase = createSupabaseServerClient();
  if (!supabase) redirect('/login?next=%2Fchat');
  let user;
  try { const result = await supabase.auth.getUser(); user = result.data.user; } catch { redirect('/login?next=%2Fchat'); }
  if (!user) redirect('/login?next=%2Fchat');
  const [conversationResult, creditSummaryResult] = await Promise.all([
    supabase.from('conversations').select('id,title,created_at,updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(100),
    supabase.rpc('get_my_credit_summary'),
  ]);
  const summary = Array.isArray(creditSummaryResult.data) ? creditSummaryResult.data[0] as CreditSummary | undefined : undefined;
  const balanceValue = summary?.total_available;
  const balance = balanceValue === null || balanceValue === undefined ? null : Number(balanceValue);
  return <ChatWorkspace initialConversations={(conversationResult.data ?? []) as ConversationRow[]} initialBalance={Number.isFinite(balance) ? balance : null} chatAvailable={getConfiguredModels().length > 0} />;
}
