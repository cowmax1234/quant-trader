/**
 * 포트폴리오 스냅샷: Upbit KRW 잔고, Binance USDT 잔고.
 * 시드 5,000만 원 기준 추적 및 Supabase portfolio_log 기록.
 */

import { getUpbitAccounts, isUpbitConfigured } from "@/lib/upbit";
import { getBinanceAccount, isBinanceConfigured } from "@/lib/binance";

const DEFAULT_SEED_KRW = 50_000_000;

export type PortfolioSnapshot = {
  totalSeedKrw: number;
  upbitKrwBalance: number;
  binanceUsdtBalance: number;
  fetchedAt: string;
};

function parseBalance(s: string | undefined): number {
  if (s == null || s === "") return 0;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

/** Upbit KRW 잔고 + Binance USDT 잔고 조회 (API 키 필요) */
export async function getPortfolioSnapshot(): Promise<PortfolioSnapshot> {
  const totalSeedKrw =
    typeof process.env.QUANT_SEED_KRW !== "undefined"
      ? Number(process.env.QUANT_SEED_KRW)
      : DEFAULT_SEED_KRW;

  let upbitKrwBalance = 0;
  let binanceUsdtBalance = 0;

  if (isUpbitConfigured()) {
    const upbit = await getUpbitAccounts();
    if (upbit.ok) {
      const krw = upbit.accounts.find((a) => a.currency === "KRW");
      upbitKrwBalance = parseBalance(krw?.balance) + parseBalance(krw?.locked);
    }
  }

  if (isBinanceConfigured()) {
    const binance = await getBinanceAccount();
    if (binance.ok) {
      const usdt = binance.account.balances.find(
        (b) => b.asset.toUpperCase() === "USDT"
      );
      binanceUsdtBalance =
        parseBalance(usdt?.free) + parseBalance(usdt?.locked);
    }
  }

  return {
    totalSeedKrw,
    upbitKrwBalance,
    binanceUsdtBalance,
    fetchedAt: new Date().toISOString(),
  };
}

/** Supabase portfolio_log 테이블에 삽입 */
export async function recordPortfolioLog(
  snapshot: PortfolioSnapshot
): Promise<void> {
  const { supabase, isSupabaseConfigured } = await import("@/lib/supabase");
  if (!isSupabaseConfigured() || !supabase) return;

  await supabase.from("portfolio_log").insert({
    total_seed_krw: snapshot.totalSeedKrw,
    upbit_krw_balance: snapshot.upbitKrwBalance,
    binance_usdt_balance: snapshot.binanceUsdtBalance,
  });
}
