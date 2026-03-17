import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "http://localhost:3003",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/** GET: 대시보드용 — 최신 market_data, portfolio_log, 최근 24h 김치 프리미엄 추이 */
export async function GET() {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: "Supabase가 설정되지 않았습니다." },
      { status: 503, headers: CORS_HEADERS }
    );
  }

  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [marketRes, portfolioRes, historyRes] = await Promise.all([
      supabase
        .from("market_data")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("portfolio_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("market_data")
        .select("created_at, kimchi_premium")
        .gte("created_at", since24h)
        .order("created_at", { ascending: true }),
    ]);

    const market = marketRes.data ?? null;
    const portfolio = portfolioRes.data ?? null;
    const marketData24h = historyRes.data ?? [];

    return NextResponse.json(
      { market, portfolio, marketData24h },
      { headers: CORS_HEADERS }
    );
  } catch (e) {
    console.error("[api/dashboard]", e);
    return NextResponse.json(
      { error: "대시보드 데이터를 불러오지 못했습니다." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
