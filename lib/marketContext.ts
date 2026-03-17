/**
 * 시장 컨텍스트: 비트코인 가격, 환율, 거시 이슈 요약을 수집해
 * Gemini에 넘길 수 있는 텍스트로 포맷합니다.
 * API 키 없이 사용 가능한 공개 API만 사용합니다.
 */

const UPBIT_TICKER_URL =
  "https://api.upbit.com/v1/ticker?markets=KRW-BTC,KRW-USDT";
const COINGECKO_BTC_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true";

export type MarketSnapshot = {
  btcKrw: number | null;
  btcUsd: number | null;
  btcChange24h: number | null;
  usdtKrw: number | null; // 환율 근사
  fetchedAt: string;
};

/** Upbit 공개 API로 KRW-BTC, KRW-USDT 시세 조회 */
async function fetchUpbitTicker(): Promise<{
  btcKrw: number | null;
  usdtKrw: number | null;
}> {
  try {
    const res = await fetch(UPBIT_TICKER_URL);
    if (!res.ok) return { btcKrw: null, usdtKrw: null };
    const data = (await res.json()) as Array<{
      market: string;
      trade_price: number;
      signed_change_rate?: number;
    }>;
    const btc = data.find((t) => t.market === "KRW-BTC");
    const usdt = data.find((t) => t.market === "KRW-USDT");
    return {
      btcKrw: btc?.trade_price ?? null,
      usdtKrw: usdt?.trade_price ?? null,
    };
  } catch {
    return { btcKrw: null, usdtKrw: null };
  }
}

/** CoinGecko 공개 API로 BTC/USD 및 24h 변동률 조회 */
async function fetchBtcUsd(): Promise<{
  btcUsd: number | null;
  btcChange24h: number | null;
}> {
  try {
    const res = await fetch(COINGECKO_BTC_URL);
    if (!res.ok) return { btcUsd: null, btcChange24h: null };
    const data = (await res.json()) as {
      bitcoin?: { usd?: number; usd_24h_change?: number };
    };
    const btc = data.bitcoin;
    return {
      btcUsd: btc?.usd ?? null,
      btcChange24h: btc?.usd_24h_change ?? null,
    };
  } catch {
    return { btcUsd: null, btcChange24h: null };
  }
}

/** 현재 시장 스냅샷 반환 (캐시 권장: 1분) */
export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  const [upbit, coingecko] = await Promise.all([
    fetchUpbitTicker(),
    fetchBtcUsd(),
  ]);
  return {
    btcKrw: upbit.btcKrw,
    btcUsd: coingecko.btcUsd,
    btcChange24h: coingecko.btcChange24h,
    usdtKrw: upbit.usdtKrw,
    fetchedAt: new Date().toISOString(),
  };
}

/** Gemini 시스템 프롬프트에 넣을 시장 컨텍스트 문자열 생성 */
export function formatMarketContextForGemini(snapshot: MarketSnapshot): string {
  const lines: string[] = [
    "[오늘의 시장 데이터 (참고용)]",
    `수집 시각: ${new Date(snapshot.fetchedAt).toLocaleString("ko-KR")}`,
  ];
  if (snapshot.btcKrw != null) {
    lines.push(`비트코인(KRW): ${snapshot.btcKrw.toLocaleString("ko-KR")}원`);
  }
  if (snapshot.btcUsd != null) {
    lines.push(`비트코인(USD): $${snapshot.btcUsd.toLocaleString()}`);
  }
  if (snapshot.btcChange24h != null) {
    const pct = (snapshot.btcChange24h * 100).toFixed(2);
    lines.push(`비트코인 24h 변동: ${pct}%`);
  }
  if (snapshot.usdtKrw != null) {
    lines.push(`환율(USDT/KRW 근사): ${snapshot.usdtKrw.toLocaleString("ko-KR")}원`);
  }
  lines.push(
    "",
    "위 데이터를 바탕으로 사용자 질문에 답할 때 시장 상황을 반영해 주세요. 거시경제는 별도 뉴스/데이터 소스가 없으면 일반적인 맥락으로 설명해도 됩니다."
  );
  return lines.join("\n");
}

/** 채팅 시 사용할 전체 시장 컨텍스트 문자열 (스냅샷 조회 포함) */
export async function getMarketContextText(): Promise<string> {
  const snapshot = await getMarketSnapshot();
  return formatMarketContextForGemini(snapshot);
}
