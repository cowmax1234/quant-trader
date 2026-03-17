import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import {
  getMarketSnapshot,
  recordMarketData,
  type MarketSnapshot,
} from "@/lib/marketContext";
import {
  getPortfolioSnapshot,
  recordPortfolioLog,
  type PortfolioSnapshot,
} from "@/lib/portfolio";
import { FEES_CONTEXT_FOR_AI } from "@/lib/fees";

const QUANT_PERSONA =
  "너는 냉철한 퀀트 트레이더다. 사용자의 시드 5,000만 원을 기준으로 현재 김치 프리미엄(김프)과 바이낸스 펀딩비를 분석해, 최적의 포지션(델타 뉴트럴 vs 네이키드 롱/숏)을 원화 기대 수익과 함께 제안해라. 반드시 거래 수수료를 차감한 Net Profit(순 수익)만 제시하라. 답변은 한국어로, 수치와 근거를 명확히 제시하라.";

export type ChatMessage = { role: "user" | "model"; content: string };

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "http://localhost:3003",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function buildQuantContext(
  market: MarketSnapshot,
  portfolio: PortfolioSnapshot
): string {
  const usdKrw = market.usdKrwRate ?? 0;
  const totalBalanceKrw =
    portfolio.upbitKrwBalance +
    portfolio.binanceUsdtBalance * (usdKrw > 0 ? usdKrw : 0);

  const lines: string[] = [
    "[현재 포트폴리오 (Supabase 기준)]",
    `시드(원화): ${portfolio.totalSeedKrw.toLocaleString("ko-KR")}원`,
    `Upbit KRW 잔고: ${portfolio.upbitKrwBalance.toLocaleString("ko-KR")}원`,
    `Binance USDT 잔고: ${portfolio.binanceUsdtBalance.toLocaleString("en-US", { maximumFractionDigits: 2 })} USDT`,
    `총 자산(원화 환산): ${totalBalanceKrw.toLocaleString("ko-KR")}원`,
    "",
    "[실시간 퀀트 지표]",
    `Upbit BTC/KRW(호가 중간가): ${market.upbitBtcKrw != null ? market.upbitBtcKrw.toLocaleString("ko-KR") : "—"}원`,
    `Binance BTC/USDT(호가 중간가): ${market.binanceBtcUsdt != null ? market.binanceBtcUsdt.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—"} USDT`,
    `환율(1 USD = X KRW): ${market.usdKrwRate != null ? market.usdKrwRate.toLocaleString("ko-KR") : "—"}원`,
    `김치 프리미엄: ${market.kimchiPremium != null ? market.kimchiPremium.toFixed(2) + "%" : "—"}`,
    `바이낸스 펀딩비(BTCUSDT, 8시간당 %): ${market.fundingRate != null ? (market.fundingRate * 100).toFixed(4) + "%" : "—"} (API 원본은 소수이므로 ×100 해서 %로 표기함)`,
    "",
    FEES_CONTEXT_FOR_AI,
    "",
    "위 데이터와 수수료를 반드시 반영해 포지션과 수수료 차감 후 원화 기대 수익(Net Profit)을 제안하라.",
  ];
  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY가 설정되지 않았습니다. .env에 추가해 주세요." },
      { status: 503, headers: CORS_HEADERS }
    );
  }

  let body: { message?: string; history?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "요청 본문이 올바른 JSON이 아닙니다." },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json(
      { error: "message 필드가 비어 있습니다." },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const history: ChatMessage[] = Array.isArray(body.history)
    ? body.history.filter(
        (m): m is ChatMessage =>
          m && typeof m.role === "string" && typeof m.content === "string"
      )
    : [];

  try {
    // 1) 시장 데이터 조회 → Supabase 기록
    const marketSnapshot = await getMarketSnapshot();
    await recordMarketData(marketSnapshot);

    // 2) 포트폴리오 조회 → Supabase 기록
    const portfolioSnapshot = await getPortfolioSnapshot();
    await recordPortfolioLog(portfolioSnapshot);

    // 3) Gemini 시스템 프롬프트에 퀀트 컨텍스트 주입
    const quantContext = buildQuantContext(marketSnapshot, portfolioSnapshot);
    const systemInstruction = `${QUANT_PERSONA}\n\n${quantContext}`;

    const ai = new GoogleGenAI({ apiKey });

    const contents: { role: "user" | "model"; parts: { text: string }[] }[] = [];
    for (const m of history) {
      contents.push({
        role: m.role,
        parts: [{ text: m.content }],
      });
    }
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.5,
      },
    });

    const text = response.text ?? "";
    return NextResponse.json({ text }, { headers: CORS_HEADERS });
  } catch (e) {
    console.error("[api/chat]", e);
    const err = e as { message?: string; status?: number };
    return NextResponse.json(
      {
        error:
          err?.message ?? "Gemini 응답 생성 중 오류가 발생했습니다.",
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
