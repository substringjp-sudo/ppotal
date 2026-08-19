"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { LanguageSelector } from '../LanguageSelector';
import { useI18n } from '../../lib/i18n-context';

export interface MobileMenuSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onHowTo: () => void;
    onFeedback: () => void;
    onInfo: () => void;
    onExport: () => void;
    onLogin: () => void;
    onSync: () => void;
    onLogout: () => void;
    userEmail: string | null;
    isSyncing: boolean;
}

const T = {
    ko: { menu: '메뉴', tips: '도움말', feedback: '피드백', directory: '디렉토리', about: 'PPLANER 소개', exportMap: '지도 내보내기', info: '앱 정보', language: '언어', account: '계정', login: '로그인', logout: '로그아웃', sync: 'Regionevel에서 가져오기', loggedInAs: '로그인 계정' },
    ja: { menu: 'メニュー', tips: 'ヘルプ', feedback: 'フィードバック', directory: '路線一覧', about: 'PPLANER紹介', exportMap: 'マップを書き出す', info: 'アプリ情報', language: '言語', account: 'アカウント', login: 'ログイン', logout: 'ログアウト', sync: 'Regionevelから取得', loggedInAs: 'ログイン中' },
    en: { menu: 'Menu', tips: 'Tips', feedback: 'Feedback', directory: 'Directory', about: 'About PPLANER', exportMap: 'Export map', info: 'About this app', language: 'Language', account: 'Account', login: 'Login', logout: 'Logout', sync: 'Sync with Regionevel', loggedInAs: 'Logged in as' }
};

const Row: React.FC<{ icon: string; label: string; onClick?: () => void; href?: string; external?: boolean; tone?: 'default' | 'danger'; busy?: boolean }> =
    ({ icon, label, onClick, href, external, tone = 'default', busy }) => {
        const cls = `w-full h-14 px-4 flex items-center gap-3 rounded-2xl text-sm font-bold transition-colors active:bg-slate-100 dark:active:bg-slate-800 ${tone === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'
            }`;
        const inner = (
            <>
                {busy
                    ? <span className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                    : <span className={`material-symbols-outlined !text-[22px] shrink-0 ${tone === 'danger' ? '' : 'text-primary'}`}>{icon}</span>}
                <span className="truncate">{label}</span>
            </>
        );
        if (href) {
            return external
                ? <a href={href} className={cls}>{inner}</a>
                : <Link href={href} className={cls}>{inner}</Link>;
        }
        return <button onClick={onClick} className={cls} disabled={busy}>{inner}</button>;
    };

/**
 * Everything the desktop header had that a phone bar has no room for.
 *
 * On mobile the nav, the language picker, export and login were either hidden
 * behind a `lg:` breakpoint or pushed off the side of the screen — so on a
 * phone there was no way to log in, change language, or export at all. They all
 * live here now, in one scrollable sheet with 56px rows.
 */
const MobileMenuSheet: React.FC<MobileMenuSheetProps> = ({
    isOpen, onClose, onHowTo, onFeedback, onInfo, onExport,
    onLogin, onSync, onLogout, userEmail, isSyncing
}) => {
    const { language } = useI18n();
    const t = T[language as keyof typeof T] || T.en;

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const act = (fn: () => void) => () => { onClose(); fn(); };

    return (
        <div className="fixed inset-0 z-[12000]">
            <div onClick={onClose} className="absolute inset-0 bg-black/40 animate-in fade-in duration-200" />

            <div
                className="absolute inset-x-0 bottom-0 max-h-[88dvh] flex flex-col bg-white dark:bg-slate-950 rounded-t-[28px] shadow-2xl animate-in slide-in-from-bottom duration-300"
                style={{ paddingBottom: 'var(--safe-bottom)' }}
                role="dialog"
                aria-modal="true"
                aria-label={t.menu}
            >
                <div className="shrink-0 flex items-center justify-center h-8">
                    <div className="w-10 h-1.5 rounded-full bg-black/15 dark:bg-white/20" />
                </div>

                <div className="flex-1 overflow-y-auto sheet-scroll px-3 pb-4">
                    {userEmail && (
                        <div className="px-4 pt-1 pb-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.loggedInAs}</p>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{userEmail}</p>
                        </div>
                    )}

                    <Row icon="lightbulb" label={t.tips} onClick={act(onHowTo)} />
                    <Row icon="chat_bubble" label={t.feedback} onClick={act(onFeedback)} />
                    <Row icon="list_alt" label={t.directory} href="/directory" />
                    <Row icon="travel_explore" label={t.about} href="https://pplaner.com" external />
                    <Row icon="download" label={t.exportMap} onClick={act(onExport)} />
                    <Row icon="info" label={t.info} onClick={act(onInfo)} />

                    <div className="h-px bg-slate-100 dark:bg-slate-800 my-2 mx-4" />

                    <div className="h-14 px-4 flex items-center justify-between gap-3">
                        <span className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                            <span className="material-symbols-outlined !text-[22px] text-primary">translate</span>
                            {t.language}
                        </span>
                        <LanguageSelector variant="dropdown" />
                    </div>

                    <div className="h-px bg-slate-100 dark:bg-slate-800 my-2 mx-4" />

                    {userEmail ? (
                        <>
                            <Row icon="sync" label={t.sync} onClick={onSync} busy={isSyncing} />
                            <Row icon="logout" label={t.logout} onClick={act(onLogout)} tone="danger" />
                        </>
                    ) : (
                        <Row icon="login" label={t.login} onClick={act(onLogin)} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default MobileMenuSheet;
