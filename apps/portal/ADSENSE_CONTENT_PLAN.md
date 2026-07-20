# portal (pplaner.com) AdSense 승인용 콘텐츠 구축 작업계획서

> 대상 앱: `apps/portal` (Firebase hosting target `portal` → 도메인 `pplaner.com`)
> 목적: Google AdSense 심사 통과. 애드센스는 **루트 도메인(`pplaner.com`)** 기준으로 승인하며,
> 승인 시 `jprail.` / `p-plan.` 등 모든 하위 도메인이 자동 커버된다.
> 현재 거부 사유(추정): **홍보 1페이지 + 법적 페이지 부재 = "가치 낮은 콘텐츠(Low value content)"**.
> 이 문서의 목표는 그 부족한 콘텐츠 표면을 채우는 것이다. (AdSense 로더/ads.txt는 이미 연결 완료됨.)

---

## 0. 실행 에이전트가 반드시 먼저 알아야 할 제약

1. **Next.js 16 이다.** `apps/portal/AGENTS.md`가 경고한 대로 훈련 데이터와 다를 수 있다.
   코드 작성 전 `node_modules/next/dist/docs/` 의 관련 문서를 확인할 것.
2. **정적 익스포트(`output: 'export'`)** 다 (`apps/portal/next.config.ts`).
   - 모든 페이지는 빌드 타임에 정적 생성된다. 런타임 서버 fetch/동적 라우트 금지.
   - 데이터는 **빌드 타임 import**(JSON/TS)만 가능. 필요한 원천 데이터는 아래 §5 참조.
   - 이미지 최적화 off(`images: { unoptimized: true }`) → `public/`의 정적 파일 사용.
3. **활성 앱 디렉터리는 루트 `apps/portal/app/` 이다.** `apps/portal/src/app/`는
   create-next-app 잔재(죽은 코드)다. **`apps/portal/src/app/` 폴더는 삭제**할 것.
4. 공용 컴포넌트는 `@ppotal/ui`에서 가져온다: `constructMetadata`, `Navbar`, `Analytics`,
   `AdSense`(이미 layout에 연결됨). **`Footer`는 없으니 신규 작성**(§4).
5. 언어는 한국어(`<html lang="ko">`). 모든 페이지 메타데이터는 `constructMetadata`로 생성.
6. **AdSense 정책상 필수**: 각 콘텐츠 페이지는 **최소 600~1000자 이상의 원본 산문**.
   lorem ipsum·자리표시자·중복 텍스트 금지. 모든 이미지에 의미 있는 `alt` 필수.

---

## 1. 작업 방향(요약)

- portal을 "홍보 랜딩 1장"에서 **"여행 정보 허브(가이드 아티클 + 법적 페이지)"** 로 확장한다.
- 새 콘텐츠는 **우리가 이미 보유한 실제 데이터**(일본 철도 노선/회사, 세계 지역 등급, 여행 계획 기능)에
  근거해 작성한다 → 원본성 확보 + 제작 비용 최소화. **데이터를 그대로 덤프하지 말고 사람이 읽을 산문으로 서술**.
- 모든 페이지에 공통 헤더(Navbar)·푸터(Footer, 법적 링크 포함)를 붙여 사이트 구조를 완성한다.

---

## 2. 페이지 구성 (신규 생성 목록)

