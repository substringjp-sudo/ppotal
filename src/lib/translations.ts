import { Language } from './i18n-utils';

export const COMMON_TRANSLATIONS = {
    ko: {
        lines: '노선',
        stations: '역',
        km: 'KM',
        cancel: '취소',
        confirm: '확인',
        loading: '로딩 중...',
    },
    en: {
        lines: 'Lines',
        stations: 'Stations',
        km: 'KM',
        cancel: 'Cancel',
        confirm: 'Confirm',
        loading: 'Loading...',
    },
    ja: {
        lines: '路線',
        stations: '駅',
        km: 'KM',
        cancel: 'キャンセル',
        confirm: '確認',
        loading: '読み込み中...',
    }
};

export const MAIN_PAGE_TRANSLATIONS = {
    ko: {
        railList: '노선 목록',
        networkSelection: '네트워크 선택',
        linesSelected: (count: number) => `${count}개 노선 선택됨`,
        myTrip: '내 여정',
        trips: '여정',
        lines: '노선',
        km: 'KM',
        stations: '역',
        information: '정보',
        heroTitle: "최고의 인터랙티브 일본 철도 지도 & 여행 트래커",
        heroDesc: "JapanRailNote는 복잡한 일본의 철도 노선 이용 기록을 더 정확하고 편하게 기록할 수 있도록 도와주는 웹사이트입니다. 일본 47개 도도부현의 모든 JR 노선, 사철, 지하철, 노면전차를 고해상도 인터랙티브 지도로 제공합니다.",
        statsOverview: '통계 개요',
        records: '기록',
        visitedLines: '방문 노선',
        totalDistance: '총 이동 거리',
        avgDistance: '평균 거리',
        fullDirectoryDesc: (stations: number, lines: number) => `모든 ${stations}개의 역과 ${lines}개의 노선에 대한 전체 디렉토리를 보려면 데스크톱 장치에서 웹사이트를 방문해 주세요.`,
        sendFeedback: '피드백 보내기',
        // SEO specific
        directoryTitle: "일본 철도 노선 디렉토리",
        directorySummary1: "현재 JapanRailNote에서는 일본 전역의 ",
        directorySummary2: "개 철도 회사",
        directorySummary3: "개 노선",
        directorySummary4: "개 이상의 역",
        directorySummary5: " 정보를 제공하고 있습니다. 각 회사를 선택하여 상세 노선과 정차역 정보를 확인해보세요.",
        databaseDesc: "(일본 전역 {lineCount}개 노선, {stationCount}개 역의 전체 데이터베이스)",
        aboutProject: "프로젝트 소개",
        privacyCookies: "개인정보 처리방침 & 쿠키",
        section1Title: "광범위한 JR 및 사철 데이터",
        section1Desc: "일본의 철도망은 JR 그룹(홋카이도, 동일본, 도카이, 서일본, 시코쿠, 규슈)과 오다큐, 게이오, 도큐와 같은 수백 개의 사철 회사로 나뉘어 있습니다. 저희 지도는 일본 국토교통성(MLIT)의 데이터를 통합하여 신주쿠의 복잡한 승강장부터 홋카이도의 외딴 간이역까지 모든 역을 정확하게 표시합니다.",
        section2Title: "신칸센(고속열차) 네트워크",
        section2Desc: "일본 여행의 중추인 신칸센을 시각화해보세요. 도쿄와 오사카를 잇는 전설적인 도카이도 신칸센부터 홋카이도 신칸센, 규슈 신칸센까지, 현대 일본의 도시 간 이동을 정의하는 고속 회랑을 쉽게 추적할 수 있습니다.",
        section3Title: "디지털 여행 기록 (노리츠부시)",
        section3Desc: "JapanRailNote를 통해 당신의 여행을 디지털로 기록해보세요. 출발역과 도착역을 선택하고, 고성능 캔버스 지도에서 경로를 시각화하며, 평생 남을 철도 완승 기록을 관리하세요.",
        faqTitle: "자주 묻는 질문 (FAQ)",
        faq1Q: "JR 패스가 지원되나요?",
        faq1A: "네, 재팬 레일 패스에 포함된 모든 JR 노선이 지도에 표시됩니다. 사이드바에서 JR 노선만 필터링하여 패스 사용 계획을 효율적으로 세울 수 있습니다.",
        faq2Q: "지도 데이터는 얼마나 정확한가요?",
        faq2A: "일본 정부에서 제공하는 최신 고정밀 지리 데이터(KSJ)를 사용하여 곡선부의 정확도와 역 위치 정보가 매우 정밀합니다.",
        faq3Q: "모바일에서도 사용할 수 있나요?",
        faq3A: "본 사이트는 반응형으로 제작되었습니다. 열차 안에서 여행을 기록할 때 모바일에 최적화된 인터페이스를 사용해보세요.",
        faq4Q: "어떤 언어가 지원되나요?",
        faq4A: "한국어, 영어, 일본어를 지원합니다. 관광객들이 쉽게 이용할 수 있도록 역 이름과 노선 정보는 다국어로 표시됩니다.",
        footerHome: "홈 (지도)",
        footerCredits: "데이터 출처 및 크레딧",
        footerPrivacy: "개인정보 처리방침",
        footerRegionsLabel: "주요 지역:",
        footerRegions: "홋카이도, 도호쿠, 간토, 주부, 간사이, 주고쿠, 시코쿠, 규슈",
        copyrightDesc: "정밀한 여행과 철도 역사 기록을 위해 디자인되었습니다."
    },
    en: {
        railList: 'Rail Networks',
        networkSelection: 'Network Selection',
        linesSelected: (count: number) => `${count} Lines Selected`,
        myTrip: 'My Trips',
        trips: 'Trips',
        lines: 'Lines',
        km: 'KM',
        stations: 'Stations',
        information: 'Info',
        heroTitle: "Ultimate Interactive Japan Railway Map & Journey Tracker",
        heroDesc: "JapanRailNote is the premier digital companion for both daily commuters and international travelers navigating the world's most complex railway network. We provide a high-fidelity, interactive visualization of every JR line, private railroad, subway system, and tramway across all 47 prefectures of Japan.",
        statsOverview: 'Stats Overview',
        records: 'Records',
        visitedLines: 'Visited Lines',
        totalDistance: 'Total Distance',
        avgDistance: 'Avg Distance',
        fullDirectoryDesc: (stations: number, lines: number) => `For a full directory of all ${stations} stations and ${lines} lines, please visit our website on a desktop device.`,
        sendFeedback: 'Send Feedback',
        // SEO specific
        directoryTitle: "Japan Railway Network Directory",
        directorySummary1: "JapanRailNote currently provides information on ",
        directorySummary2: " railway companies",
        directorySummary3: " lines",
        directorySummary4: " over {stationCount} stations",
        directorySummary5: " across Japan. Select each company to see details for lines and stations.",
        databaseDesc: "(Full database of {stationCount} stations across {lineCount} lines in Japan.)",
        aboutProject: "About the Project",
        privacyCookies: "Privacy & Cookies",
        section1Title: "Comprehensive JR & Private Rail Data",
        section1Desc: "Japan's rail network is divided between the JR Group (Hokkaido, East, Central, West, Shikoku, and Kyushu) and hundreds of private railway companies like Odakyu, Keio, and Tokyu. Our map integrates data from the Ministry of Land, Infrastructure, Transport and Tourism (MLIT) to ensure every station, from the bustling platforms of Shinjuku to remote stops in Hokkaido, is accurately represented.",
        section2Title: "The Shinkansen (Bullet Train) Network",
        section2Desc: "Visualize the backbone of Japanese travel: the Shinkansen. From the legendary Tokaido Shinkansen connecting Tokyo and Osaka to the Hokkaido Shinkansen and Kyushu Shinkansen, easily track the high-speed corridors that define modern Japanese inter-city transport.",
        section3Title: "Digital Journey Tracking (Noritsubushi)",
        section3Desc: "For rail enthusiasts (Densha-Otaku), tracking the miles is a passion. JapanRailNote allows you to record your trips digitally. Select your departure and arrival stations, visualize your path on our high-performance canvas map, and keep a permanent record of your railroad completion status.",
        faqTitle: "Frequently Asked Questions",
        faq1Q: "Is the JR Pass covered?",
        faq1A: "Yes, all JR lines included in the Japan Rail Pass are mapped. You can filter for JR lines specifically in our sidebar to plan your pass usage effectively.",
        faq2Q: "How accurate is the map data?",
        faq2A: "We use the latest high-fidelity geographic data (KSJ) provided by the Japanese government, ensuring curve accuracy and station co-location are precise.",
        faq3Q: "Can I use this on mobile?",
        faq3A: "The site is fully responsive. Use the mobile-optimized interface to record trips while you are actually on the train.",
        faq4Q: "What languages are supported?",
        faq4A: "We support Japanese, Korean, and English. Station names and line information are displayed in bilingual formats for ease of use by tourists.",
        footerHome: "Home (Map)",
        footerCredits: "Data Sources & Credits",
        footerPrivacy: "Privacy Policy",
        footerRegionsLabel: "Major Regions:",
        footerRegions: "Hokkaido, Tohoku, Kanto, Chubu, Kansai, Chugoku, Shikoku, Kyushu",
        copyrightDesc: "Designed for precision travel and railroad history tracking."
    },
    ja: {
        railList: '路線リスト',
        networkSelection: 'ネットワーク選択',
        linesSelected: (count: number) => `${count}個の路線を選択`,
        myTrip: 'マイ履歴',
        trips: '履歴',
        lines: '路線',
        km: 'KM',
        stations: '駅',
        information: '情報',
        heroTitle: "究極のインタラクティブ日本鉄道マップ＆ジャーニートラッカー",
        heroDesc: "JapanRailNoteは、世界で最も複雑な鉄道網をナビゲートする通勤客と旅行者のための究極のデジタルコンパニオンです。日本47都道府県のすべてのJR線、私鉄、地下鉄、路面電車を高精度なインタラクティブマップで提供します。",
        statsOverview: '統計概要',
        records: '記録',
        visitedLines: '訪れた路線',
        totalDistance: '総移動距離',
        avgDistance: '平均距離',
        fullDirectoryDesc: (stations: number, lines: number) => `${stations}の駅と${lines}の路線すべてのディレクトリを確認するには、デスクトップデバイスでウェブサイトにアクセスしてください。`,
        sendFeedback: 'フィードバックを送信',
        // SEO specific
        directoryTitle: "日本鉄道ネットワーク・ディレクトリ",
        directorySummary1: "JapanRailNoteでは現在、日本全国の",
        directorySummary2: "の鉄道会社",
        directorySummary3: "の路線",
        directorySummary4: "そして{stationCount}以上の駅",
        directorySummary5: "の情報を提供しています。各会社を選択して、詳細な路線や停車駅情報を確認してください。",
        databaseDesc: "(日本全国{lineCount}路線、{stationCount}駅のフルデータベース)",
        aboutProject: "プロジェクトについて",
        privacyCookies: "プライバシーポリシー＆クッキー",
        section1Title: "広範なJRおよび私鉄データ",
        section1Desc: "日本の鉄道網は、JRグループ（北海道、東日本、東海、西日本、西日本、四国、九州）と、小田急、京王、東急などの数百の私鉄会社に分かれています。当マップは国土交通省（MLIT）のデータを統合し、新宿の賑やかなホームから北海道の辺境の駅まで、あらゆる駅を正確に再現しています。",
        section2Title: "新幹線（弾丸列車）ネットワーク",
        section2Desc: "日本旅行の背骨である新幹線を可視化しましょう。東京と大阪を結ぶ伝説の東海道新幹線から、北海道新幹線、九州新幹線まで、現代日本の都市間輸送を定義する高速回廊を簡単に追跡できます。",
        section3Title: "デジタル乗車記録（乗りつぶし）",
        section3Desc: "鉄道ファン（鉄道オタク）にとって、乗車距離を記録することは情熱です JapanRailNoteでは、あなたの旅をデジタルで記録できます。出発駅と到着駅を選択し、高性能なキャンバスマップでルートを可視化して、一生残る乗りつぶし記録を管理しましょう。",
        faqTitle: "よくある質問 (FAQ)",
        faq1Q: "JRパスは対象ですか？",
        faq1A: "はい、ジャパン・レール・パスに含まれるすべてのJR線がマッピングされています。サイドバーでJR線をフィルタリングして、パスの利用計画を効率的に立てることができます。",
        faq2Q: "マップデータの正確性は？",
        faq2A: "日本政府が提供する最新の高精度地理データ（KSJ）を使用しており、曲線の正確さや駅の位置情報が非常に精密です。",
        faq3Q: "モバイルで利用できますか？",
        faq3A: "サイトは完全にレスポンシブ対応です。列車内での記録には、モバイルに最適化されたインターフェースをご利用ください。",
        faq4Q: "対応言語は？",
        faq4A: "日本語、韓国語、英語をサポートしています。観光客の方でも使いやすいよう、駅名や路線情報は多言語で表示されます。",
        footerHome: "ホーム (マップ)",
        footerCredits: "データ出典＆クレジット",
        footerPrivacy: "プライバシーポリシー",
        footerRegionsLabel: "主な地域:",
        footerRegions: "北海道, 東北, 関東, 中部, 近畿, 中国, 四国, 九州",
        copyrightDesc: "精密な旅行と鉄道史の記録のために設計されました。"
    }
};

