"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@ppotal/ui";
import { db } from "@ppotal/firebase";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { useVisitStore } from "@/store/visitStore";
import { REGIONEVEL_ACHIEVEMENTS } from "@/lib/achievements";
import {
  CRITERIA_DEFINITIONS,
  RankingCriterion,
  UserRankEntry,
  computeUserRankEntry,
  sortUsersByCriterion,
  getCriterionValue,
} from "@/lib/rankings";
import { Z } from "@/lib/layers";
import {
  Trophy,
  Award,
  Globe,
  Building2,
  Map as MapIcon,
  Hotel,
  Compass,
  Footprints,
  Sparkles,
  Sun,
  Landmark,
  Castle,
  CheckCircle2,
  BarChart3,
  X,
} from "lucide-react";

interface RankingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RankingsModal: React.FC<RankingsModalProps> = ({ isOpen, onClose }) => {
  const { user, profile, loading: authLoading } = useAuth();
  const { visits, stats, scores, allRegions } = useVisitStore();

  const [activeTab, setActiveTab] = useState<"rankings" | "achievements">("rankings");
  const [selectedCriterion, setSelectedCriterion] = useState<RankingCriterion>("totalScore");
  const [achievementFilter, setAchievementFilter] = useState<"all" | "field" | "region" | "local">("all");

  const [communityUsers, setCommunityUsers] = useState<UserRankEntry[]>([]);
  const [isLoadingRankings, setIsLoadingRankings] = useState(true);

