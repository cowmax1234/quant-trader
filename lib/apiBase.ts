/**
 * 로컬 개발 시 API 요청을 EC2로 보낼 때 사용.
 * .env.local에 NEXT_PUBLIC_DEV_API_URL=http://15.135.65.106:3003 넣으면
 * 브라우저가 해당 주소로 /api/* 요청을 보냄 (EC2에 CORS 설정됨).
 */
export function getApiBase(): string {
  if (typeof window === "undefined") return "";
  return process.env.NEXT_PUBLIC_DEV_API_URL ?? "";
}