export const MY_LINES_TRANSLATIONS = {
    ko: {
        title: '내 여행 기록',
        subtitle: '일본 철도 여행의 발자취',
        totalProgress: '전체 진행률',
        lines: '개 노선',
        tripRecord: '개의 기록',
        cancel: '취소',
        confirm: '확인',
        deleteAll: '전체 삭제',
        noTrips: '기록된 여정이 없습니다.',
        dragToRecord: '역 사이를 드래그하여 기록하세요',
        stations: '개 역',
        deleteTrip: '이 기록 삭제',
    },
    en: {
        title: 'My Travels',
        subtitle: 'Tracking your Japanese rail journeys',
        totalProgress: 'Total Progress',
        lines: ' Lines',
        tripRecord: ' Records',
        cancel: 'Cancel',
        confirm: 'Confirm',
        deleteAll: 'Delete All',
        noTrips: 'No trips recorded yet.',
        dragToRecord: 'Drag between stations to record!',
        stations: ' Stations',
        deleteTrip: 'Delete this trip',
    },
    ja: {
        title: 'マイ履歴',
        subtitle: '日本の鉄道旅行の記録',
        totalProgress: '総進捗状況',
        lines: ' 路線',
        tripRecord: '件の記録',
        cancel: 'キャンセル',
        confirm: '確認',
        deleteAll: 'すべて削除',
        noTrips: '記録された履歴がありません。',
        dragToRecord: '駅の間をドラッグして記録してください',
        stations: '駅',
        deleteTrip: 'この履歴を削除',
    }
};

