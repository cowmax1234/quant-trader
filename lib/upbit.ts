/**
 * Upbit REST API 클라이언트 (서버 전용)
 * API 키는 환경 변수에서만 로드 (UPBIT_ACCESS_KEY, UPBIT_SECRET_KEY)
 */

import crypto from "crypto";

const UPBIT_BASE = "https://api.upbit.com/v1";

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function createJwt(accessKey: string, secretKey: string, query?: string): string {
  const nonce = crypto.randomUUID();
  const alg = "HS256";
  const header = { alg, typ: "JWT" };
  const payload: Record<string, string> = {
    access_key: accessKey,
    nonce,
    query_hash_alg: "SHA512",
  };
  if (query) {
    payload.query_hash = crypto.createHash("sha512").update(query).digest("hex");
  }
  const encodedHeader = base64UrlEncode(Buffer.from(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(Buffer.from(JSON.stringify(payload)));
  const signInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(signInput)
    .digest();
  const encodedSig = base64UrlEncode(signature);
  return `${signInput}.${encodedSig}`;
}

export type UpbitAccount = {
  currency: string;
  balance: string;
  locked: string;
  avg_buy_price: string;
  avg_buy_price_modified: boolean;
  unit_currency: string;
};

export async function getUpbitAccounts(): Promise<
  { ok: true; accounts: UpbitAccount[] } | { ok: false; error: string }
> {
  const accessKey = process.env.UPBIT_ACCESS_KEY;
  const secretKey = process.env.UPBIT_SECRET_KEY;
  if (!accessKey || !secretKey) {
    return { ok: false, error: "UPBIT_ACCESS_KEY 또는 UPBIT_SECRET_KEY가 설정되지 않았습니다." };
  }

  try {
    const query = "";
    const token = createJwt(accessKey, secretKey, query);
    const res = await fetch(`${UPBIT_BASE}/accounts`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Upbit API 오류 (${res.status}): ${text}` };
    }
    const accounts: UpbitAccount[] = await res.json();
    return { ok: true, accounts };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `요청 실패: ${message}` };
  }
}

export function isUpbitConfigured(): boolean {
  return !!(process.env.UPBIT_ACCESS_KEY && process.env.UPBIT_SECRET_KEY);
}
