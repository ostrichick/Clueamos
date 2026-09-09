# 🌐 Clueamos 웹 배포 가이드 (Vercel 무료 배포)

Clueamos는 최신 Next.js 기반으로 구축되어 있어, **Vercel**을 통해 클릭 몇 번만으로 무료로 웹에 배포하고 어디서나 접속할 수 있는 고유 도메인(URL)을 발급받을 수 있습니다.

---

## 🚀 3분 만에 배포하는 방법

### 1단계: Vercel 접속 및 로그인
1. [https://vercel.com](https://vercel.com) 사이트에 접속합니다.
2. 우측 상단의 **[Sign Up]** 또는 **[Log In]**을 누르고 **[Continue with GitHub]**를 선택하여 로그인합니다.

### 2단계: GitHub 저장소 불러오기
1. Vercel 대시보드에서 **[Add New...]** ➔ **[Project]** 버튼을 클릭합니다.
2. 목록에서 `ostrichick/Clueamos` 저장소를 찾은 후 **[Import]** 버튼을 누릅니다.
   *(만약 저장소가 안 보이면 'Configure GitHub App'을 눌러 Clueamos 저장소 접근 권한을 허용해 주세요)*

### 3단계: 배포 버튼 클릭
1. 프로젝트 설정 화면이 나타나면 기본 설정(Next.js 자동 인식) 그대로 둡니다.
2. 맨 아래의 **[Deploy]** 버튼을 클릭합니다.
3. 약 1분 정도 빌드가 진행된 후, 축하 화면과 함께 웹 주소(예: `https://clueamos.vercel.app`)가 생성됩니다!

---

## 📱 아내와 함께 접속하여 플레이하기
* 발급된 주소를 아내분의 스마트폰, 태블릿, 혹은 노트북 카카오톡으로 전송하세요.
* 이제 언제 어디서든 둘만의 미스터리 보드게임을 즐기실 수 있습니다.
* GitHub에 새로운 코드를 푸시(`git push`)할 때마다 Vercel이 자동으로 감지하여 최신 버전으로 자동 업데이트(CI/CD)됩니다.