export const SIDEBAR_TRANSLATIONS = {
    ko: {
        title: '철도망 노선도',
        subtitle: '지도의 표시할 노선을 선택하세요',
        sortTitle: '정렬 및 구성',
        alphabetical: '가나다순',
        byUsage: '이용량순',
        selection: '선택 이벤트',
        all: '모두 선택',
        none: '선택 해제',
        viewGroups: '카테고리 보기',
        expandAll: '모든 카테고리 열기',
        collapseAll: '모든 카테고리 닫기',
        loading: '로딩 중...',
    },
    en: {
        title: 'Railroad Networks',
        subtitle: 'Select lines to visualize on map',
        sortTitle: 'Sort & Organize',
        alphabetical: 'Alphabetical',
        byUsage: 'By Usage',
        selection: 'Selection',
        all: 'All',
        none: 'None',
        viewGroups: 'View Groups',
        expandAll: 'Expand All Categories',
        collapseAll: 'Collapse All Categories',
        loading: 'Loading...',
    },
    ja: {
        title: '鉄道ネットワーク',
        subtitle: '地図に表示する路線を選択してください',
        sortTitle: 'ソートと整理',
        alphabetical: '五十音順',
        byUsage: '利用量順',
        selection: '一괄選択',
        all: 'すべて選択',
        none: '選択解除',
        viewGroups: 'カテゴリ表示',
        expandAll: 'すべてのカテゴリを開く',
        collapseAll: 'すべてのカテゴリを閉じる',
        loading: '読み込み中...',
    }
};

