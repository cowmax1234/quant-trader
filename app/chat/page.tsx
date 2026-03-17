"use client";

import { useEffect, useState, useRef } from "react";
import { getApiBase } from "@/lib/apiBase";
import { fetchJson } from "@/lib/fetchJson";

type ChatMessage = { role: "user" | "model"; content: string };
type MarketSnapshot = {
  btcKrw: number | null;
  btcUsd: number | null;
  btcChange24h: number | null;
  usdtKrw: number | null;
  fetchedAt: string;
};

function formatNum(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1e8) return `${(n / 1e8).toFixed(1)}억`;
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 0 });
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<MarketSnapshot | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const base = getApiBase();
    fetchJson<MarketSnapshot | { error?: string }>(`${base}/api/context`)
      .then((data) => setContext("error" in data ? null : data))
      .catch(() => setContext(null));
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    setError(null);

    const base = getApiBase();
    try {
      const res = await fetch(`${base}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages,
        }),
      });
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new Error("서버가 JSON 대신 HTML을 반환했습니다. API 경로·배포를 확인하세요.");
      }
      const data = await res.json() as { error?: string; text?: string };

      if (!res.ok) {
        setError(data.error ?? "응답을 받지 못했습니다.");
        setMessages((prev) => prev.slice(0, -1));
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "model", content: data.text || "(응답 없음)" },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "요청 실패");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.wrapper}>
      <header style={styles.header}>
        <h1 style={styles.title}>시장 인사이트</h1>
        <p style={styles.subtitle}>
          거시경제·환율·비트코인 등 시장 데이터를 반영한 AI와 대화하세요
        </p>
      </header>

      {context && (
        <section style={styles.contextCard}>
          <div style={styles.contextTitle}>현재 시장 요약</div>
          <div style={styles.contextGrid}>
            {context.btcKrw != null && (
              <span>BTC/KRW: {formatNum(context.btcKrw)}원</span>
            )}
            {context.btcUsd != null && (
              <span>BTC/USD: ${formatNum(context.btcUsd)}</span>
            )}
            {context.btcChange24h != null && (
              <span>
                24h: {(context.btcChange24h * 100).toFixed(2)}%
              </span>
            )}
            {context.usdtKrw != null && (
              <span>USDT/KRW: {formatNum(context.usdtKrw)}원</span>
            )}
          </div>
        </section>
      )}

      <div style={styles.chatCard}>
        <div ref={listRef} style={styles.messageList}>
          {messages.length === 0 && !loading && (
            <p style={styles.placeholder}>
              질문을 입력하세요. 예: &quot;오늘 비트코인 흐름 어떻게 돼?&quot;,
              &quot;환율이 BTC에 미치는 영향은?&quot;
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                ...styles.message,
                ...(m.role === "user" ? styles.messageUser : styles.messageModel),
              }}
            >
              <span style={styles.messageRole}>
                {m.role === "user" ? "나" : "AI"}
              </span>
              <div
                style={{
                  ...styles.messageContent,
                  ...(m.role === "user"
                    ? { background: "var(--upbit)", color: "#000" }
                    : { background: "var(--border)" }),
                }}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ ...styles.message, ...styles.messageModel }}>
              <span style={styles.messageRole}>AI</span>
              <div style={styles.messageContent}>답변 생성 중…</div>
            </div>
          )}
        </div>

        {error && <p style={styles.errorText}>{error}</p>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="메시지 입력..."
            style={styles.input}
            disabled={loading}
          />
          <button type="submit" style={styles.button} disabled={loading}>
            전송
          </button>
        </form>
      </div>

      <footer style={styles.footer}>
        <p style={styles.footerText}>
          AI는 투자 조언을 하지 않습니다. 시장 데이터는 참고용이며, 실제
          매매 결정은 본인 책임입니다.
        </p>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    flex: 1,
    minHeight: "100vh",
    padding: "2rem 1.5rem",
    display: "flex",
    flexDirection: "column",
  },
  header: { marginBottom: "1.5rem" },
  title: {
    fontSize: "1.75rem",
    fontWeight: 700,
    letterSpacing: "-0.02em",
    marginBottom: "0.25rem",
  },
  subtitle: { color: "var(--muted)", fontSize: "0.95rem" },
  contextCard: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "0.75rem 1rem",
    marginBottom: "1rem",
  },
  contextTitle: {
    fontSize: "0.8rem",
    color: "var(--muted)",
    marginBottom: "0.5rem",
  },
  contextGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.75rem 1.25rem",
    fontSize: "0.9rem",
  },
  chatCard: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minHeight: 320,
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    overflow: "hidden",
  },
  messageList: {
    flex: 1,
    overflow: "auto",
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  placeholder: {
    color: "var(--muted)",
    fontSize: "0.9rem",
    margin: "auto 0",
  },
  message: {
    maxWidth: "85%",
    alignSelf: "flex-start",
  },
  messageUser: { alignSelf: "flex-end" },
  messageModel: {},
  messageRole: {
    fontSize: "0.75rem",
    color: "var(--muted)",
    marginBottom: "0.25rem",
    display: "block",
  },
  messageContent: {
    padding: "0.6rem 0.9rem",
    borderRadius: "var(--radius)",
    fontSize: "0.95rem",
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  errorText: {
    color: "var(--error)",
    fontSize: "0.85rem",
    padding: "0 1rem 0.5rem",
  },
  form: {
    display: "flex",
    gap: "0.5rem",
    padding: "1rem",
    borderTop: "1px solid var(--border)",
  },
  input: {
    flex: 1,
    padding: "0.6rem 0.9rem",
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
    background: "var(--bg)",
    color: "var(--text)",
    fontSize: "0.95rem",
  },
  button: {
    padding: "0.6rem 1.2rem",
    borderRadius: "var(--radius)",
    border: "none",
    background: "var(--upbit)",
    color: "#000",
    fontWeight: 600,
    fontSize: "0.9rem",
    cursor: "pointer",
  },
  footer: { marginTop: "1rem" },
  footerText: { color: "var(--muted)", fontSize: "0.8rem" },
};
