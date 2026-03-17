/**
 * 차익거래 수수료 (수석 퀀트 팩트 체크 반영)
 * Net Profit (%) = |Target KP - Current KP| - Σ Fees
 * 왕복 진입/청산 시 최소 0.3% ~ 0.4% 비용 감안 필요.
 */

/** 업비트 현물 매수 수수료 (%) */
export const UPBIT_SPOT_FEE_PCT = 0.05;

/** 바이낸스 전송용 코인(XRP/TRX) 교환 + 전송 수수료 (%) */
export const BINANCE_TRANSFER_FEE_PCT = 0.1;

/** 바이낸스 선물 지정가 수수료 (%) */
export const BINANCE_FUTURES_LIMIT_FEE_PCT = 0.02;

/** 바이낸스 선물 시장가 수수료 (%) */
export const BINANCE_FUTURES_MARKET_FEE_PCT = 0.05;

/** 왕복 최소 합계 (보수적) (%) */
export const ROUND_TRIP_FEE_PCT_MIN = 0.3;

/** 왕복 최대 합계 (%) */
export const ROUND_TRIP_FEE_PCT_MAX = 0.4;

/** AI용 수수료 설명 문자열 (시스템 프롬프트 주입) */
export const FEES_CONTEXT_FOR_AI = [
  "[거래 수수료 (원화 기대 수익 계산 시 반드시 차감)]",
  `업비트 현물 매수: ${UPBIT_SPOT_FEE_PCT}%`,
  `바이낸스 전송(교환+송금): 약 ${BINANCE_TRANSFER_FEE_PCT}%`,
  `바이낸스 선물(숏) 지정가: ${BINANCE_FUTURES_LIMIT_FEE_PCT}%, 시장가: ${BINANCE_FUTURES_MARKET_FEE_PCT}%`,
  `왕복 진입/청산 합계: 약 ${ROUND_TRIP_FEE_PCT_MIN}% ~ ${ROUND_TRIP_FEE_PCT_MAX}% (시드 5천만 원 기준 약 15만~20만 원).`,
  "Net Profit (%) = |목표 김프 - 현재 김프| - 위 수수료 합계. 단순 김프 1% ≠ 50만 원 수익임을 명시하고, 수수료 차감 후 원화 기대 수익을 제시하라.",
].join("\n");