export const AUTH_TRANSLATIONS = {
    ko: {
        login: '로그인',
        signup: '회원가입',
        logout: '로그아웃',
        email: '이메일',
        password: '비밀번호',
        confirmPassword: '비밀번호 확인',
        githubLogin: 'GitHub으로 로그인',
        googleLogin: 'Google로 로그인',
        needAccount: '계정이 없으신가요?',
        hasAccount: '이미 계정이 있으신가요?',
        welcome: '다시 오신 것을 환영합니다!',
        join: '여정을 시작하세요',
        saveProgress: '진행 상황을 클라우드에 저장하세요.',
        nickname: '닉네임',
        authFailed: '인증에 실패했습니다.',
        switchToSignup: '계정이 없으신가요? 회원가입',
        switchToLogin: '이미 계정이 있으신가요? 로그인'
    },
    en: {
        login: 'Login',
        signup: 'Sign Up',
        logout: 'Logout',
        email: 'Email',
        password: 'Password',
        confirmPassword: 'Confirm Password',
        githubLogin: 'Sign in with GitHub',
        googleLogin: 'Sign in with Google',
        needAccount: "Don't have an account?",
        hasAccount: 'Already have an account?',
        welcome: 'Welcome Back!',
        join: 'Start Your Journey',
        saveProgress: 'Save your progress to the cloud.',
        nickname: 'Nickname',
        authFailed: 'Authentication failed',
        switchToSignup: "Don't have an account? Sign Up",
        switchToLogin: "Already have an account? Login"
    },
    ja: {
        login: 'ログイン',
        signup: '新規登録',
        logout: 'ログアウト',
        email: 'メール',
        password: 'パスワード',
        confirmPassword: 'パスワード確認',
        githubLogin: 'GitHubでログイン',
        googleLogin: 'Googleでログイン',
        needAccount: 'アカウントをお持ちでないですか？',
        hasAccount: 'すでにアカウントをお持ちですか？',
        welcome: 'おかえりなさい！',
        join: '旅を始めましょう',
        saveProgress: '進行状況をクラウドに保存します。',
        nickname: 'ニックネーム',
        authFailed: '認証に失敗しました。',
        switchToSignup: 'アカウントをお持ちでないですか？新規登録',
        switchToLogin: 'すでにアカウントをお持ちですか？ログイン'
    }
};
export const LINE_DETAIL_TRANSLATIONS = {
    ko: {
        completion: '완성도',
        showLine: '노선 표시',
        hideLine: '노선 숨기기',
    },
    en: {
        completion: 'Completion',
        showLine: 'Show Line',
        hideLine: 'Hide Line',
    },
    ja: {
        completion: '完乗率',
        showLine: '路線を表示',
        hideLine: '路線を隠す',
    }
};

