/**
 * fetch 후 JSON 파싱. 서버가 HTML(404/에러 페이지)을 반환하면 명확한 에러 throw.
 */
export async function fetchJson<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, options);
  const contentType = res.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const text = await res.text();
    const preview = text.slice(0, 80).replace(/\s+/g, " ");
    throw new Error(
      `서버가 JSON 대신 HTML을 반환했습니다 (${res.status}). API 경로를 확인하세요. 배포가 최신인지 확인해 주세요.`
    );
  }

  return res.json() as Promise<T>;
}
