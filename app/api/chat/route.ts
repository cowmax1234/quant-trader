import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getMarketContextText } from "@/lib/marketContext";

const BASE_SYSTEM =
  "당신은 퀀트 트레이딩 대시보드의 AI 어시스턴트입니다. " +
  "사용자는 Upbit·Binance 등에서 암호화폐를 거래합니다. " +
  "질문에 친절하고 간결하게 답하되, 투자 조언·매매 권유는 하지 말고 정보 제공에만 그치세요. " +
  "답변은 한국어로 해주세요.";

export type ChatMessage = { role: "user" | "model"; content: string };

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "http://localhost:3003",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
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
    const marketContext = await getMarketContextText();
    const systemInstruction = `${BASE_SYSTEM}\n\n${marketContext}`;

    const ai = new GoogleGenAI({ apiKey });

    // 대화 이력 + 현재 사용자 메시지를 Content 배열로 구성
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
      model: "gemini-2.0-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
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