export const STATION_DETAIL_TRANSLATIONS = {
    ko: {
        arr: '도착',
        cancel: '취소',
        start: '시작',
        platform: '번 승강장',
    },
    en: {
        arr: 'Arr',
        cancel: 'Cancel',
        start: 'Start',
        platform: ' Platform',
    },
    ja: {
        arr: '到着',
        cancel: 'キャンセル',
        start: '開始',
        platform: '番線',
    }
};

export const FEEDBACK_TRANSLATIONS = {
    ko: {
        title: '피드백 보내기',
        desc: '제안 사항이나 버그를 발견하셨나요? 알려주세요!',
        labelFeedback: '피드백 내용',
        placeholderFeedback: '이런 기능이 있으면 좋겠어요...',
        labelName: '이름 (선택 사항)',
        placeholderName: '익명',
        submitBtn: '피드백 제출',
        submitting: '제출 중...',
        errorEmpty: '피드백 내용을 입력해주세요.',
        successMsg: '감사합니다! 피드백이 성공적으로 제출되었습니다.',
        errorMsg: '오류가 발생했습니다. 다시 시도해주세요.'
    },
    en: {
        title: 'Submit Feedback',
        desc: 'Have a suggestion or found a bug? Let us know!',
        labelFeedback: 'Feedback',
        placeholderFeedback: 'I think it would be great if...',
        labelName: 'Your Name (Optional)',
        placeholderName: 'Anonymous',
        submitBtn: 'Submit Feedback',
        submitting: 'Submitting...',
        errorEmpty: 'Feedback content cannot be empty.',
        successMsg: 'Thank you! Your feedback has been submitted.',
        errorMsg: 'An error occurred. Please try again.'
    },
    ja: {
        title: 'フィードバックを送信',
        desc: '提案やバグを見つけましたか？ぜひ教えてください！',
        labelFeedback: 'フィードバック内容',
        placeholderFeedback: 'こんな機能があったらいいな...',
        labelName: 'お名前 (任意)',
        placeholderName: '匿名',
        submitBtn: 'フィードバックを送信',
        submitting: '送信中...',
        errorEmpty: 'フィードバック内容を入力してください。',
        successMsg: 'ありがとうございます！フィードバックが送信されました。',
        errorMsg: 'エラーが発生しました。もう一度お試しください。'
    }
};

