"use client";

import { useEffect, useState } from "react";
import { getApiBase } from "@/lib/apiBase";

type UpbitAccount = {
  currency: string;
  balance: string;
  locked: string;
  avg_buy_price: string;
  unit_currency: string;
};

type BinanceBalance = {
  asset: string;
  free: string;
  locked: string;
};

type UpbitState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; accounts: UpbitAccount[] }
  | { status: "error"; message: string }
  | { status: "not_configured" };

type BinanceState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; balances: BinanceBalance[] }
  | { status: "error"; message: string }
  | { status: "not_configured" };

function useUpbit() {
  const [state, setState] = useState<UpbitState>({ status: "idle" });
  const fetchUpbit = async () => {
    setState({ status: "loading" });
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/api/upbit/accounts`);
      const data = await res.json();
      if (data.configured === false) {
        setState({ status: "not_configured" });
        return;
      }
      if (!data.ok) {
        setState({ status: "error", message: data.error });
        return;
      }
      setState({ status: "ok", accounts: data.accounts });
    } catch (e) {
      setState({
        status: "error",
        message: e instanceof Error ? e.message : "요청 실패",
      });
    }
  };
  return [state, fetchUpbit] as const;
}

function useBinance() {
  const [state, setState] = useState<BinanceState>({ status: "idle" });
  const fetchBinance = async () => {
    setState({ status: "loading" });
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/api/binance/account`);
      const data = await res.json();
      if (data.configured === false) {
        setState({ status: "not_configured" });
        return;
      }
      if (!data.ok) {
        setState({ status: "error", message: data.error });
        return;
      }
      setState({ status: "ok", balances: data.account.balances });
    } catch (e) {
      setState({
        status: "error",
        message: e instanceof Error ? e.message : "요청 실패",
      });
    }
  };
  return [state, fetchBinance] as const;
}

function formatNum(s: string): string {
  const n = parseFloat(s);
  if (n === 0) return "0";
  if (n < 0.0001) return n.toExponential(2);
  if (n < 1) return n.toFixed(6);
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 4 });
}

