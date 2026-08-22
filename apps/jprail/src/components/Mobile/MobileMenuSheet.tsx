"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import {
    HelpIcon, ListIcon, CompassIcon, ShareIcon,
    InfoIcon, LanguageIcon, SyncIcon, LogOutIcon, LogInIcon, CloseIcon
} from '@ppotal/ui';
import { MessageSquare } from 'lucide-react';
import { LanguageSelector } from '../LanguageSelector';
import { useI18n } from '../../lib/i18n-context';
import { Z } from '../../lib/layers';

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
    ko: { menu: '메뉴', tips: '소개', feedback: '피드백', directory: '노선 목록', about: 'PPLANER 소개', exportMap: '공유 카드 만들기', info: '앱 정보', language: '언어', account: '계정', login: '로그인', logout: '로그아웃', sync: 'Regionevel에서 가져오기', loggedInAs: '로그인 계정' },
    ja: { menu: 'メニュー', tips: '紹介', feedback: 'フィードバック', directory: '路線一覧', about: 'PPLANER紹介', exportMap: '共有カード作成', info: 'アプリ情報', language: '言語', account: 'アカウント', login: 'ログイン', logout: 'ログアウト', sync: 'Regionevelから取得', loggedInAs: 'ログイン中' },
    en: { menu: 'Menu', tips: 'About', feedback: 'Feedback', directory: 'Lines', about: 'About PPLANER', exportMap: 'Create Share Card', info: 'About this app', language: 'Language', account: 'Account', login: 'Login', logout: 'Logout', sync: 'Sync with Regionevel', loggedInAs: 'Logged in as' }
};

interface RowProps {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    onClick?: () => void;
    href?: string;
    external?: boolean;
    tone?: 'default' | 'danger';
    busy?: boolean;
}

const Row: React.FC<RowProps> = ({ icon: Icon, label, onClick, href, external, tone = 'default', busy }) => {
    const cls = `w-full flex items-center gap-3 px-5 min-h-[52px] text-sm font-bold transition-colors active:bg-slate-100 dark:active:bg-slate-800 ${
        tone === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'
    }`;
    const inner = (
        <>
            {busy ? (
                <span className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
            ) : (
                <Icon className={`w-5 h-5 shrink-0 ${tone === 'danger' ? '' : 'text-primary'}`} />
            )}
            <span className="truncate">{label}</span>
        </>
    );
    if (href) {
        return external
            ? <a href={href} className={cls} target="_blank" rel="noopener noreferrer">{inner}</a>
            : <Link href={href} className={cls}>{inner}</Link>;
    }
    return <button onClick={onClick} className={`${cls} cursor-pointer`} disabled={busy}>{inner}</button>;
};

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
        <div style={{ zIndex: Z.modal }} className="fixed inset-0 flex flex-col justify-end">
            <div onClick={onClose} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200" />

            <div
                className="relative bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300"
                style={{ paddingBottom: 'calc(var(--safe-bottom, 0px) + 0.5rem)' }}
                role="dialog"
                aria-modal="true"
                aria-label={t.menu}
            >
                {/* Drag Handle */}
                <div className="flex justify-center pt-3 pb-1 shrink-0">
                    <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
                </div>

                {/* Header with Title and Close X Button */}
                <div className="flex items-center justify-between px-5 py-2 shrink-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.menu}</p>
                    <button
                        onClick={onClose}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2 text-slate-400 rounded-full active:bg-slate-100 dark:active:bg-slate-800 cursor-pointer"
                        aria-label="닫기"
                    >
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto overscroll-contain sheet-scroll">
                    <nav className="py-1">
                        <Row icon={HelpIcon} label={t.tips} onClick={act(onHowTo)} />
                        <Row icon={MessageSquare} label={t.feedback} onClick={act(onFeedback)} />
                        <Row icon={ListIcon} label={t.directory} href="/directory" />
                        <Row icon={CompassIcon} label={t.about} href="https://pplaner.com" external />
                        <Row icon={ShareIcon} label={t.exportMap} onClick={act(onExport)} />
                        <Row icon={InfoIcon} label={t.info} onClick={act(onInfo)} />
                    </nav>

                    <div className="h-px bg-slate-100 dark:bg-slate-800 mx-5 my-1" />

                    <div className="h-14 px-5 flex items-center justify-between gap-3">
                        <span className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                            <LanguageIcon className="w-5 h-5 text-primary" />
                            {t.language}
                        </span>
                        <LanguageSelector variant="dropdown" />
                    </div>

                    <div className="h-px bg-slate-100 dark:bg-slate-800 mx-5 my-1" />

                    <div className="py-1 pb-2">
                        {userEmail ? (
                            <>
                                <p className="px-5 pt-2 pb-1 text-[10px] font-bold text-slate-400 truncate">
                                    {userEmail}
                                </p>
                                <Row icon={SyncIcon} label={t.sync} onClick={onSync} busy={isSyncing} />
                                <Row icon={LogOutIcon} label={t.logout} onClick={act(onLogout)} tone="danger" />
                            </>
                        ) : (
                            <Row icon={LogInIcon} label={t.login} onClick={act(onLogin)} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MobileMenuSheet;
