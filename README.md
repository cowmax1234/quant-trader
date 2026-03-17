# Quant Trader

Upbit · Binance API와 AI 분석을 이용한 비트코인 자동 매매 시스템 (개인용)

## 대시보드 (API 연동)

연동 대시보드는 **localhost**에서만 실행합니다.

### 1. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 만들고 아래 값을 채웁니다. (키는 코드에 넣지 마세요.)

```bash
# .env.example을 복사한 뒤 값을 채움
cp .env.example .env
```

- **Upbit**: [업비트 Open API 관리](https://upbit.com/mypage/open_api_management)에서 Access Key, Secret Key 발급
- **Binance**: [API 관리](https://www.binance.com/en/my/settings/api-management)에서 API Key, Secret 발급

### 2. 설치 및 실행

```bash
npm install
npm run dev
```

브라우저에서 **http://localhost:3003** 로 접속합니다.

### 3. 대시보드에서 하는 일

- **Upbit / Binance** 각각 연동 상태(키 설정 여부, API 호출 성공 여부) 표시
- 연동된 경우 **보유 자산(잔고)** 목록 표시
- API 키는 서버(.env)에만 있고, 브라우저로 전달되지 않음

## 포트

- 개발 서버: **3003** (다른 로컬 프로젝트·회사 서비스와 겹치지 않도록 사용)

## 보안

- `.env`, `.env.local`, `*.pem` 등은 Git에 올리지 않음 (`.gitignore`에 포함됨)
- API 키·시크릿은 환경 변수로만 로드
