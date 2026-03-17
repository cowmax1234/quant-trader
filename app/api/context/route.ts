import { NextResponse } from "next/server";
import { getMarketSnapshot } from "@/lib/marketContext";

/** GET: 현재 시장 스냅샷 (비트코인, 환율 등) - 대시보드/채팅 화면 표시용 */
export async function GET() {
  try {
    const snapshot = await getMarketSnapshot();
    return NextResponse.json(snapshot);
  } catch (e) {
    console.error("[api/context]", e);
    return NextResponse.json(
      { error: "시장 데이터를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
