import { NextResponse } from "next/server";
import { getMarketSnapshot } from "@/lib/marketContext";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "http://localhost:3003",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/** GET: 현재 시장 스냅샷 (비트코인, 환율 등) - 대시보드/채팅 화면 표시용 */
export async function GET() {
  try {
    const snapshot = await getMarketSnapshot();
    return NextResponse.json(snapshot, { headers: CORS_HEADERS });
  } catch (e) {
    console.error("[api/context]", e);
    return NextResponse.json(
      { error: "시장 데이터를 불러오지 못했습니다." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