| 우선순위 | 경로 | 파일 | 유형 | 목적 |
|---|---|---|---|---|
| **P0** | `/privacy` | `app/privacy/page.tsx` | 법적 | 개인정보처리방침 (**AdSense 필수**) |
| **P0** | `/terms` | `app/terms/page.tsx` | 법적 | 이용약관 |
| **P0** | `/about` | `app/about/page.tsx` | 신뢰 | 서비스·팀 소개 |
| **P0** | `/contact` | `app/contact/page.tsx` | 신뢰 | 문의(실제 이메일 노출) |
| **P1** | `/guides` | `app/guides/page.tsx` | 콘텐츠 허브 | 가이드 인덱스 |
| **P1** | `/guides/japan-rail` | `app/guides/japan-rail/page.tsx` | 아티클 | 일본 철도망 완전 가이드 |
| **P1** | `/guides/world-travel-log` | `app/guides/world-travel-log/page.tsx` | 아티클 | 세계 여행 기록·등급 시스템 |
| **P1** | `/guides/trip-planning` | `app/guides/trip-planning/page.tsx` | 아티클 | 스마트 여행 계획법 |
| **P2** | `/guides/jr-pass` | `app/guides/jr-pass/page.tsx` | 아티클 | JR 패스 노선 활용 |
| **P2** | `/guides/shinkansen` | `app/guides/shinkansen/page.tsx` | 아티클 | 신칸센 노선 소개 |

> 최소 P0 + P1(총 8페이지)까지는 재심사 전 필수. P2는 콘텐츠 볼륨 보강용.
> 기존 홈(`app/page.tsx`)은 유지하되, §3 링크 구조에 맞춰 Footer/가이드 링크만 연결.

### 부수 작업
- `app/sitemap.ts` 갱신: 실제 존재하는 위 경로 전부 등록. **현재 잘못 참조 중인 `/pplaner`(존재하지 않음) 제거.**
- `app/robots.ts`: 현행 유지(모두 allow) 확인.
- `apps/portal/src/app/` 삭제.

---

## 3. 링크 구조

```
(전 페이지 공통 헤더) Navbar: 홈 · 가이드 · 소개 · 문의
(전 페이지 공통 푸터) Footer:
    ├ 서비스: JapanRailNote / Regionevel / PPLANER(플래너)  → 각 하위 도메인 외부 링크
    ├ 가이드: /guides 이하 주요 아티클
    └ 정보: /about · /contact · /privacy · /terms

홈 /  ──┬─→ /guides ──┬─→ /guides/japan-rail ──→ (본문 내부 링크) jprail.pplaner.com
        │             ├─→ /guides/world-travel-log ──→ regionevel 하위 도메인
        │             ├─→ /guides/trip-planning ──→ p-plan 하위 도메인
        │             ├─→ /guides/jr-pass
        │             └─→ /guides/shinkansen
        └─→ /about /contact /privacy /terms
```

- **내부 링크 규칙**: 각 가이드 본문은 (a) 관련 다른 가이드 1~2개, (b) 해당 실제 도구(하위 도메인)로
  최소 1회씩 연결. 고립 페이지(orphan) 금지 — 애드센스·SEO 모두 감점.
- 외부 도구 링크(절대 경로): JapanRailNote `https://jprail.pplaner.com`,
  PPLANER 플래너 `https://app.pplaner.com`(main `firebase.json` redirect 기준),
  Regionevel 도메인은 배포 설정에서 확인 후 사용(**팀 확인 필요**).

---

## 4. 공통 컴포넌트 작업

### 4-1. `Footer` 신규 (`packages/ui/src/components/Footer.tsx`, index.ts에 export)
- 4열 구성: 서비스 / 가이드 / 정보 / 저작권.
- 법적 링크(`/privacy`, `/terms`, `/about`, `/contact`)를 **모든 페이지에** 노출.
- `app/layout.tsx` `<body>` 안 `{children}` 아래에 `<Footer />` 배치.

### 4-2. `Navbar`
- 기존 `@ppotal/ui`의 `Navbar` 사용. 링크 항목에 가이드/소개/문의 추가가 가능한지 확인,
  props로 안 되면 portal 전용 상단 네비를 간단히 구성.

---

## 5. 페이지별 본문 상세 (섹션·데이터원·이미지·링크)

> 톤: 정보성·전문성. 각 아티클은 H1 1개 + H2 3~5개 + 소개/맺음 문단. 목표 분량 병기.

