# Git으로 EC2 배포하기 (WinSCP 수동 대신)

한 번만 설정해 두면, 이후에는 **PC에서 push → 서버에서 한 줄**만 실행하면 배포됩니다.

---

## 1단계: 한 번만 할 일 (최초 설정)

### 1-1. GitHub 비공개 저장소 만들기

1. **https://github.com** 로그인 (본인 계정)
2. **New repository** → 이름 예: `quant-trader`
3. **Private** 선택 → **Create repository**
4. 저장소가 만들어지면 **URL**이 보임 (예: `https://github.com/본인아이디/quant-trader.git`)

### 1-2. 로컬 PC에서 Git 초기화 + 첫 push

**PowerShell**을 열고 프로젝트 폴더로 이동한 뒤, 아래를 **한 줄씩** 실행하세요.

```powershell
cd C:\Users\ksy\OneDrive\문서\quant_trader
```

Git이 아직 없으면 설치 후, 아래 순서대로:

```powershell
git init
git add .
git status
```

`.env`, `.env.local`, `node_modules`는 `.gitignore`에 있어서 자동으로 제외됩니다.  
`git status`에서 보이는 파일만 올라가면 됩니다.

```powershell
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/cowmax1234/quant-trader.git
git push -u origin main
```

- `본인아이디/quant-trader` 부분을 **본인 저장소 URL**로 바꾸세요.
- GitHub 로그인(또는 토큰) 요청이 나오면 입력합니다.

### 1-3. 서버(EC2)에서 한 번만 설정

**SSH로 서버 접속** (키 경로는 본인에 맞게):

```powershell
cd C:\Users\ksy\OneDrive\Desktop
ssh -i "my-quant-key.pem" ubuntu@15.135.65.106
```

접속된 뒤, **기존 폴더 이름을 바꾸고** 클론합니다 (이미 ZIP으로 올린 `quant_trader`가 있다면):

```bash
mv quant_trader quant_trader_backup
git clone https://github.com/본인아이디/quant-trader.git quant_trader
cd quant_trader
```

- GitHub **비공개** 저장소면, 클론 시 **로그인/토큰**이 필요할 수 있습니다.  
  (나중에 **Personal Access Token** 쓰면, `https://토큰@github.com/본인아이디/quant-trader.git` 형태로 clone 가능)

**.env 복사** (예전에 서버에 만들어 둔 .env가 있다면):

```bash
cp ../quant_trader_backup/.env .env
```

없다면 `nano .env` 로 다시 만듭니다.

**의존성 설치 + 빌드 + PM2 실행** (한 번만):

```bash
npm install
npm run build
pm2 delete quant-trader 2>/dev/null; pm2 start npm --name "quant-trader" -- start
pm2 save
```

`pm2 startup` 안내가 나오면 나온 **sudo ...** 한 줄도 한 번 실행해 두세요.

이후부터는 **2단계**만 반복하면 됩니다.

---

## 2단계: 배포할 때마다 (일상)

### 방법 A: 한 번에 배포 (권장)

PC에서 **PowerShell**로 아래 한 줄만 실행하면, **로컬에서 커밋·push → 로컬 빌드 → 서버에 .next 업로드 → pm2 재시작**까지 자동으로 진행됩니다.  
(서버 t2.micro는 메모리 부족으로 빌드가 실패할 수 있어, 로컬 빌드 결과를 zip으로 올리는 방식입니다.)

```powershell
cd C:\Users\ksy\OneDrive\문서\quant_trader
.\scripts\deploy.ps1
```

커밋 메시지를 넣으려면:

```powershell
.\scripts\deploy.ps1 "CORS 추가 및 채팅 수정"
```

SSH 키가 `C:\Users\ksy\OneDrive\Desktop\my-quant-key.pem` 이 아닐 경우, 배포 전에:

```powershell
$env:DEPLOY_SSH_KEY = "C:\경로\본인키.pem"
.\scripts\deploy.ps1
```

끝나면 **http://15.135.65.106:3003** 에서 확인하면 됩니다.

---

### 방법 B: Git만 올리고, 서버에서 빌드

**PC에서:** 코드만 올리기

```powershell
cd C:\Users\ksy\OneDrive\문서\quant_trader
git add .
git commit -m "메시지 아무거나"
git push
```

**서버에서:** SSH 접속한 뒤 한 줄 실행 (서버 메모리가 충분할 때만 성공할 수 있음)

```bash
cd ~/quant_trader/quant_trader && git pull && npm install && npm run build && pm2 restart quant-trader
```

서버에서 `npm run build` 시 SIGBUS(메모리 부족)가 나면 **방법 A**를 사용하세요.

---

## (선택) 서버만 배포 스크립트 쓰기

서버에 `scripts/deploy.sh` 가 있으면, **서버에 SSH 접속한 뒤** 이렇게만 해도 됩니다 (로컬에서 방법 A 대신 수동으로 push 후 서버에서만 실행할 때):

```bash
cd ~/quant_trader/quant_trader
bash scripts/deploy.sh
```

단, t2.micro에서는 `npm run build` 가 메모리 부족으로 실패할 수 있으므로, **일상 배포는 PC에서 `.\scripts\deploy.ps1` (방법 A)** 를 쓰는 것을 권장합니다.

---

## 요약

| 구분 | 할 일 |
|------|--------|
| **최초 1회** | GitHub 저장소 생성 → 로컬 `git init` & push → 서버에서 clone & .env & npm install & pm2 start (빌드는 로컬에서 후에 방법 A로 올림) |
| **이후 배포 (권장)** | PC에서: `cd 프로젝트폴더` 후 `.\scripts\deploy.ps1` 한 번 실행 (커밋·push·로컬 빌드·업로드·pm2 재시작 자동) |
| **이후 배포 (수동)** | PC: `git push` / 서버: `cd ~/quant_trader/quant_trader && git pull && npm install && npm run build && pm2 restart quant-trader` (서버 빌드 가능할 때만) |

`.env`는 서버에만 두고, Git에는 절대 올리지 않습니다.
