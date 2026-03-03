import { Language } from "../lib/i18n-utils";

export interface VersionUpdate {
    version: string;
    date: string;
    commit?: string;
    isMajor?: boolean;
    title: Record<Language, string>;
    changes: Record<Language, string[]>;
}

export const CHANGELOG: VersionUpdate[] = [
    {
        version: "1.1.0",
        date: "2024-03-04",
        isMajor: true,
        title: {
            ko: "트위터 공유 및 2024년 최신 철도 데이터 업데이트",
            en: "Twitter Sharing & 2024 Latest Railway Data Update",
            ja: "Twitter共有と2024年最新鉄道データアップデート"
        },
        changes: {
            ko: [
                "**트위터(X) 공유 기능 추가**: 내가 만든 루트나 현재 지도를 고화질 이미지로 생성하여 즉시 공유할 수 있습니다.",
                "**2024년 일본 철도 데이터(N02-24) 반영**: 국토교통성의 최신 데이터를 기반으로 실제 운행 현황을 업데이트했습니다.",
                "**주요 개통 및 연장**: 호쿠리쿠 신칸센(가나자와~츠루가), 우츠노미야 라이트레일, 후쿠오카 지하철 나나쿠마선 연장 등을 포함한 신규 노선이 추가되었습니다.",
                "**역명 및 사업자 변경**: 나고야 지하철의 역명 변경(시야쿠쇼→나고야죠 등 17건)과 하코네 등산 철도(→오다큐 하코네) 등 최신 명칭을 반영했습니다.",
                "**데이터 정확도 개선**: 2024년 기준 폐선 및 운행 구간 변동 사항에 맞춰 전체 철도 그래프를 보정했습니다."
            ],
            en: [
                "**Twitter (X) Sharing**: Create and share high-quality images of your routes or current map view immediately.",
                "**2024 Japan Railway Data (N02-24)**: Updated actual service status based on the latest MLIT data.",
                "**Major Openings & Extensions**: Included new lines like Hokuriku Shinkansen (Kanazawa-Tsuruga), Utsunomiya Light Rail, and Fukuoka Subway Nanakuma Line extension.",
                "**Name & Operator Changes**: Reflected latest names including 17 Nagoya Subway station renames (e.g., Shiyakusho to Nagoyajo) and Hakone Tozan Railway to Odakyu Hakone.",
                "**Data Accuracy Improved**: Adjusted the entire railroad graph for 2024 segment changes and closures."
            ],
            ja: [
                "**Twitter (X) 共有機能**: 作成したルートや現在の地図を高画質画像として生成し、即座に共有できます。",
                "**2024年日本鉄道データ (N02-24)**: 国土交通省の最新データに基づき、実際の運行状況を更新しました。",
                "**主な開業・延伸**: 北陸新幹線（金沢〜敦賀）、宇都宮ライトレール、福岡市地下鉄七隈線延伸などの新路線を追加しました。",
                "**駅名・事業者名変更**: 名古屋市営地下鉄の駅名変更（市役所→名古屋城など17件）や箱根登山鉄道（→小田急箱根）などの最新名称を反映しました。",
                "**データ精度の向上**: 2024年基準の廃止および運行区間変動に合わせて、鉄道グラフ全体を補正しました。"
            ]
        }
    },
    {
        version: "1.0.0",
        date: "2024-02-28",
        commit: "e3dc7134b4dd3d376e7b3e81f8fb4c10b84f2984",
        isMajor: true,
        title: {
            ko: "Schematic 엔진 도입",
            en: "Schematic Engine Implementation",
            ja: "Schematicエンジン導入"
        },
        changes: {
            ko: [
                "**Schematic 엔진 도입**: 노선 관계를 명확히 보여주는 새로운 개략도 렌더링 엔진이 추가되었습니다.",
                "**반응형 UI 개편**: 모바일과 데스크탑 모두에서 쾌적한 사용 환경을 제공하는 새로운 레이아웃이 적용되었습니다.",
                "**성능 최적화**: 대규모 철도 데이터를 효율적으로 처리하기 위한 데이터 구조 고도화를 진행했습니다."
            ],
            en: [
                "**Schematic Engine**: Added a new schematic rendering engine that clearly visualizes line connections.",
                "**Responsive UI Overhaul**: New layouts optimized for both mobile and desktop environments.",
                "**Performance Optimization**: Refined data structures for efficient handling of large-scale railway data."
            ],
            ja: [
                "**Schematicエンジン導入**: 路線接続を明確に可視化する新しい概略図レンダリングエンジンを追加しました。",
                "**レスポンシブUI刷新**: モバイルとデスクトップの両方で快適に使用できる新しいレイアウトを適用しました。",
                "**パフォーマンス最適化**: 大規模な鉄道データを効率的に処理するためのデータ構造を高度化しました。"
            ]
        }
    },
    {
        version: "0.9.0",
        date: "2024-02-15",
        title: {
            ko: "다국어 지원 및 데이터 경량화",
            en: "Multi-language Support & Data Optimization",
            ja: "多言語対応とデータ軽量化"
        },
        changes: {
            ko: [
                "**다국어 지원**: 한국어, 일본어, 영어 지원이 추가되어 전역적으로 i18n이 적용되었습니다.",
                "**Polyline 인코딩**: 철도 경로 데이터를 압축하여 로딩 속도를 혁신적으로 개선했습니다."
            ],
            en: [
                "**Multi-language Support**: Added support for Korean, Japanese, and English across the UI.",
                "**Polyline Encoding**: Compressed railway path data to dramatically improve loading speeds."
            ],
            ja: [
                "**多言語対応**: 韓国語、日本語、英語のサポートを追加し、UI全体にi18nを適用しました。",
                "**Polylineエンコーディング**: 鉄道経路データを圧縮し、読み込み速度を画期的に改善しました。"
            ]
        }
    },
    {
        version: "0.5.0",
        date: "2024-01-20",
        title: {
            ko: "베타 버전 출시",
            en: "Beta Version Release",
            ja: "ベータ版リリース"
        },
        changes: {
            ko: [
                "**내 여행 기록(My Trips)**: 일본 철도 여행을 기록하고 통계를 확인할 수 있는 기초 시스템이 구축되었습니다.",
                "**인터랙티브 맵**: 일본 전역의 철도 노선을 탐색하고 선택할 수 있는 지도 기능이 구현되었습니다."
            ],
            en: [
                "**My Trips**: Established a basic system to record Japanese rail journeys and view statistics.",
                "**Interactive Map**: Implemented map features to explore and select railway lines across Japan."
            ],
            ja: [
                "**マイ旅行履歴**: 日本の鉄道旅行を記録し、統計を確認できる基本システムを構築しました。",
                "**インタラクティブマップ**: 日本全国の路線を探索・選択できる地図機能を実装しました。"
            ]
        }
    }
];

export const CURRENT_VERSION = CHANGELOG[0].version;