### 5-1. `/privacy` — 개인정보처리방침 (약 800자+)  ★AdSense 필수
- **반드시 포함**: 제3자 광고 고지 문단 — "본 사이트는 Google을 포함한 제3자 업체의 광고를
  게재하며, 이들 업체는 쿠키(DoubleClick DART 쿠키 등)를 사용해 방문 기록 기반 광고를 제공할 수 있다.
  사용자는 [Google 광고 설정](https://www.google.com/settings/ads)에서 맞춤 광고를 비활성화할 수 있다."
- 섹션: 수집 항목 / 이용 목적 / 보관 기간 / 제3자 제공(광고·분석: Google AdSense·Analytics·Firebase) /
  쿠키 정책 / 이용자 권리 / 문의처(이메일).
- 참고 템플릿: `apps/jprail/src/app/privacy/page.tsx`(84줄) 재활용.
- 이미지: 없음(텍스트 페이지).

### 5-2. `/terms` — 이용약관 (약 600자+)
- 섹션: 목적 / 정의 / 서비스 내용(3개 도구 요약) / 이용자 의무 / 지식재산권 /
  면책 / 준거법. 일반적 SaaS 약관 톤.

### 5-3. `/about` — 서비스 소개 (약 700자+)
- PPLANER = 3개 여행 도구 통합 허브임을 서술: JapanRailNote(철도 시각화·기록),
  Regionevel(세계 여행 등급), PPLANER 플래너(AI 일정·동행).
- 섹션: 미션 / 무엇을 만드는가 / 3개 서비스 소개(각 문단 + 하위 도메인 링크) / 지향점.
- 이미지: 히어로 1장(3개 도구 콜라주 컨셉, §6).

### 5-4. `/contact` — 문의 (약 300자+)
- 실제 연락 수단 노출 필수: 이메일(예: `contact@pplaner.com` 또는 운영 이메일 — **팀 확인 필요**).
- 정적 익스포트이므로 서버 폼 불가 → `mailto:` 링크 또는 이메일 텍스트 안내.
- FAQ 3~4개(서비스 이용/광고/문의 응대) 포함 시 분량·유용성↑.

### 5-5. `/guides` — 가이드 인덱스 (약 400자+)
- 도입 문단 + 아티클 카드 그리드(제목·요약·썸네일·링크).
- 각 카드 → 개별 가이드 페이지.

### 5-6. `/guides/japan-rail` — 일본 철도망 완전 가이드 (약 1000자+) ★대표 아티클
- **데이터원**: `apps/jprail/public/rail/companies.json`(철도 회사), `lines.json`(노선),
  `railroad_hierarchy.json`(계층). 실제 회사/노선명을 근거로 서술(덤프 아님).
- 섹션 예: ① JR 6사 개요(East/West/Central/Kyushu/Hokkaido/Shikoku) ②
  사철·지하철 ③ 신칸센 네트워크 ④ 여행자 팁(패스·환승) ⑤ JapanRailNote로 기록하기(도구 링크).
- 내부 링크: `/guides/jr-pass`, `/guides/shinkansen`, `jprail.pplaner.com`.
- 이미지: 노선망 지도 시각화 컨셉 1장 + 노선 다이어그램 1장(§6).

### 5-7. `/guides/world-travel-log` — 세계 여행 기록·등급 (약 800자+)
- **데이터원**: Regionevel 개념(국가/도시 방문율 RATE, 경험치 EXP, 히트맵), geodata 국가/도시 계층.
- 섹션: 여행 흔적을 기록하는 이유 / RATE·EXP 등급 개념 / 국가→지자체 단위 추적 / Regionevel 소개(링크).
- 이미지: 세계 히트맵 컨셉 1장.

### 5-8. `/guides/trip-planning` — 스마트 여행 계획법 (약 800자+)
- **데이터원**: PPLANER 기능(일정/예산/체크리스트/동행/여행기).
- 섹션: 계획 수립 단계 / 논리적 일정 검증 / 예산·체크리스트 / 실시간 동행 / PPLANER 소개(링크).
- 이미지: 플래너 화면 스크린샷(`apps/portal/public/screenshots/` 재활용 가능).

### 5-9. `/guides/jr-pass` (P2, 약 700자+) / 5-10. `/guides/shinkansen` (P2, 약 700자+)
- japan-rail 데이터 동일 원천에서 파생. 각각 패스 활용 팁 / 신칸센 노선(도카이도·산요·도호쿠 등) 소개.

---

## 6. 첨부 이미지 컨셉

- **원칙**: 커스텀 일러스트에 시간 쓰지 말 것. ① 기존 자산 재활용 → ② 없으면 단순 SVG/CSS 그래픽 →
  ③ 그래도 없으면 의미 있는 alt를 단 대표 이미지 1장. **AdSense는 텍스트 품질이 핵심**, 이미지는 보조.
- **재활용 소스**: `apps/portal/public/screenshots/`(도구 스크린샷), `apps/jprail/public/` 지도/노선 자산.
- 페이지별 컨셉:
  - 홈/about 히어로: 3개 도구를 아우르는 여행 콜라주(딥블루 톤, 기존 브랜드 컬러 `#1c74e9` 계열).
  - japan-rail: 철도 노선망 벡터 지도 느낌 + 선형 노선 다이어그램.
  - world-travel-log: 세계 지도 채색 히트맵.
  - trip-planning: 플래너 UI 스크린샷.
- **OG 이미지**: 페이지별 `constructMetadata`에 대표 이미지 지정(없으면 공통 `/og-image.png`).
- 모든 `<img>`/`next/image`에 서술형 `alt` 필수(SEO·접근성·AdSense).

---

## 7. AdSense 광고 슬롯(승인 후 작업 — 지금은 넣지 말 것)

- 로더(`<AdSense />`)와 `ads.txt`는 이미 연결됨. **승인 전에는 광고 슬롯(`<ins class="adsbygoogle">`)을
  넣지 않는다** (빈 광고 영역은 심사에 불리).
- 승인 후, 각 가이드 아티클 본문 중간/하단에 반응형 슬롯 배치. 이때 재사용 슬롯 컴포넌트를 별도 추가.

---

## 8. 완료 기준 (체크리스트)

- [ ] P0 4개(privacy/terms/about/contact) + P1 4개(guides 인덱스+3 아티클) 생성, 각 분량 기준 충족.
- [ ] privacy에 Google 제3자 광고·쿠키 고지 문단 포함.
- [ ] contact에 실제 연락 이메일 노출.
- [ ] 전 페이지 공통 `Footer`(법적 링크) + 상단 네비 연결, orphan 페이지 없음.
- [ ] 각 페이지 고유 `constructMetadata`(title/description) 적용.
- [ ] `app/sitemap.ts`에 신규 경로 전부 등록, 존재하지 않는 `/pplaner` 제거.
- [ ] `apps/portal/src/app/` 삭제.
- [ ] `pnpm --filter portal build` 성공(정적 익스포트 에러 없음).
- [ ] lorem ipsum·자리표시자·중복 텍스트 없음.

---

## 9. 권장 작업 순서

1. `apps/portal/src/app/` 삭제 + `Footer` 신규 + layout 연결.
2. P0 법적 페이지 4종(privacy부터).
3. `/guides` 인덱스 + 대표 아티클 `japan-rail`.
4. 나머지 P1 아티클(world-travel-log, trip-planning).
5. sitemap 갱신 → 빌드 검증.
6. (여유 시) P2 아티클.
7. 배포 후 `pplaner.com/ads.txt`(200)·페이지 소스 AdSense 스크립트 확인 → AdSense 콘솔에서 재심사 요청.

---

## 10. 재심사 전 최종 점검(도메인 레벨)

- `pplaner.com/ads.txt` → 200, 내용 `google.com, pub-2007288082586284, DIRECT, f08c47fec0942fa0`.
- 홈/가이드/법적 페이지가 로그인 없이 완전한 콘텐츠로 보이는지(심사원 시점).
- AdSense 콘솔 등록 도메인이 `pplaner.com`(apex)인지 확인 — 하위 도메인은 별도 등록 불가/불필요.
