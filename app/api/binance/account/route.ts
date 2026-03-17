import { getBinanceAccount, isBinanceConfigured } from "@/lib/binance";
import { NextResponse } from "next/server";

export async function GET() {
  if (!isBinanceConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Binance API 키가 설정되지 않았습니다.", configured: false },
      { status: 200 }
    );
  }
  const result = await getBinanceAccount();
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, configured: true },
      { status: 200 }
    );
  }
  return NextResponse.json({
    ok: true,
    configured: true,
    account: result.account,
  });
}
