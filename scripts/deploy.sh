#!/bin/bash
# 서버에서 배포할 때: cd ~/quant_trader && bash scripts/deploy.sh
# Windows 줄바꿈 제거: sed -i 's/\r$//' scripts/deploy.sh (서버에서 한 번만)
set -e
cd "$(dirname "$0")/.."
echo "=== git pull ==="
git pull
echo "=== npm install ==="
npm install
echo "=== npm run build ==="
npm run build
echo "=== pm2 restart ==="
pm2 restart quant-trader
echo "✅ 배포 끝. http://15.135.65.106:3003 확인하세요."
