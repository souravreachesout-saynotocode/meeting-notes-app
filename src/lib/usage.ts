import { createServerClient } from "@/lib/supabase/server";

// Cost estimates per API call (in cents)
const COSTS = {
  "whisper-transcription": 0.6, // ~$0.006/min, avg 1 min per call
  "claude-summarize": 1.5,      // ~$0.015 per summary (input + output tokens)
  "claude-chat": 0.5,           // ~$0.005 per chat message
  "claude-digest": 2.0,         // ~$0.02 per weekly digest
  "openai-embedding": 0.002,    // ~$0.00002 per embedding
} as const;

export type UsageAction = keyof typeof COSTS;

export async function trackUsage(
  userId: string,
  action: UsageAction,
  metadata?: Record<string, unknown>
) {
  const supabase = createServerClient();

  await supabase.from("usage_logs").insert({
    user_id: userId,
    action,
    cost_cents: COSTS[action],
    metadata: metadata || {},
  });
}

export async function getUserUsage(userId: string) {
  const supabase = createServerClient();

  // This month's usage
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("usage_logs")
    .select("action, cost_cents")
    .eq("user_id", userId)
    .gte("created_at", startOfMonth.toISOString());

  const summary: Record<string, { count: number; cost: number }> = {};
  let totalCost = 0;

  for (const row of data || []) {
    if (!summary[row.action]) summary[row.action] = { count: 0, cost: 0 };
    summary[row.action].count++;
    summary[row.action].cost += Number(row.cost_cents);
    totalCost += Number(row.cost_cents);
  }

  return { summary, totalCost, totalCostDollars: (totalCost / 100).toFixed(2) };
}
