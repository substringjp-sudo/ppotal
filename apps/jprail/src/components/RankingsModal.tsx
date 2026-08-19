"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@ppotal/ui';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { useRailData } from '../hooks/useRailData';
import { Trip } from '../types/trip';
import { JPRAIL_ACHIEVEMENTS } from '../lib/achievements';
import {
  CRITERIA_DEFINITIONS,
  RankingCriterion,
  UserRankEntry,
  computeUserRankEntry,
  sortUsersByCriterion,
  getCriterionValue,
} from '../lib/rankings';
import { JrnLogo } from './JrnLogo';
import { useI18n } from '../lib/i18n-context';
import { Z } from '../lib/layers';

interface RankingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RankingsModal: React.FC<RankingsModalProps> = ({ isOpen, onClose }) => {
  const { user, profile, loading: authLoading } = useAuth();
  const { railData } = useRailData();
  const { language } = useI18n();

  const [activeTab, setActiveTab] = useState<'rankings' | 'achievements'>('rankings');
  const [selectedCriterion, setSelectedCriterion] = useState<RankingCriterion>('distance');
  const [achievementFilter, setAchievementFilter] = useState<'all' | 'field' | 'region' | 'local'>('all');

  const [recordedTrips, setRecordedTrips] = useState<Trip[]>([]);
  const [visitedLineLengths, setVisitedLineLengths] = useState<Record<string, number>>({});
  const [communityUsers, setCommunityUsers] = useState<UserRankEntry[]>([]);
  const [isLoadingRankings, setIsLoadingRankings] = useState(true);

