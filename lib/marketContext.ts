/**
 * 퀀트 지표: Upbit/Binance 실시간 호가 기반 김치 프리미엄, 환율, 펀딩비.
 * 수학 공식: Kimchi Premium = (Upbit_BTC_KRW / (Binance_BTC_USDT * USD_KRW_Rate) - 1) * 100
 */

const UPBIT_ORDERBOOK_URL = "https://api.upbit.com/v1/orderbook?markets=KRW-BTC";
const BINANCE_ORDERBOOK_URL =
  "https://api.binance.com/api/v3/depth?symbol=BTCUSDT&limit=5";
const BINANCE_FUNDING_URL =
  "https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT";
const EXCHANGERATE_API_BASE = "https://v6.exchangerate-api.com/v6";

export type MarketSnapshot = {
  upbitBtcKrw: number | null;
  binanceBtcUsdt: number | null;
  usdKrwRate: number | null;
  kimchiPremium: number | null;
  fundingRate: number | null;
  fetchedAt: string;
};

/** Upbit 호가에서 중간가 (매수1·매도1 평균) */
async function fetchUpbitBtcKrw(): Promise<number | null> {
  try {
    const res = await fetch(UPBIT_ORDERBOOK_URL);
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{
      orderbook_units: Array<{ bid_price: number; ask_price: number }>;
    }>;
    const unit = data[0]?.orderbook_units?.[0];
    if (!unit) return null;
    const mid = (unit.bid_price + unit.ask_price) / 2;
    return mid;
  } catch {
    return null;
  }
}

/** Binance 호가에서 중간가 */
async function fetchBinanceBtcUsdt(): Promise<number | null> {
  try {
    const res = await fetch(BINANCE_ORDERBOOK_URL);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      bids: [string, string][];
      asks: [string, string][];
    };
    const bestBid = data.bids?.[0]?.[0];
    const bestAsk = data.asks?.[0]?.[0];
    if (!bestBid || !bestAsk) return null;
    return (parseFloat(bestBid) + parseFloat(bestAsk)) / 2;
  } catch {
    return null;
  }
}

/** 환율: 1 USD = X KRW. ExchangeRate-API 또는 Upbit KRW-USDT 티커 폴백 */
async function fetchUsdKrwRate(): Promise<number | null> {
  const apiKey = process.env.EXCHANGERATE_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch(
        `${EXCHANGERATE_API_BASE}/${apiKey}/latest/USD`
      );
      if (!res.ok) return null;
      const data = (await res.json()) as {
        conversion_rates?: { KRW?: number };
        result?: string;
      };
      const krw = data.conversion_rates?.KRW;
      if (typeof krw === "number" && krw > 0) return krw;
    } catch {
      // fallback below
    }
  }
  // 폴백: Upbit KRW-USDT 시세로 USD≈USDT 가정
  try {
    const res = await fetch(
      "https://api.upbit.com/v1/ticker?markets=KRW-USDT"
    );
    if (!res.ok) return null;
    const arr = (await res.json()) as Array<{ trade_price: number }>;
    const price = arr[0]?.trade_price;
    return typeof price === "number" && price > 0 ? price : null;
  } catch {
    return null;
  }
}

/** Binance BTCUSDT 선물 펀딩비 (소수, 예: 0.0001 = 0.01%) */
async function fetchBinanceFundingRate(): Promise<number | null> {
  try {
    const res = await fetch(BINANCE_FUNDING_URL);
    if (!res.ok) return null;
    const data = (await res.json()) as { lastFundingRate?: string };
    const rate = data.lastFundingRate;
    if (rate == null) return null;
    const num = parseFloat(rate);
    return Number.isFinite(num) ? num : null;
  } catch {
    return null;
  }
}

/**
 * 김치 프리미엄 (%) 공식:
 * Kimchi Premium = ( Upbit_BTC_KRW / (Binance_BTC_USDT * USD_KRW_Rate) - 1 ) * 100
 * USD_KRW_Rate = 1 USD당 KRW (원화)
 */
export function computeKimchiPremium(
  upbitBtcKrw: number,
  binanceBtcUsdt: number,
  usdKrwRate: number
): number {
  if (binanceBtcUsdt <= 0 || usdKrwRate <= 0) return 0;
  const impliedKrw = binanceBtcUsdt * usdKrwRate;
  return ((upbitBtcKrw / impliedKrw - 1) * 100);
}

/** 실시간 시장 스냅샷 (호가·환율·펀딩비·김프) */
export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  const [upbitBtcKrw, binanceBtcUsdt, usdKrwRate, fundingRate] =
    await Promise.all([
      fetchUpbitBtcKrw(),
      fetchBinanceBtcUsdt(),
      fetchUsdKrwRate(),
      fetchBinanceFundingRate(),
    ]);

  const kimchiPremium =
    upbitBtcKrw != null &&
    binanceBtcUsdt != null &&
    usdKrwRate != null &&
    upbitBtcKrw > 0 &&
    binanceBtcUsdt > 0 &&
    usdKrwRate > 0
      ? computeKimchiPremium(upbitBtcKrw, binanceBtcUsdt, usdKrwRate)
      : null;

  return {
    upbitBtcKrw: upbitBtcKrw ?? null,
    binanceBtcUsdt: binanceBtcUsdt ?? null,
    usdKrwRate: usdKrwRate ?? null,
    kimchiPremium,
    fundingRate: fundingRate ?? null,
    fetchedAt: new Date().toISOString(),
  };
}

/** Supabase market_data 테이블에 삽입 후 동일 행 반환 (선택) */
export async function recordMarketData(
  snapshot: MarketSnapshot
): Promise<MarketSnapshot> {
  const { supabase, isSupabaseConfigured } = await import("@/lib/supabase");
  if (!isSupabaseConfigured() || !supabase) return snapshot;

  const kimchi = snapshot.kimchiPremium ?? 0;
  // 바이낸스 lastFundingRate는 소수(0.0001 = 8시간당 0.01%). DB에는 % 단위로 저장해 AI/대시보드 혼동 방지.
  const fundingPercentPer8h = ((snapshot.fundingRate ?? 0) * 100);

  await supabase.from("market_data").insert({
    upbit_btc_krw: snapshot.upbitBtcKrw ?? 0,
    binance_btc_usdt: snapshot.binanceBtcUsdt ?? 0,
    usd_krw_rate: snapshot.usdKrwRate ?? 0,
    kimchi_premium: kimchi,
    funding_rate: fundingPercentPer8h,
  });

  return snapshot;
}

/** 대시보드/기존 API 호환: btcKrw, btcUsd, btcChange24h, usdtKrw (일부 null 가능) */
export async function getMarketSnapshotLegacy(): Promise<{
  btcKrw: number | null;
  btcUsd: number | null;
  btcChange24h: number | null;
  usdtKrw: number | null;
  fetchedAt: string;
}> {
  const s = await getMarketSnapshot();
  return {
    btcKrw: s.upbitBtcKrw,
    btcUsd: s.binanceBtcUsdt,
    btcChange24h: null,
    usdtKrw: s.usdKrwRate,
    fetchedAt: s.fetchedAt,
  };
}
