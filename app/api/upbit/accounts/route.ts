import { getUpbitAccounts, isUpbitConfigured } from "@/lib/upbit";
import { NextResponse } from "next/server";

export async function GET() {
  if (!isUpbitConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Upbit API 키가 설정되지 않았습니다.", configured: false },
      { status: 200 }
    );
  }
  const result = await getUpbitAccounts();
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, configured: true },
      { status: 200 }
    );
  }
  return NextResponse.json({
    ok: true,
    configured: true,
    accounts: result.accounts,
  });
}