  // Keyboard shortcut (Escape)
  useEffect(() => {
    if (isOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Load trips from localStorage
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    const saved = localStorage.getItem('jprail_trips');
    if (saved) {
      try {
        setRecordedTrips(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse local trips', e);
      }
    }
    const savedLineLengths = localStorage.getItem('jprail_visited_lines');
    if (savedLineLengths) {
      try {
        setVisitedLineLengths(JSON.parse(savedLineLengths));
      } catch (e) {
        console.error('Failed to parse visited lines', e);
      }
    }
  }, [isOpen]);

  // Fetch Firestore users for leaderboard
  useEffect(() => {
    if (!isOpen) return;
    const fetchUsers = async () => {
      try {
        const usersRef = collection(db, 'users');
        const snap = await getDocs(usersRef);
        const fetchedList: UserRankEntry[] = [];

        snap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.jprailStats) {
            fetchedList.push({
              uid: docSnap.id,
              displayName: data.displayName || data.email?.split('@')[0] || 'Rail Explorer',
              email: data.email,
              photoURL: data.photoURL,
              ...data.jprailStats,
            });
          }
        });

        setCommunityUsers(fetchedList);
      } catch (err) {
        console.warn('Could not fetch Firestore users:', err);
      } finally {
        setIsLoadingRankings(false);
      }
    };

    fetchUsers();
  }, [isOpen]);

  // Calculate current user's entry
  const currentUserEntry = useMemo(() => {
    const uid = user?.uid || 'guest_user';
    const name = profile?.displayName || user?.displayName || user?.email?.split('@')[0] || (language === 'ko' ? '나 (게스트)' : 'Me (Guest)');
    return computeUserRankEntry(uid, name, user?.email || undefined, recordedTrips, railData, visitedLineLengths);
  }, [user, profile, recordedTrips, railData, visitedLineLengths, language]);

  // Sync current user entry to Firestore if logged in
  useEffect(() => {
    if (isOpen && user?.uid && !authLoading) {
      const userRef = doc(db, 'users', user.uid);
      setDoc(
        userRef,
        {
          displayName: currentUserEntry.displayName,
          email: user.email || '',
          photoURL: user.photoURL || '',
          jprailStats: currentUserEntry,
        },
        { merge: true }
      ).catch((e) => console.error('Failed to sync user stats to Firestore:', e));
    }
  }, [isOpen, user, authLoading, currentUserEntry]);

  // Merge current user into leaderboard list safely
  const mergedLeaderboard = useMemo(() => {
    const map = new Map<string, UserRankEntry>();
    communityUsers.forEach((u) => map.set(u.uid, u));
    map.set(currentUserEntry.uid, currentUserEntry);
    return Array.from(map.values());
  }, [communityUsers, currentUserEntry]);

  // Sorted leaderboard based on selected criterion
  const sortedLeaderboard = useMemo(() => {
    return sortUsersByCriterion(mergedLeaderboard, selectedCriterion);
  }, [mergedLeaderboard, selectedCriterion]);

  // Current user rank index (1-based)
  const myRankIndex = useMemo(() => {
    const idx = sortedLeaderboard.findIndex((u) => u.uid === currentUserEntry.uid);
    return idx >= 0 ? idx + 1 : 1;
  }, [sortedLeaderboard, currentUserEntry]);

  // Filtered achievements
  const filteredAchievements = useMemo(() => {
    if (achievementFilter === 'all') return JPRAIL_ACHIEVEMENTS;
    return JPRAIL_ACHIEVEMENTS.filter((a) => a.category === achievementFilter);
  }, [achievementFilter]);

  const langKey = language === 'ko' || language === 'ja' ? language : 'en';

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      style={{ zIndex: Z.modal }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <header className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <JrnLogo size={28} />
            <h2 className="text-base md:text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-primary">Japan</span>RailNote
              <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-primary dark:text-blue-400 border border-blue-500/20">
                {language === 'ko' ? '랭킹 & 업적' : language === 'ja' ? 'ランキング＆実績' : 'Leaderboard'}
              </span>
            </h2>
          </div>

          <button
            onClick={onClose}
            className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors font-bold"
            aria-label="Close modal"
          >
            ✕
          </button>
        </header>

        {/* Modal Scrollable Body */}
        <div className="p-4 md:p-6 overflow-y-auto space-y-6 flex-1">
          {/* User Status Hero Card */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="size-14 md:size-16 rounded-2xl bg-primary text-white font-black text-xl md:text-2xl flex items-center justify-center shadow-md ring-4 ring-blue-500/10 shrink-0">
                Lv.{currentUserEntry.level}
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white truncate">
                    {currentUserEntry.displayName}
                  </h3>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    #{myRankIndex} {language === 'ko' ? '위' : language === 'ja' ? '位' : 'Rank'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {language === 'ko'
                    ? `총 ${currentUserEntry.distance.toLocaleString()}km 주행 | ${currentUserEntry.linesCount}개 노선 완주`
                    : language === 'ja'
                    ? `累計 ${currentUserEntry.distance.toLocaleString()}km 走行 | ${currentUserEntry.linesCount} 路線完乗`
                    : `${currentUserEntry.distance.toLocaleString()}km Total Traveled | ${currentUserEntry.linesCount} Lines Completed`}
                </p>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-2.5 w-full md:w-auto">
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 border border-slate-200 dark:border-slate-700/50 text-center">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block tracking-wider">
                  {language === 'ko' ? '획득 업적' : language === 'ja' ? '実績数' : 'Badges'}
                </span>
                <span className="text-sm md:text-base font-black text-amber-500 dark:text-amber-400">
                  {currentUserEntry.achievementsUnlocked} / {JPRAIL_ACHIEVEMENTS.length}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 border border-slate-200 dark:border-slate-700/50 text-center">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block tracking-wider">
                  {language === 'ko' ? '신칸센' : language === 'ja' ? '新幹線' : 'Shinkansen'}
                </span>
                <span className="text-sm md:text-base font-black text-primary dark:text-blue-400">
                  {currentUserEntry.shinkansenDistance} km
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 border border-slate-200 dark:border-slate-700/50 text-center">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block tracking-wider">
                  {language === 'ko' ? '도도부현' : language === 'ja' ? '都道府県' : 'Prefs'}
                </span>
                <span className="text-sm md:text-base font-black text-emerald-600 dark:text-emerald-400">
                  {currentUserEntry.prefecturesCount} / 47
                </span>
              </div>
            </div>
          </section>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6">
            <button
              onClick={() => setActiveTab('rankings')}
              className={`pb-2.5 text-xs md:text-sm font-black transition-colors relative flex items-center gap-1.5 ${
                activeTab === 'rankings'
                  ? 'text-primary dark:text-blue-400 border-b-2 border-primary dark:border-blue-400'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-base">emoji_events</span>
              {language === 'ko' ? '리더보드 랭킹' : language === 'ja' ? 'ランキング' : 'Leaderboard'}
            </button>
            <button
              onClick={() => setActiveTab('achievements')}
              className={`pb-2.5 text-xs md:text-sm font-black transition-colors relative flex items-center gap-1.5 ${
                activeTab === 'achievements'
                  ? 'text-primary dark:text-blue-400 border-b-2 border-primary dark:border-blue-400'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-base">military_tech</span>
              {language === 'ko' ? '업적 뱃지' : language === 'ja' ? '実績バッジ' : 'Achievements'}
            </button>
          </div>

          {/* TAB 1: RANKINGS */}
          {activeTab === 'rankings' && (
            <div className="space-y-5">
              {/* Criteria Selection Pill Tabs */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-1.5 flex gap-1 overflow-x-auto">
                {(Object.keys(CRITERIA_DEFINITIONS) as RankingCriterion[]).map((key) => {
                  const crit = CRITERIA_DEFINITIONS[key];
                  const isSelected = selectedCriterion === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedCriterion(key)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
                        isSelected
                          ? 'bg-primary text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">{crit.icon}</span>
                      {crit.title[langKey]}
                    </button>
                  );
                })}
              </div>

              {/* Top 3 Podium Cards */}
              {sortedLeaderboard.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end pt-1">
                  {/* 2nd Place */}
                  {sortedLeaderboard[1] ? (
                    <div className="order-2 md:order-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col items-center text-center relative shadow-sm">
                      <div className="absolute top-2.5 right-2.5 size-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-[10px] flex items-center justify-center border border-slate-200 dark:border-slate-700">
                        2nd
                      </div>
                      <div className="size-14 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black text-lg flex items-center justify-center mb-2">
                        {sortedLeaderboard[1].displayName[0]?.toUpperCase()}
                      </div>
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-sm truncate w-full">
                        {sortedLeaderboard[1].displayName}
                      </h4>
                      <span className="text-xs text-primary dark:text-blue-400 font-bold mt-0.5">
                        {getCriterionValue(sortedLeaderboard[1], selectedCriterion).toLocaleString()} {CRITERIA_DEFINITIONS[selectedCriterion].unit[langKey]}
                      </span>
                    </div>
                  ) : (
                    <div className="order-2 md:order-1 hidden md:block" />
                  )}

                  {/* 1st Place */}
                  {sortedLeaderboard[0] && (
                    <div className="order-1 md:order-2 bg-gradient-to-b from-amber-500/10 via-white to-amber-500/5 dark:from-amber-500/10 dark:via-slate-900 dark:to-slate-900 border-2 border-amber-400 dark:border-amber-500/40 rounded-2xl p-5 flex flex-col items-center text-center relative shadow-md scale-105">
                      <div className="absolute top-2.5 right-2.5 size-8 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-sm">
                        1st
                      </div>
                      <div className="size-16 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 font-black text-xl flex items-center justify-center border-4 border-amber-300 shadow-md mb-2">
                        {sortedLeaderboard[0].displayName[0]?.toUpperCase()}
                      </div>
                      <h4 className="font-black text-slate-900 dark:text-amber-300 text-base truncate w-full">
                        {sortedLeaderboard[0].displayName}
                      </h4>
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-extrabold mt-0.5">
                        {getCriterionValue(sortedLeaderboard[0], selectedCriterion).toLocaleString()} {CRITERIA_DEFINITIONS[selectedCriterion].unit[langKey]}
                      </span>
                    </div>
                  )}

                  {/* 3rd Place */}
                  {sortedLeaderboard[2] ? (
                    <div className="order-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col items-center text-center relative shadow-sm">
                      <div className="absolute top-2.5 right-2.5 size-7 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-black text-[10px] flex items-center justify-center border border-amber-200 dark:border-amber-800/40">
                        3rd
                      </div>
                      <div className="size-14 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 font-black text-lg flex items-center justify-center mb-2">
                        {sortedLeaderboard[2].displayName[0]?.toUpperCase()}
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate w-full">
                        {sortedLeaderboard[2].displayName}
                      </h4>
                      <span className="text-xs text-primary dark:text-blue-400 font-bold mt-0.5">
                        {getCriterionValue(sortedLeaderboard[2], selectedCriterion).toLocaleString()} {CRITERIA_DEFINITIONS[selectedCriterion].unit[langKey]}
                      </span>
                    </div>
                  ) : (
                    <div className="order-3 hidden md:block" />
                  )}
                </div>
              )}

              {/* Leaderboard Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
                  <h4 className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-base">trophy</span>
                    {CRITERIA_DEFINITIONS[selectedCriterion].title[langKey]} {language === 'ko' ? '순위표' : 'Leaderboard'}
                  </h4>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {CRITERIA_DEFINITIONS[selectedCriterion].description[langKey]}
                  </span>
                </div>

                {isLoadingRankings ? (
                  <div className="p-6 text-center text-slate-500 text-xs font-bold">
                    {language === 'ko' ? '순위표 데이터를 불러오는 중...' : 'Loading leaderboard...'}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sortedLeaderboard.map((usr, idx) => {
                      const isMe = usr.uid === currentUserEntry.uid;
                      return (
                        <div
                          key={usr.uid}
                          className={`px-5 py-3 flex items-center justify-between transition-colors ${
                            isMe
                              ? 'bg-blue-50/70 dark:bg-blue-950/30 border-l-4 border-primary'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-6 text-center text-xs font-black ${
                                idx === 0
                                  ? 'text-amber-500'
                                  : idx === 1
                                  ? 'text-slate-400'
                                  : idx === 2
                                  ? 'text-amber-700'
                                  : 'text-slate-400'
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <div className="size-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center text-xs shadow-sm">
                              {usr.displayName[0]?.toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 dark:text-white text-xs md:text-sm">
                                  {usr.displayName}
                                </span>
                                {isMe && (
                                  <span className="text-[9px] bg-primary text-white px-1.5 py-0.2 rounded font-black uppercase">
                                    Me
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                Lv.{usr.level} | {usr.distance.toLocaleString()}km | {usr.linesCount}노선 | {usr.prefecturesCount}도도부현
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-black text-primary dark:text-blue-400 text-sm md:text-base">
                              {getCriterionValue(usr, selectedCriterion).toLocaleString()}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-1 font-bold">
                              {CRITERIA_DEFINITIONS[selectedCriterion].unit[langKey]}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ACHIEVEMENTS */}
          {activeTab === 'achievements' && (
            <div className="space-y-4">
              {/* Category Filter */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-1.5 flex gap-1.5 overflow-x-auto">
                {[
                  { key: 'all', label: { ko: '전체 업적', en: 'All Badges', ja: '全実績' } },
                  { key: 'field', label: { ko: '🌐 분야별', en: '🌐 Field', ja: '🌐 分野別' } },
                  { key: 'region', label: { ko: '🗾 지역별', en: '🗾 Region', ja: '🗾 地域別' } },
                  { key: 'local', label: { ko: '📍 국지적 범주', en: '📍 Local', ja: '📍 局地カテゴリ' } },
                ].map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setAchievementFilter(cat.key as any)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      achievementFilter === cat.key
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {cat.label[langKey]}
                  </button>
                ))}
              </div>

              {/* Achievements Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredAchievements.map((ach) => {
                  const progress = ach.calcProgress(recordedTrips, railData, visitedLineLengths);
                  return (
                    <div
                      key={ach.id}
                      className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 flex items-start gap-3.5 transition-all shadow-sm ${
                        progress.isUnlocked
                          ? 'border-emerald-200 dark:border-emerald-950 bg-emerald-50/30 dark:bg-emerald-950/10'
                          : 'border-slate-200 dark:border-slate-800 opacity-80'
                      }`}
                    >
                      <div
                        className={`size-10 rounded-xl bg-gradient-to-br ${ach.color} text-white flex items-center justify-center shrink-0 shadow-md ${
                          !progress.isUnlocked && 'grayscale'
                        }`}
                      >
                        <span className="material-symbols-outlined text-xl">{ach.icon}</span>
                      </div>

                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between gap-1.5">
                          <h4 className="font-extrabold text-slate-900 dark:text-white text-xs md:text-sm truncate">
                            {ach.title[langKey]}
                          </h4>
                          {progress.isUnlocked ? (
                            <span className="text-[9px] bg-emerald-500 text-white font-black px-2 py-0.2 rounded-full uppercase shrink-0 shadow-sm">
                              Unlocked
                            </span>
                          ) : (
                            <span className="text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-500 font-bold px-1.5 py-0.2 rounded-full shrink-0">
                              {progress.current} / {ach.maxProgress}
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-2">
                          {ach.description[langKey]}
                        </p>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              progress.isUnlocked
                                ? 'bg-emerald-500'
                                : 'bg-primary dark:bg-blue-500'
                            }`}
                            style={{ width: `${progress.percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
