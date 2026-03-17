# 한 번에 배포: 로컬 git push + 로컬 빌드 + 서버에 .next 업로드 + pm2 재시작
# 사용: .\scripts\deploy.ps1 [커밋메시지]
# (커밋메시지 생략 시 "deploy" 로 커밋)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path $PSScriptRoot -Parent
Set-Location $ProjectRoot

$CommitMsg = if ($args.Count -gt 0) { $args[0] } else { "deploy" }
$Key = if ($env:DEPLOY_SSH_KEY) { $env:DEPLOY_SSH_KEY } else { "C:\Users\ksy\OneDrive\Desktop\my-quant-key.pem" }
$Server = "ubuntu@15.135.65.106"
$RemotePath = "~/quant_trader/quant_trader"

Write-Host "=== 1. Git add & commit & push ===" -ForegroundColor Cyan
git add -A
$status = git status --short
if (-not $status) {
  Write-Host "변경 사항 없음. 빌드만 진행합니다." -ForegroundColor Yellow
} else {
  git commit -m $CommitMsg
  git push
}

Write-Host "`n=== 2. 로컬 npm run build ===" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n=== 3. .next 압축 ===" -ForegroundColor Cyan
$zipPath = Join-Path $ProjectRoot "next.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path (Join-Path $ProjectRoot ".next") -DestinationPath $zipPath -Force

Write-Host "`n=== 4. 서버로 업로드 (scp) ===" -ForegroundColor Cyan
scp -i $Key -o StrictHostKeyChecking=no $zipPath "${Server}:${RemotePath}/next.zip"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n=== 5. 서버에서 압축 해제 & pm2 재시작 ===" -ForegroundColor Cyan
ssh -i $Key -o StrictHostKeyChecking=no $Server "cd $RemotePath && rm -rf .next && unzip -o next.zip && sudo chown -R ubuntu:ubuntu .next && sudo chmod -R 755 .next && pm2 restart quant-trader"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n배포 완료. http://15.135.65.106:3003 확인하세요." -ForegroundColor Green