export const HOW_TO_TRANSLATIONS = {
    ko: {
        title: '사용 방법',
        startBtn: '시작하기',
        desktop: '데스크톱',
        mobile: '모바일',
        guides: {
            desktop: [
                { title: '노선 및 역 탐색', desc: '지도상의 노선이나 점(역)을 클릭하여 상세 정보를 확인하세요.' },
                { title: '여정 기록', desc: '노선 상세 창에서 역을 선택하여 이동 경로를 기록하고 총 거리를 계산하세요.' },
                { title: '사이드바 활용', desc: '왼쪽 사이드바에서 철도 회사별로 노선을 한꺼번에 켜거나 끌 수 있습니다.' },
                { title: '경로 찾기', desc: '경로 탭에서 출발역과 도착역을 선택하여 최단 경로를 검색하세요.' },
                { title: '지도 제어', desc: '마우스 휠로 확대/축소하고, 드래그하여 지도를 이동하세요.' }
            ],
            mobile: [
                { title: '노선 및 역 터치', desc: '지도상의 노선이나 역을 가볍게 터치하여 정보를 확인하세요.' },
                { title: '편집 모드 사용', desc: "상단의 'Edit' 버튼을 눌러 경로 기록 모드로 진입하세요." },
                { title: '드래그로 기록', desc: '편집 모드에서 시작역을 한 번 터치한 후, 다음 역까지 손가락을 드래그하여 경로를 그립니다.' },
                { title: '진행 상황 저장', desc: "하단 패널의 'Add'를 눌러 탑승 기록을 저장하고 통계를 업데이트하세요." },
                { title: '지도 제어', desc: '두 손가락으로 핀치하여 확대/축소하고, 한 손가락으로 이동하세요.' }
            ]
        }
    },
    en: {
        title: 'How to Use',
        startBtn: 'Get Started',
        desktop: 'Desktop',
        mobile: 'Mobile',
        guides: {
            desktop: [
                { title: 'Explore Lines & Stations', desc: 'Click on lines or dots (stations) on the map to see detailed information.' },
                { title: 'Record Your Trip', desc: 'Select stations in the line detail window to record your route and calculate total distance.' },
                { title: 'Use Sidebar', desc: "Enable or disable an entire company's lines from the left sidebar." },
                { title: 'Find Routes', desc: 'Search for the shortest path by selecting start and end stations in the Route tab.' },
                { title: 'Map Control', desc: 'Use mouse wheel to zoom in/out and drag to move the map.' }
            ],
            mobile: [
                { title: 'Touch Lines & Stations', desc: 'Lightly touch lines or stations on the map to see detailed information.' },
                { title: 'Use Edit Mode', desc: "Tap the 'Edit' button at the top to enter route recording mode." },
                { title: 'Drag to Record', desc: 'In Edit Mode, click a starting station once, then drag your finger to the next station to draw the path.' },
                { title: 'Save Progress', desc: "Tap 'Add' in the bottom panel to save your trip and update your stats." },
                { title: 'Map Control', desc: 'Pinch with two fingers to zoom and move with one finger.' }
            ]
        }
    },
    ja: {
        title: '使い方',
        startBtn: 'はじめる',
        desktop: 'デスクトップ',
        mobile: 'モバイル',
        guides: {
            desktop: [
                { title: '路線と駅の探索', desc: '地図上の路線や点（駅）をクリックして詳細情報を確認します。' },
                { title: '履歴の記録', desc: '路線詳細ウィンドウで駅を選択して、移動ルートを記録し総距離を計算します。' },
                { title: 'サイドバーの活用', desc: '左側のサイドバーから、鉄道会社ごとに路線を一括で表示・非表示にできます。' },
                { title: 'ルート検索', desc: 'ルートタブで出発駅と到着駅を選択して、最短ルートを検索します。' },
                { title: '地図の操作', desc: 'マウスホイールで拡大・縮小、ドラッグで地図を移動します。' }
            ],
            mobile: [
                { title: '路線と駅のタッチ', desc: '地図上の路線や駅を軽くタッチして情報を確認します。' },
                { title: '편집 모드 사용', desc: '上部の「Edit」ボタンを押してルート記録モードに入ります。' },
                { title: '드래그로 기록', desc: '편집 모드で開始駅を一度タッチした後、次の駅まで指をドラッグしてルートを描きます。' },
                { title: '진행 상황 저장', desc: '下部パネルの「Add」をタップして、乗車履歴を保存し統計を更新します。' },
                { title: '지도 제어', desc: '2本の指でピンチして拡大・縮小、1本の指で移動します。' }
            ]
        }
    }
};

