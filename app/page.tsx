export default function HomePage() {
  return (
    <div style={styles.wrapper}>
      <header style={styles.header}>
        <h1 style={styles.title}>Quant Trader</h1>
        <p style={styles.subtitle}>Upbit · Binance API 연동 대시보드</p>
      </header>
      <section style={styles.section}>
        <p style={styles.lead}>
          왼쪽 메뉴에서 <strong>자산 현황</strong>을 선택하면 Upbit·Binance 보유 자산을 확인할 수 있습니다.
        </p>
      </section>
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
  section: { maxWidth: 560 },
  lead: {
    fontSize: "1rem",
    lineHeight: 1.6,
    color: "var(--text)",
  },
};
