-- Quant Trader: 시장 데이터 및 포트폴리오 로그
-- 실행: Supabase Dashboard SQL Editor 또는 supabase db push

-- 시장 데이터 (실시간 호가 기반 김프·펀딩비)
CREATE TABLE IF NOT EXISTS market_data (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  upbit_btc_krw NUMERIC(18, 2) NOT NULL,
  binance_btc_usdt NUMERIC(18, 2) NOT NULL,
  usd_krw_rate NUMERIC(12, 4) NOT NULL,
  kimchi_premium NUMERIC(8, 4) NOT NULL,
  funding_rate NUMERIC(12, 8) NOT NULL
);

COMMENT ON TABLE market_data IS 'Upbit/Binance 호가·환율·김치프리미엄·바이낸스 펀딩비 스냅샷';
COMMENT ON COLUMN market_data.kimchi_premium IS '김치 프리미엄 (%)';
COMMENT ON COLUMN market_data.funding_rate IS 'Binance BTCUSDT 선물 펀딩비 (8시간당 %, 예: 0.01 = 0.01%). API 원본 소수×100 저장';

-- 포트폴리오 스냅샷 (시드·잔고 추적)
CREATE TABLE IF NOT EXISTS portfolio_log (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_seed_krw NUMERIC(18, 2) NOT NULL,
  upbit_krw_balance NUMERIC(18, 2) NOT NULL,
  binance_usdt_balance NUMERIC(18, 4) NOT NULL
);

COMMENT ON TABLE portfolio_log IS '시드 및 거래소별 원화/USDT 잔고 로그';

-- 인덱스 (최신 행 조회용)
CREATE INDEX IF NOT EXISTS idx_market_data_created_at ON market_data (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_log_created_at ON portfolio_log (created_at DESC);

-- RLS (선택) 서버는 service_role로 접근하므로 RLS 비활성화해도 됨. 필요 시 아래로 정책 추가.
-- ALTER TABLE market_data ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE portfolio_log ENABLE ROW LEVEL SECURITY;
