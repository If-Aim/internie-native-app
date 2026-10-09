# Internie

<img src="src/assets/logo/internie_Logo.png" alt="Internie 로고" width="220">

Internie는 대학생의 인턴십과 대외활동 경험을 일정, 음성 기록, 브이로그로 정리하는 React Native 모바일 앱입니다. 학생은 활동 일정을 관리하고 질문에 음성으로 답변하며, 영상으로 경험을 남길 수 있습니다. 대외활동에서는 과제 제출, 출석, 미션과 순위, 알림을 한곳에서 확인합니다.

이 저장소에는 Android와 iOS 앱 코드가 포함되어 있습니다. 백엔드 서버, 음성 인식 처리 서버, 영상 처리 서버는 포함되어 있지 않으며, 관련 기능을 사용하려면 호환되는 API 서버와 외부 서비스 설정이 필요합니다.

## 주요 기능

| 영역 | 기능 |
| --- | --- |
| 계정 | 일반 회원가입·로그인, 카카오·Google 로그인, iOS Apple 로그인, 이메일 인증, 아이디 찾기, 비밀번호 재설정 |
| 온보딩·프로필 | 학교 및 관심 직무·기업 설정, 프로필 수정, 학생증 이미지로 재학생 인증 신청, 수료증 조회 |
| 일정·활동 기록 | 일정 등록·수정·삭제, 월별 일정 조회, 일별 메모와 기록 확인 |
| 음성 답변 | 활동별 질문 조회, 음성 녹음과 업로드, 서버를 통한 음성의 텍스트 변환 |
| 브이로그 | 인턴십 프로젝트 생성, 주차별 미션 촬영 및 자유 클립 추가, 클립 제목·순서·최종 영상 포함 여부 편집, 영상 내보내기·다운로드 |
| 대외활동 | 활동 대시보드, 과제 및 첨부파일 제출, 출석 체크, 리더보드와 미션 증빙 제출, 알림 조회 |
| 알림·언어 | Firebase Cloud Messaging 연동, 알림 대상 화면 이동, 한국어·영어 지원 |

## 기술 구성

| 구분 | 사용 기술 |
| --- | --- |
| 앱 | React Native 0.83 계열, React 19.2, TypeScript |
| 화면 이동 | React Navigation Native Stack |
| UI·애니메이션 | Gesture Handler, Reanimated, Worklets, SVG |
| API 통신 | Fetch 기반 공통 클라이언트, JWT 만료 확인 및 토큰 자동 갱신 |
| 인증 저장 | `react-native-keychain`으로 액세스·리프레시 토큰 저장, AsyncStorage로 온보딩 상태 저장 |
| 미디어 | Vision Camera, Nitro Sound, Image Picker, Video, 파일·썸네일 처리 라이브러리 |
| 다국어 | i18next, react-i18next, react-native-localize |
| 네이티브 연동 | Android Kotlin 및 iOS Swift 로그인 브리지, Kakao SDK, Google 로그인, Firebase Messaging |
| 개발 도구 | React Native CLI, Metro, ESLint, Jest |

React Native CLI 프로젝트이며, 네이티브 SDK를 사용하는 기능은 Android 또는 iOS 빌드가 필요합니다.

## 디렉터리 구조

```text
internie/
    android/                Android 프로젝트 및 로그인 모듈
    ios/                    iOS 프로젝트 및 로그인 브리지
    src/
        api/                공통 API, 대외활동 API, 브이로그 API
        assets/             로고, 아이콘, 안내 이미지
        auth/               토큰 및 인증 상태 저장
        components/         공통 화면 컴포넌트
        i18n/               한국어·영어 번역과 언어 초기화
        navigation/         인증·온보딩·학생 화면 내비게이션
        notifications/      푸시 권한, 기기 토큰 및 알림 연동
        screens/
            auth/           로그인, 회원가입, 계정 복구, 온보딩
            student/        홈, 일정, 질문, 마이페이지, 브이로그, 대외활동
        theme/              공통 스타일, 날짜 및 한국어 조사 처리
        types/              환경변수 및 SVG 타입 선언
    __tests__/              Jest 테스트
    App.tsx                 앱 진입 컴포넌트
    .env.example            값이 제거된 환경변수 예시
```