  // Keyboard shortcut (Escape)
  useEffect(() => {
    if (isOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleEscape);
      return () => window.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  // Fetch Firestore users for leaderboard
  useEffect(() => {
    if (!isOpen) return;
    const fetchUsers = async () => {
      try {
        const usersRef = collection(db, "users");
        const snap = await getDocs(usersRef);
        const fetchedList: UserRankEntry[] = [];

        snap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.regionevelStats) {
            fetchedList.push({
              uid: docSnap.id,
              displayName: data.displayName || data.email?.split("@")[0] || "Footprint Explorer",
              email: data.email,
              photoURL: data.photoURL,
              ...data.regionevelStats,
            });
          }
        });

        setCommunityUsers(fetchedList);
      } catch (err) {
        console.warn("Could not fetch Firestore users:", err);
      } finally {
        setIsLoadingRankings(false);
      }
    };

    fetchUsers();
  }, [isOpen]);

  // Calculate current user's entry
  const currentUserEntry = useMemo(() => {
    const uid = user?.uid || "guest_user";
    const name = profile?.displayName || user?.displayName || user?.email?.split("@")[0] || "나 (게스트)";
    return computeUserRankEntry(uid, name, user?.email || undefined, visits, stats, scores, allRegions);
  }, [user, profile, visits, stats, scores, allRegions]);

  // Sync current user entry to Firestore if logged in
  useEffect(() => {
    if (isOpen && user?.uid && !authLoading) {
      const userRef = doc(db, "users", user.uid);
      setDoc(
        userRef,
        {
          displayName: currentUserEntry.displayName,
          email: user.email || "",
          photoURL: user.photoURL || "",
          regionevelStats: currentUserEntry,
        },
        { merge: true }
      ).catch((e) => console.error("Failed to sync user stats to Firestore:", e));
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
    if (achievementFilter === "all") return REGIONEVEL_ACHIEVEMENTS;
    return REGIONEVEL_ACHIEVEMENTS.filter((a) => a.category === achievementFilter);
  }, [achievementFilter]);

  const getAchievementIcon = (iconName: string) => {
    switch (iconName) {
      case "footprints":
        return <Footprints className="w-5 h-5" />;
      case "building-2":
        return <Building2 className="w-5 h-5" />;
      case "map-pin":
      case "map":
        return <MapIcon className="w-5 h-5" />;
      case "hotel":
        return <Hotel className="w-5 h-5" />;
      case "trophy":
        return <Trophy className="w-5 h-5" />;
      case "landmark":
        return <Landmark className="w-5 h-5" />;
      case "castle":
        return <Castle className="w-5 h-5" />;
      case "globe-2":
      case "globe":
        return <Globe className="w-5 h-5" />;
      case "compass":
        return <Compass className="w-5 h-5" />;
      case "sparkles":
        return <Sparkles className="w-5 h-5" />;
      case "sun":
        return <Sun className="w-5 h-5" />;
      default:
        return <Award className="w-5 h-5" />;
    }
  };

  const getCriterionIcon = (iconName: string) => {
    switch (iconName) {
      case "bar-chart-3":
        return <BarChart3 className="w-4 h-4" />;
      case "map":
        return <MapIcon className="w-4 h-4" />;
      case "building-2":
        return <Building2 className="w-4 h-4" />;
      case "globe":
        return <Globe className="w-4 h-4" />;
      case "hotel":
        return <Hotel className="w-4 h-4" />;
      case "award":
        return <Award className="w-4 h-4" />;
      default:
        return <Trophy className="w-4 h-4" />;
    }
  };

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
            <Award className="w-6 h-6 text-amber-500" />
            <h2 className="text-base md:text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Regionevel
              <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                랭킹 & 업적
              </span>
            </h2>
          </div>

          <button
            onClick={onClose}
            className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors font-bold"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Modal Scrollable Body */}
        <div className="p-4 md:p-6 overflow-y-auto space-y-6 flex-1">
          {/* User Status Hero Card */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="size-14 md:size-16 rounded-2xl bg-blue-600 text-white font-black text-xl md:text-2xl flex items-center justify-center shadow-md ring-4 ring-blue-500/10 shrink-0">
                Lv.{currentUserEntry.level}
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white truncate">
                    {currentUserEntry.displayName}
                  </h3>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    #{myRankIndex} 위
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  총 풋프린트 스코어 {currentUserEntry.totalScore.toLocaleString()}점 | {currentUserEntry.citiesCount}개 도시 정복
                </p>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-2.5 w-full md:w-auto">
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 border border-slate-200 dark:border-slate-700/50 text-center">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block tracking-wider">
                  획득 업적
                </span>
                <span className="text-sm md:text-base font-black text-amber-500 dark:text-amber-400">
                  {currentUserEntry.achievementsUnlocked} / {REGIONEVEL_ACHIEVEMENTS.length}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 border border-slate-200 dark:border-slate-700/50 text-center">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block tracking-wider">
                  방문 국가
                </span>
                <span className="text-sm md:text-base font-black text-blue-600 dark:text-blue-400">
                  {currentUserEntry.countriesCount} 개국
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 border border-slate-200 dark:border-slate-700/50 text-center">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block tracking-wider">
                  도도부현
                </span>
                <span className="text-sm md:text-base font-black text-emerald-600 dark:text-emerald-400">
                  {currentUserEntry.prefecturesCount} 개
                </span>
              </div>
            </div>
          </section>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6">
            <button
              onClick={() => setActiveTab("rankings")}
              className={`pb-2.5 text-xs md:text-sm font-black transition-colors relative flex items-center gap-1.5 ${
                activeTab === "rankings"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Trophy className="w-4 h-4" />
              리더보드 랭킹
            </button>
            <button
              onClick={() => setActiveTab("achievements")}
              className={`pb-2.5 text-xs md:text-sm font-black transition-colors relative flex items-center gap-1.5 ${
                activeTab === "achievements"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Award className="w-4 h-4" />
              업적 뱃지
            </button>
          </div>

          {/* TAB 1: RANKINGS */}
          {activeTab === "rankings" && (
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
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      {getCriterionIcon(crit.icon)}
                      {crit.title.ko}
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
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-0.5">
                        {getCriterionValue(sortedLeaderboard[1], selectedCriterion).toLocaleString()} {CRITERIA_DEFINITIONS[selectedCriterion].unit.ko}
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
                        {getCriterionValue(sortedLeaderboard[0], selectedCriterion).toLocaleString()} {CRITERIA_DEFINITIONS[selectedCriterion].unit.ko}
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
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-0.5">
                        {getCriterionValue(sortedLeaderboard[2], selectedCriterion).toLocaleString()} {CRITERIA_DEFINITIONS[selectedCriterion].unit.ko}
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
                    <Trophy className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    {CRITERIA_DEFINITIONS[selectedCriterion].title.ko} 순위표
                  </h4>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {CRITERIA_DEFINITIONS[selectedCriterion].description.ko}
                  </span>
                </div>

                {isLoadingRankings ? (
                  <div className="p-6 text-center text-slate-500 text-xs font-bold">
                    순위표 데이터를 불러오는 중...
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
                              ? "bg-blue-50/70 dark:bg-blue-950/30 border-l-4 border-blue-600"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-6 text-center text-xs font-black ${
                                idx === 0
                                  ? "text-amber-500"
                                  : idx === 1
                                  ? "text-slate-400"
                                  : idx === 2
                                  ? "text-amber-700"
                                  : "text-slate-400"
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
                                  <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.2 rounded font-black uppercase">
                                    Me
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                Lv.{usr.level} | {usr.citiesCount}시정촌 | {usr.prefecturesCount}도도부현 | {usr.countriesCount}국가
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-black text-blue-600 dark:text-blue-400 text-sm md:text-base">
                              {getCriterionValue(usr, selectedCriterion).toLocaleString()}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-1 font-bold">
                              {CRITERIA_DEFINITIONS[selectedCriterion].unit.ko}
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
          {activeTab === "achievements" && (
            <div className="space-y-4">
              {/* Category Filter */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-1.5 flex gap-1.5 overflow-x-auto">
                {[
                  { key: "all", label: "전체 업적" },
                  { key: "field", label: "🌐 분야별" },
                  { key: "region", label: "🗾 지역별" },
                  { key: "local", label: "📍 국지적 범주" },
                ].map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setAchievementFilter(cat.key as any)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      achievementFilter === cat.key
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Achievements Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredAchievements.map((ach) => {
                  const progress = ach.calcProgress(visits, stats, scores, allRegions);
                  return (
                    <div
                      key={ach.id}
                      className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 flex items-start gap-3.5 transition-all shadow-sm ${
                        progress.isUnlocked
                          ? "border-emerald-200 dark:border-emerald-950 bg-emerald-50/30 dark:bg-emerald-950/10"
                          : "border-slate-200 dark:border-slate-800 opacity-80"
                      }`}
                    >
                      <div
                        className={`size-10 rounded-xl bg-gradient-to-br ${ach.color} text-white flex items-center justify-center shrink-0 shadow-md ${
                          !progress.isUnlocked && "grayscale"
                        }`}
                      >
                        {getAchievementIcon(ach.icon)}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between gap-1.5">
                          <h4 className="font-extrabold text-slate-900 dark:text-white text-xs md:text-sm truncate">
                            {ach.title.ko}
                          </h4>
                          {progress.isUnlocked ? (
                            <span className="text-[9px] bg-emerald-500 text-white font-black px-2 py-0.2 rounded-full uppercase shrink-0 shadow-sm flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Unlocked
                            </span>
                          ) : (
                            <span className="text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-500 font-bold px-1.5 py-0.2 rounded-full shrink-0">
                              {progress.current} / {ach.maxProgress}
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-2">
                          {ach.description.ko}
                        </p>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              progress.isUnlocked ? "bg-emerald-500" : "bg-blue-600 dark:bg-blue-500"
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
