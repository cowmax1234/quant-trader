"use client";

import { useEffect, useState, useRef } from "react";
import { getApiBase } from "@/lib/apiBase";
import { fetchJson } from "@/lib/fetchJson";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type MarketRow = {
  created_at: string;
  upbit_btc_krw: number;
  binance_btc_usdt: number;
  usd_krw_rate: number;
  kimchi_premium: number;
  funding_rate: number;
};

type PortfolioRow = {
  created_at: string;
  total_seed_krw: number;
  upbit_krw_balance: number;
  binance_usdt_balance: number;
};

type ChatMessage = { role: "user" | "model"; content: string };

const SEED_KRW = 50_000_000;

function formatNum(n: number): string {
  if (n >= 1e8) return `${(n / 1e8).toFixed(1)}억`;
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 0 });
}

/** 펀딩비 APR = 8시간당 % × 하루 3회 × 365일 */
function fundingRateToAprPercent(fundingPercentPer8h: number): number {
  return fundingPercentPer8h * 3 * 365;
}

export default function DashboardPage() {
  const [market, setMarket] = useState<MarketRow | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioRow | null>(null);
  const [marketData24h, setMarketData24h] = useState<
    { created_at: string; kimchi_premium: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const base = getApiBase();
    fetchJson<{ error?: string; market?: MarketRow | null; portfolio?: PortfolioRow | null; marketData24h?: { created_at: string; kimchi_premium: number }[] }>(`${base}/api/dashboard`)
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setMarket(data.market ?? null);
        setPortfolio(data.portfolio ?? null);
        setMarketData24h(data.marketData24h ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "로드 실패"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const totalBalanceKrw =
    market && portfolio
      ? portfolio.upbit_krw_balance +
        portfolio.binance_usdt_balance * market.usd_krw_rate
      : 0;
  const returnPct =
    SEED_KRW > 0 ? ((totalBalanceKrw - SEED_KRW) / SEED_KRW) * 100 : 0;
  const aprPct =
    market != null ? fundingRateToAprPercent(market.funding_rate) : null;

  const chartData = marketData24h.map((d) => ({
    time: new Date(d.created_at).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    김치프리미엄: Number(d.kimchi_premium?.toFixed(2) ?? 0),
  }));

  async function handleChatSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || chatLoading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setChatLoading(true);
    setChatError(null);

    const base = getApiBase();
    try {
      const res = await fetch(`${base}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: messages }),
      });
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error("서버가 JSON 대신 HTML을 반환했습니다. API 경로·배포를 확인하세요.");
      }
      const data = await res.json() as { error?: string; text?: string };

      if (!res.ok) {
        setChatError(data.error ?? "응답을 받지 못했습니다.");
        setMessages((prev) => prev.slice(0, -1));
        return;
      }
      setMessages((prev) => [
        ...prev,
        { role: "model", content: data.text || "(응답 없음)" },
      ]);
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "요청 실패");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setChatLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={styles.wrapper}>
        <p style={styles.muted}>대시보드 로딩 중…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.wrapper}>
        <p style={styles.errorText}>{error}</p>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <header style={styles.header}>
        <h1 style={styles.title}>지휘 통제실 (Dashboard)</h1>
        <p style={styles.subtitle}>
          Supabase 시장·포트폴리오 데이터 기반 퀀트 대시보드
        </p>
      </header>

      {/* Top: 핵심 지표 카드 */}
      <section style={styles.cardsGrid}>
        <div style={styles.card}>
          <div style={styles.cardLabel}>총 자산 (KRW)</div>
          <div style={styles.cardValue}>
            {formatNum(totalBalanceKrw)}원
          </div>
          <div
            style={{
              ...styles.cardSub,
              color: returnPct >= 0 ? "var(--upbit)" : "var(--error)",
            }}
          >
            시드 대비 {returnPct >= 0 ? "+" : ""}
            {returnPct.toFixed(2)}%
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardLabel}>현재 김치 프리미엄</div>
          <div
            style={{
              ...styles.cardValue,
              color:
                market?.kimchi_premium != null
                  ? market.kimchi_premium < 0
                    ? "#3b82f6"
                    : "#ef5350"
                  : "var(--text)",
            }}
          >
            {market?.kimchi_premium != null
              ? `${market.kimchi_premium.toFixed(2)}%`
              : "—"}
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardLabel}>펀딩비 (APR 환산)</div>
          <div style={styles.cardValue}>
            {aprPct != null ? `${aprPct.toFixed(1)}%` : "—"}
          </div>
          <div style={styles.cardSub}>
            8h당 % × 3 × 365
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardLabel}>실시간 환율 (USD/KRW)</div>
          <div style={styles.cardValue}>
            {market?.usd_krw_rate != null
              ? formatNum(market.usd_krw_rate) + "원"
              : "—"}
          </div>
        </div>
      </section>

      {/* 24h 김치 프리미엄 추이 */}
      <section style={styles.chartSection}>
        <h2 style={styles.sectionTitle}>최근 24시간 김치 프리미엄 추이</h2>
        <div style={styles.chartWrap}>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="time"
                stroke="var(--muted)"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke="var(--muted)"
                fontSize={12}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                }}
                labelStyle={{ color: "var(--text)" }}
                formatter={(value: number) => [`${value}%`, "김치프리미엄"]}
              />
              <Line
                type="monotone"
                dataKey="김치프리미엄"
                stroke="var(--upbit)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 퀀트 AI 채팅 */}
      <section style={styles.chatSection}>
        <h2 style={styles.sectionTitle}>퀀트 AI 채팅</h2>
        <p style={styles.muted}>
          예: &quot;현재 포지션 어떻게 잡을까?&quot; — 김프·펀딩비·수수료 반영
          답변
        </p>
        <div style={styles.chatCard}>
          <div ref={listRef} style={styles.messageList}>
            {messages.length === 0 && !chatLoading && (
              <p style={styles.placeholder}>질문을 입력하세요.</p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  ...styles.message,
                  ...(m.role === "user"
                    ? styles.messageUser
                    : styles.messageModel),
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
            {chatLoading && (
              <div style={{ ...styles.message, ...styles.messageModel }}>
                <span style={styles.messageRole}>AI</span>
                <div style={styles.messageContent}>답변 생성 중…</div>
              </div>
            )}
          </div>
          {chatError && (
            <p style={styles.errorText}>{chatError}</p>
          )}
          <form onSubmit={handleChatSubmit} style={styles.form}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="메시지 입력..."
              style={styles.input}
              disabled={chatLoading}
            />
            <button
              type="submit"
              style={styles.button}
              disabled={chatLoading}
            >
              전송
            </button>
          </form>
        </div>
      </section>
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
    gap: "1.5rem",
  },
  header: { marginBottom: "0.5rem" },
  title: {
    fontSize: "1.75rem",
    fontWeight: 700,
    letterSpacing: "-0.02em",
    marginBottom: "0.25rem",
  },
  subtitle: { color: "var(--muted)", fontSize: "0.95rem" },
  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "1rem",
  },
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "1rem 1.25rem",
  },
  cardLabel: {
    fontSize: "0.8rem",
    color: "var(--muted)",
    marginBottom: "0.35rem",
  },
  cardValue: {
    fontSize: "1.35rem",
    fontWeight: 700,
  },
  cardSub: {
    fontSize: "0.8rem",
    color: "var(--muted)",
    marginTop: "0.25rem",
  },
  chartSection: {},
  sectionTitle: {
    fontSize: "1.1rem",
    fontWeight: 600,
    marginBottom: "0.75rem",
  },
  chartWrap: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "1rem",
  },
  chatSection: {},
  muted: { fontSize: "0.9rem", color: "var(--muted)", marginBottom: "0.5rem" },
  chatCard: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  messageList: {
    maxHeight: 320,
    overflowY: "auto",
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  message: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  messageUser: { alignItems: "flex-end" },
  messageModel: { alignItems: "flex-start" },
  messageRole: {
    fontSize: "0.75rem",
    color: "var(--muted)",
  },
  messageContent: {
    padding: "0.6rem 0.9rem",
    borderRadius: 8,
    fontSize: "0.95rem",
    maxWidth: "85%",
    whiteSpace: "pre-wrap",
  },
  placeholder: {
    color: "var(--muted)",
    fontSize: "0.9rem",
    padding: "1rem",
  },
  errorText: { color: "var(--error)", fontSize: "0.9rem", padding: "0 1rem" },
  form: {
    display: "flex",
    gap: "0.5rem",
    padding: "1rem",
    borderTop: "1px solid var(--border)",
  },
  input: {
    flex: 1,
    padding: "0.6rem 0.9rem",
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--text)",
    fontSize: "0.95rem",
  },
  button: {
    padding: "0.6rem 1.2rem",
    background: "var(--upbit)",
    color: "#000",
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    cursor: "pointer",
  },
};
