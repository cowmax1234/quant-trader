/**
 * Binance Spot REST API 클라이언트 (서버 전용)
 * API 키는 환경 변수에서만 로드 (BINANCE_API_KEY, BINANCE_API_SECRET)
 */

import crypto from "crypto";

const BINANCE_BASE = "https://api.binance.com/api/v3";

function createSignature(secretKey: string, queryString: string): string {
  return crypto.createHmac("sha256", secretKey).update(queryString).digest("hex");
}

export type BinanceBalance = {
  asset: string;
  free: string;
  locked: string;
};

export type BinanceAccountInfo = {
  balances: BinanceBalance[];
  updateTime: number;
};

export async function getBinanceAccount(): Promise<
  | { ok: true; account: BinanceAccountInfo }
  | { ok: false; error: string }
> {
  const apiKey = process.env.BINANCE_API_KEY;
  const apiSecret = process.env.BINANCE_API_SECRET;
  if (!apiKey || !apiSecret) {
    return {
      ok: false,
      error: "BINANCE_API_KEY 또는 BINANCE_API_SECRET이 설정되지 않았습니다.",
    };
  }

  try {
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    const signature = createSignature(apiSecret, queryString);
    const url = `${BINANCE_BASE}/account?${queryString}&signature=${signature}`;
    const res = await fetch(url, {
      headers: {
        "X-MBX-APIKEY": apiKey,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Binance API 오류 (${res.status}): ${text}` };
    }
    const account: BinanceAccountInfo = await res.json();
    return { ok: true, account };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `요청 실패: ${message}` };
  }
}

export function isBinanceConfigured(): boolean {
  return !!(process.env.BINANCE_API_KEY && process.env.BINANCE_API_SECRET);
}
