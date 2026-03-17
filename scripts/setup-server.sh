#!/bin/bash
# Quant Trader 서버 한 번 설정 스크립트 (Ubuntu)
# 사용법: 서버에 접속한 뒤, quant_trader 폴더 안에서  bash scripts/setup-server.sh

set -e
echo "=== 1. Node.js 설치 확인 ==="
if ! command -v node &> /dev/null; then
  echo "Node.js가 없습니다. 설치합니다..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
node -v
npm -v

echo ""
echo "=== 2. 프로젝트 의존성 설치 ==="
npm install

echo ""
echo "=== 3. 빌드 ==="
npm run build

echo ""
echo "=== 4. PM2 설치 (서버 꺼져도 앱이 계속 돌게) ==="
sudo npm install -g pm2

echo ""
echo "=== 5. 앱 실행 (포트 3003) ==="
pm2 delete quant-trader 2>/dev/null || true
pm2 start npm --name "quant-trader" -- start
pm2 save

echo ""
echo "✅ 설정 끝. 대시보드 주소: http://15.135.65.106:3003"
echo "   (AWS 보안 그룹에서 3003 포트 열어야 접속 가능)"
echo ""
echo "서버 재부팅 후에도 자동 실행하려면, 아래에 나오는 'sudo ...' 한 줄을"
echo "복사해서 한 번 더 실행하세요."
pm2 startup
