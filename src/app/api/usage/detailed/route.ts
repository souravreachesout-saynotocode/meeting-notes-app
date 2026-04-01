import { NextResponse } from "next/server";
import { createServerClient, createAuthClient } from "@/lib/supabase/server";
import { format, subDays } from "date-fns";

export async function GET() {
  const authSupabase = await createAuthClient();
  const { data: { user } } = await authSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = createServerClient();
  const thirtyDaysAgo = subDays(new Date(), 30);

  // Get all usage logs for last 30 days
  const { data: logs } = await supabase
    .from("usage_logs")
    .select("action, cost_cents, created_at")
    .eq("user_id", user.id)
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: true });

  if (!logs || logs.length === 0) {
    return NextResponse.json({
      daily: [],
      byService: {},
      totalCost: 0,
      totalCalls: 0,
      projectedMonthly: 0,
      avgDailyCost: 0,
    });
  }

  // Group by day
  const dailyMap = new Map<string, { date: string; cost: number; calls: number }>();
  const serviceMap: Record<string, { calls: number; cost: number }> = {};
  let totalCost = 0;

  for (const log of logs) {
    const dateKey = format(new Date(log.created_at), "yyyy-MM-dd");
    const dateLabel = format(new Date(log.created_at), "MMM d");
    const cost = Number(log.cost_cents);

    // Daily
    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, { date: dateLabel, cost: 0, calls: 0 });
    }
    const day = dailyMap.get(dateKey)!;
    day.cost += cost;
    day.calls += 1;

    // By service
    const service = log.action;
    if (!serviceMap[service]) serviceMap[service] = { calls: 0, cost: 0 };
    serviceMap[service].calls += 1;
    serviceMap[service].cost += cost;

    totalCost += cost;
  }

  // Fill in missing days with zeros
  const daily: { date: string; cost: number; calls: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = subDays(new Date(), i);
    const key = format(d, "yyyy-MM-dd");
    const label = format(d, "MMM d");
    daily.push(dailyMap.get(key) || { date: label, cost: 0, calls: 0 });
  }

  // Calculate projections
  const daysWithData = dailyMap.size;
  const avgDailyCost = daysWithData > 0 ? totalCost / daysWithData : 0;
  const projectedMonthly = avgDailyCost * 30;

  // Today's cost
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const todayCost = dailyMap.get(todayKey)?.cost || 0;
  const todayCalls = dailyMap.get(todayKey)?.calls || 0;

  return NextResponse.json({
    daily,
    byService: serviceMap,
    totalCost: (totalCost / 100).toFixed(2),
    totalCalls: logs.length,
    projectedMonthly: (projectedMonthly / 100).toFixed(2),
    avgDailyCost: (avgDailyCost / 100).toFixed(4),
    todayCost: (todayCost / 100).toFixed(4),
    todayCalls,
  });
}
