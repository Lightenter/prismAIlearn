import type { PlanTier } from '@prismai/provider-router';

/** Le rôle vient de profiles et non du corps HTTP; un rôle absent reste limité au niveau FREE. */
export async function getChatPlanTier(supabase: any, userId: string): Promise<PlanTier> {
  const { data, error } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
  if (error) throw Object.assign(new Error('PLAN_LOOKUP_FAILED'), { code: 'PLAN_LOOKUP_FAILED' });
  return data?.role === 'premium' ? 'PRO' : 'FREE';
}
