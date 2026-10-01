import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';

// Android 앱 「JP Rail」(com.ppotal.jprail)의 개인정보처리방침. Google Play 등록 정보에 적는 주소가
// 이 페이지다.
//
// 웹사이트의 방침(/privacy)과 따로 둔다 — 웹은 Google Analytics · AdSense 를 쓰고, 앱은 아무것도
// 모으지 않는다. Play 는 방침과 「데이터 보안」 양식이 맞는지 보므로, 한 글에 섞으면 앱이 수집하는
// 것처럼 읽힌다.
//
// 원문은 jpApp 저장소의 docs/privacy-policy.md 이고, 앱 안에서 보이는 글(assets/legal/privacy_*.txt)과
// 같다. 고칠 때 세 곳을 같이 고치고 시행일을 새로 적는다.

const EFFECTIVE = '2026-10-01';
const DATA_URL = 'https://jprail.pplaner.com/rail/';

export const metadata: Metadata = {
    title: 'Privacy Policy — JP Rail for Android | プライバシーポリシー | 개인정보처리방침',
    description:
        'Privacy policy for the JP Rail Android app (com.ppotal.jprail). The app sends no personal information to the developer: no accounts, no ads, no analytics.',
    alternates: { canonical: 'https://jprail.pplaner.com/privacy/app/' },
    robots: { index: true, follow: true },
};

type Section = { heading: string; items: React.ReactNode[] };
type Policy = { id: string; lang: string; title: string; lead: string; sections: Section[] };

const Url = ({ href }: { href: string }) => (
    <code className="text-[0.85em] px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 break-all">{href}</code>
);

const POLICIES: Policy[] = [
    {
        id: 'ja',
        lang: 'ja',
        title: '日本語',
        lead: 'このアプリは、あなたの個人情報を開発者のサーバーに送りません。アカウントも広告も利用状況の計測もありません。',
        sections: [
            {
                heading: '端末の中に保存するもの',
                items: [
                    '乗車記録(区間・駅・距離・日付・名前)、訪問した駅、設定。',
                    'アプリを削除すると消えます。Android の「バックアップ」を有効にしている場合、乗車記録と設定は Google のバックアップ(あなたの Google アカウント)に保存されることがあります。これは Android の機能で、開発者は内容を見られません。',
                ],
            },
            {
                heading: 'Google タイムライン(ロケーション履歴)の読み込み',
                items: [
                    'あなたが選んだファイルを端末の中だけで読み、鉄道の乗車を探します。',
                    '保存するのは、あなたが選んで「記録」した乗車(駅と日付)だけです。位置の履歴そのものは保存も送信もしません。',
                ],
            },
            {
                heading: '通信',
                items: [
                    <>鉄道データの更新のため、<Url href={DATA_URL} /> からデータファイルを受け取ります。あなたの記録や位置は送りません。</>,
                    'この通信では、通常のインターネット通信と同じく IP アドレスや端末の種類(User-Agent)がサーバーに届きます。サーバーはこれを使ってあなたを特定しません。',
                ],
            },
            {
                heading: '共有とバックアップファイル',
                items: [
                    '共有する画像・動画は端末の中で作られ、あなたが選んだ相手にだけ渡ります。',
                    '「バックアップを書き出す」で作るファイルには乗車記録が入ります。保存先はあなたが選び、開発者には届きません。',
                ],
            },
            {
                heading: '子どもの利用',
                items: ['年齢を問わず、個人情報を集めません。'],
            },
            {
                heading: '変更とお問い合わせ',
                items: [
                    'このポリシーを変えるときは、このページを更新し、施行日を改めます。',
                    'お問い合わせは Google Play の本アプリのページにある開発者の連絡先へ。',
                ],
            },
        ],
    },
    {
        id: 'en',
        lang: 'en',
        title: 'English',
        lead: "This app does not send your personal information to the developer's servers. There are no accounts, no ads and no usage analytics.",
        sections: [
            {
                heading: 'What stays on your device',
                items: [
                    'Your ride log (sections, stations, distance, date, name), visited stations and settings.',
                    "They are deleted when you uninstall the app. If Android Backup is turned on, your ride log and settings may be saved to Google's backup service in your Google account. This is an Android feature; the developer cannot see it.",
                ],
            },
            {
                heading: 'Importing Google Timeline (Location History)',
                items: [
                    'The file you pick is read only on your device to find train rides.',
                    'Only the rides you choose to record (stations and dates) are saved. Your location history itself is neither stored nor sent.',
                ],
            },
            {
                heading: 'Network',
                items: [
                    <>To update railway data, the app downloads data files from <Url href={DATA_URL} />. Your records and location are not sent.</>,
                    'As with any internet request, your IP address and device type (User-Agent) reach the server. They are not used to identify you.',
                ],
            },
            {
                heading: 'Sharing and backup files',
                items: [
                    'Share images and videos are made on your device and go only where you send them.',
                    'A file made with "Export backup" contains your ride log. You choose where it is saved; it never reaches the developer.',
                ],
            },
            {
                heading: 'Children',
                items: ['The app collects no personal information from anyone, of any age.'],
            },
            {
                heading: 'Changes and contact',
                items: [
                    'If this policy changes, this page is updated with a new effective date.',
                    "Contact the developer through the contact details on the app's Google Play page.",
                ],
            },
        ],
    },
    {
        id: 'ko',
        lang: 'ko',
        title: '한국어',
        lead: '이 앱은 개인정보를 개발자의 서버로 보내지 않습니다. 계정도, 광고도, 이용 통계 수집도 없습니다.',
        sections: [
            {
                heading: '기기 안에 저장하는 것',
                items: [
                    '탑승 기록(구간 · 역 · 거리 · 날짜 · 이름), 방문한 역, 설정.',
                    '앱을 지우면 함께 지워집니다. Android 「백업」을 켜 두었다면 탑승 기록과 설정이 Google 백업(내 Google 계정)에 저장될 수 있습니다. 이는 Android 의 기능이며 개발자는 그 내용을 볼 수 없습니다.',
                ],
            },
            {
                heading: 'Google 타임라인(위치 기록) 가져오기',
                items: [
                    '고른 파일을 기기 안에서만 읽어 열차 탑승을 찾습니다.',
                    '저장하는 것은 직접 골라 「기록」한 탑승(역과 날짜)뿐입니다. 위치 기록 자체는 저장하지도 보내지도 않습니다.',
                ],
            },
            {
                heading: '통신',
                items: [
                    <>철도 데이터를 갱신하려고 <Url href={DATA_URL} /> 에서 데이터 파일을 받습니다. 기록이나 위치는 보내지 않습니다.</>,
                    '여느 인터넷 요청처럼 IP 주소와 기기 종류(User-Agent)가 서버에 닿습니다. 이를 이용해 이용자를 식별하지 않습니다.',
                ],
            },
            {
                heading: '공유와 백업 파일',
                items: [
                    '공유하는 이미지 · 영상은 기기 안에서 만들어지고, 직접 고른 곳으로만 갑니다.',
                    '「백업 내보내기」로 만든 파일에는 탑승 기록이 들어 있습니다. 저장할 곳은 이용자가 고르며 개발자에게 전달되지 않습니다.',
                ],
            },
            {
                heading: '아동',
                items: ['나이와 관계없이 누구의 개인정보도 모으지 않습니다.'],
            },
            {
                heading: '변경과 문의',
                items: [
                    '방침을 바꾸면 이 페이지를 고치고 시행일을 새로 적습니다.',
                    '문의는 Google Play 의 앱 페이지에 있는 개발자 연락처로 해 주세요.',
                ],
            },
        ],
    },
];