export const ROUTE_PANE_TRANSLATIONS = {
    ko: {
        title: '경로 탐색',
        start: '출발',
        end: '도착',
        placeholder: '역명 입력',
        totalDistance: '총 이동 거리',
        transfers: (count: number) => `환승: ${count}회`,
        transfer: '환승',
        rail: '철도',
        noSelection: '역을 선택하여 경로를 탐색하세요.'
    },
    en: {
        title: 'Route Planner',
        start: 'START',
        end: 'END',
        placeholder: 'Station Name',
        totalDistance: 'Total Distance',
        transfers: (count: number) => `Transfers: ${count}`,
        transfer: 'Transfer',
        rail: 'Rail',
        noSelection: 'Select stations to route.'
    },
    ja: {
        title: 'ルート検索',
        start: '出発',
        end: '到着',
        placeholder: '駅名を入力',
        totalDistance: '総移動距離',
        transfers: (count: number) => `乗り換え: ${count}回`,
        transfer: '乗り換え',
        rail: '鉄道',
        noSelection: '駅を選択してルートを検索してください。'
    }
};

export const RAIL_SEARCH_TRANSLATIONS = {
    ko: {
        placeholder: '역 또는 노선 검색...',
        recentSearches: '최근 검색어',
        clearAll: '모두 삭제',
        station: '역',
        line: '노선',
        noResults: '검색 결과가 없습니다',
        noResultsDetail: (query: string) => `"${query}"에 해당하는 역이나 노선을 찾을 수 없습니다`,
        stationsFound: (count: number) => `역 — ${count}개 찾음`,
        linesFound: (count: number) => `노선 — ${count}개 찾음`,
        pressEnter: '엔터를 눌러 선택',
        close: '닫기',
        showOnMap: '지도에서 보기',
    },
    en: {
        placeholder: 'Search stations or lines...',
        recentSearches: 'RECENT SEARCHES',
        clearAll: 'Clear all',
        station: 'STATION',
        line: 'LINE',
        noResults: 'No results found',
        noResultsDetail: (query: string) => `We couldn't find any stations or lines matching "${query}"`,
        stationsFound: (count: number) => `STATIONS — ${count} FOUND`,
        linesFound: (count: number) => `LINES — ${count} FOUND`,
        pressEnter: 'Press enter to select',
        close: 'CLOSE',
        showOnMap: 'SHOW ON MAP',
    },
    ja: {
        placeholder: '駅名や路線を検索...',
        recentSearches: '最近の検索',
        clearAll: 'すべて削除',
        station: '駅',
        line: '路線',
        noResults: '検索結果がありません',
        noResultsDetail: (query: string) => `"${query}" に一致する駅や路線は見つかりませんでした`,
        stationsFound: (count: number) => `駅 — ${count}件`,
        linesFound: (count: number) => `路線 — ${count}件`,
        pressEnter: 'Enterで選択',
        close: '閉じる',
        showOnMap: '地図で表示',
    }
};

export const MOBILE_STATION_PREVIEW_TRANSLATIONS = {
    ko: {
        details: '상세 보기',
        start: '시작',
        arr: '도착'
    },
    en: {
        details: 'View Details',
        start: 'Start',
        arr: 'Arr'
    },
    ja: {
        details: '詳細を見る',
        start: '開始',
        arr: '到着'
    }
};



export const MOBILE_BOTTOM_SHEET_TRANSLATIONS = {
    ko: {
        dragHandle: '드래그하여 조절',
        swipe: '스와이프 ↔'
    },
    en: {
        dragHandle: 'Drag to adjust',
        swipe: 'Swipe ↔'
    },
    ja: {
        dragHandle: 'ドラッグして調整',
        swipe: 'スワイプ ↔'
    }
};

export const MAP_LOADING_TRANSLATIONS = {
    ko: {
        loading: '지도 데이터 로드 중...',
        optimizing: '뷰 최적화 중...',
    },
    en: {
        loading: 'Loading Map Data...',
        optimizing: 'Optimizing View...',
    },
    ja: {
        loading: '地図データを読み込み中...',
        optimizing: 'ビューを最適化中...',
    }
};

export const getTranslations = <T>(translations: Record<Language, T>, language: Language): T => {
    return translations[language] || translations['en'];
};