export default function AssetsPage() {
  const [upbit, fetchUpbit] = useUpbit();
  const [binance, fetchBinance] = useBinance();

  useEffect(() => {
    fetchUpbit();
    fetchBinance();
  }, []);

  return (
    <div style={styles.wrapper}>
      <header style={styles.header}>
        <h1 style={styles.title}>자산 현황</h1>
        <p style={styles.subtitle}>Upbit · Binance 보유 자산</p>
      </header>

      <div style={styles.grid}>
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={{ ...styles.exchangeBadge, background: "var(--upbit)", color: "#000" }}>
              Upbit
            </span>
            {upbit.status === "idle" && <span style={styles.status}>대기 중</span>}
            {upbit.status === "loading" && <span style={styles.status}>연동 확인 중…</span>}
            {upbit.status === "not_configured" && (
              <span style={styles.statusMuted}>API 키 미설정</span>
            )}
            {upbit.status === "ok" && <span style={styles.statusOk}>연동됨</span>}
            {upbit.status === "error" && <span style={styles.statusError}>오류</span>}
          </div>
          {upbit.status === "not_configured" && (
            <p style={styles.hint}>
              .env에 UPBIT_ACCESS_KEY, UPBIT_SECRET_KEY를 설정한 뒤 서버를 재시작하세요.
            </p>
          )}
          {upbit.status === "error" && (
            <p style={styles.errorText}>{upbit.message}</p>
          )}
          {upbit.status === "ok" && (
            <div style={styles.balanceList}>
              {upbit.accounts
                .filter((a) => parseFloat(a.balance) > 0 || parseFloat(a.locked) > 0)
                .map((a) => (
                  <div key={a.currency} style={styles.balanceRow}>
                    <span style={styles.asset}>{a.currency}</span>
                    <span>
                      {formatNum(a.balance)}
                      {parseFloat(a.locked) > 0 && ` (잠금: ${formatNum(a.locked)})`}
                    </span>
                  </div>
                ))}
              {upbit.accounts.filter((a) => parseFloat(a.balance) > 0 || parseFloat(a.locked) > 0).length === 0 && (
                <p style={styles.muted}>보유 잔고 없음</p>
              )}
            </div>
          )}
          {(upbit.status === "ok" || upbit.status === "error") && (
            <button type="button" onClick={fetchUpbit} style={styles.button}>
              새로고침
            </button>
          )}
        </section>

        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={{ ...styles.exchangeBadge, background: "var(--binance)", color: "#000" }}>
              Binance
            </span>
            {binance.status === "idle" && <span style={styles.status}>대기 중</span>}
            {binance.status === "loading" && <span style={styles.status}>연동 확인 중…</span>}
            {binance.status === "not_configured" && (
              <span style={styles.statusMuted}>API 키 미설정</span>
            )}
            {binance.status === "ok" && <span style={styles.statusOk}>연동됨</span>}
            {binance.status === "error" && <span style={styles.statusError}>오류</span>}
          </div>
          {binance.status === "not_configured" && (
            <p style={styles.hint}>
              .env에 BINANCE_API_KEY, BINANCE_API_SECRET을 설정한 뒤 서버를 재시작하세요.
            </p>
          )}
          {binance.status === "error" && (
            <p style={styles.errorText}>{binance.message}</p>
          )}
          {binance.status === "ok" && (
            <div style={styles.balanceList}>
              {binance.balances
                .filter((b) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
                .map((b) => (
                  <div key={b.asset} style={styles.balanceRow}>
                    <span style={styles.asset}>{b.asset}</span>
                    <span>
                      {formatNum(b.free)}
                      {parseFloat(b.locked) > 0 && ` (잠금: ${formatNum(b.locked)})`}
                    </span>
                  </div>
                ))}
              {binance.balances.filter((b) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0).length === 0 && (
                <p style={styles.muted}>보유 잔고 없음</p>
              )}
            </div>
          )}
          {(binance.status === "ok" || binance.status === "error") && (
            <button type="button" onClick={fetchBinance} style={styles.button}>
              새로고침
            </button>
          )}
        </section>
      </div>

      <footer style={styles.footer}>
        <p style={styles.footerText}>
          API 키는 서버(.env)에만 있으며 브라우저로 전달되지 않습니다.
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
  },
  header: { marginBottom: "2rem" },
  title: {
    fontSize: "1.75rem",
    fontWeight: 700,
    letterSpacing: "-0.02em",
    marginBottom: "0.25rem",
  },
  subtitle: { color: "var(--muted)", fontSize: "0.95rem" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: "1.25rem",
    marginBottom: "2rem",
  },
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "1.25rem",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    marginBottom: "1rem",
  },
  exchangeBadge: {
    padding: "0.25rem 0.6rem",
    borderRadius: 6,
    fontSize: "0.8rem",
    fontWeight: 600,
  },
  status: { color: "var(--muted)", fontSize: "0.85rem" },
  statusMuted: { color: "var(--muted)", fontSize: "0.85rem" },
  statusOk: { color: "var(--upbit)", fontSize: "0.85rem", fontWeight: 600 },
  statusError: { color: "var(--error)", fontSize: "0.85rem" },
  hint: {
    color: "var(--muted)",
    fontSize: "0.85rem",
    lineHeight: 1.5,
    marginBottom: "0.75rem",
  },
  errorText: { color: "var(--error)", fontSize: "0.85rem", marginBottom: "0.75rem" },
  balanceList: { marginBottom: "1rem" },
  balanceRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "0.4rem 0",
    borderBottom: "1px solid var(--border)",
    fontSize: "0.9rem",
  },
  asset: { fontWeight: 600, color: "var(--text)" },
  muted: { color: "var(--muted)", fontSize: "0.9rem" },
  button: {
    background: "var(--border)",
    color: "var(--text)",
    border: "none",
    padding: "0.5rem 1rem",
    borderRadius: 6,
    fontSize: "0.85rem",
    cursor: "pointer",
  },
  footer: { borderTop: "1px solid var(--border)", paddingTop: "1rem" },
  footerText: { color: "var(--muted)", fontSize: "0.8rem" },
};