export default function AppPrivacyPage() {
    return (
        <main className="min-h-screen py-10 px-4 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans">
            <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 p-6 sm:p-12 rounded-3xl shadow-xl border border-slate-200/80 dark:border-slate-800">
                <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 mb-8 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold text-sm"
                >
                    <span aria-hidden="true">←</span> Back to Map
                </Link>

                <h1 className="text-3xl sm:text-4xl font-black mb-2 tracking-tight text-slate-900 dark:text-white">
                    Privacy Policy
                </h1>
                <p className="text-base text-slate-500 dark:text-slate-400">
                    JP Rail for Android (<code>com.ppotal.jprail</code>)
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                    施行日 / Effective / 시행일: <time dateTime={EFFECTIVE}>{EFFECTIVE}</time>
                </p>

                <nav aria-label="Language" className="flex flex-wrap gap-2 mb-10 text-sm font-bold">
                    {POLICIES.map((p) => (
                        <a
                            key={p.id}
                            href={`#${p.id}`}
                            className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            {p.title}
                        </a>
                    ))}
                </nav>

                {POLICIES.map((p) => (
                    <article
                        key={p.id}
                        id={p.id}
                        lang={p.lang}
                        className="mb-12 pt-8 border-t border-slate-200 dark:border-slate-800 first-of-type:border-t-0 first-of-type:pt-0 scroll-mt-6"
                    >
                        <h2 className="text-xl font-black mb-4 text-slate-900 dark:text-white">{p.title}</h2>
                        <p className="font-bold leading-relaxed mb-6 text-slate-900 dark:text-white">{p.lead}</p>
                        {p.sections.map((s) => (
                            <section key={s.heading} className="mb-6">
                                <h3 className="text-base font-bold mb-2 text-slate-800 dark:text-slate-200">{s.heading}</h3>
                                <ul className="list-disc pl-5 space-y-1.5 text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300">
                                    {s.items.map((item, i) => (
                                        <li key={i}>{item}</li>
                                    ))}
                                </ul>
                            </section>
                        ))}
                    </article>
                ))}

                <footer className="pt-6 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                    The website JapanRailNote (jprail.pplaner.com) has its own policy:{' '}
                    <Link href="/privacy" className="underline">
                        /privacy
                    </Link>
                </footer>
            </div>
        </main>
    );
}
