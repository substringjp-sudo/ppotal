"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth, AuthModal, AppHeader, Button } from "@ppotal/ui";
import { Map as MapIcon, Trophy, LogOut, RefreshCw, CheckCircle2, Info, Pencil, MapPinned, Search, Menu, Share2 } from "lucide-react";
import { RegionSearch } from "@/components/common/RegionSearch";
import { TimelineImportModal } from "@/components/common/TimelineImportModal";
import { MobileSearchSheet } from "@/components/mobile/MobileSearchSheet";
import { MobileMenuSheet } from "@/components/mobile/MobileMenuSheet";
import { usePathname } from "next/navigation";
import { useVisitStore } from "@/store/visitStore";
import { useMapStore } from "@/store/mapStore";
import { useIsPhone } from "@/lib/useIsPhone";
import { Z } from "@/lib/layers";
import { TAP_TARGET_CLASS } from "@/lib/mobile";
import { padId } from "@regionevel/utils";

export function Nav() {
  const { user, profile, loading, logout } = useAuth();
  const { importTripsFromJprail, allRegions } = useVisitStore();
  const { isDrawMode, toggleDrawMode, requestShare } = useMapStore();
  const isMobile = useIsPhone();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSearchSheetOpen, setIsSearchSheetOpen] = useState(false);
  const [isMenuSheetOpen, setIsMenuSheetOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncSummaryOpen, setIsSyncSummaryOpen] = useState(false);
  const [isTimelineImportOpen, setIsTimelineImportOpen] = useState(false);
  const [syncSummaryData, setSyncSummaryData] = useState<{ count: number; cities: string[] }>({ count: 0, cities: [] });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const handleSyncWithJprail = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const res = await importTripsFromJprail(user.uid);
      if (res.success && res.importedShapeIds.length > 0) {
        const activeCities: string[] = [];
        res.importedShapeIds.forEach((shapeId) => {
          const paddedShapeId = padId(shapeId);
          const region = allRegions.find((r) => padId(r.id) === paddedShapeId);
          if (region) {
            const name = region.nameKo || region.name;
            activeCities.push(name);
          }
        });
        
        setSyncSummaryData({
          count: res.importedShapeIds.length,
          cities: Array.from(new Set(activeCities))
        });
        setIsSyncSummaryOpen(true);
      } else {
        setSyncSummaryData({
          count: 0,
          cities: []
        });
        setIsSyncSummaryOpen(true);
      }
    } catch (e) {
      console.error("Failed to sync with JPRAIL:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = profile?.displayName || user?.email?.split('@')[0] || "User";
  const userInitial = (displayName[0] || "U").toUpperCase();

  const handleSignIn = () => setIsAuthModalOpen(true);

  // Logo Slot
  const logoSlot = (
    <Link href="/" className="flex items-center gap-2 min-w-0 mr-auto pl-1 min-h-[44px]" aria-label="Regionevel 홈">
      <div className="size-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm overflow-hidden shrink-0">
        <img src="/icon.png" alt="Regionevel Logo" className="size-full object-cover" />
      </div>
      <span className="text-lg md:text-xl font-black tracking-tight text-slate-800 dark:text-white truncate">
        <span className="text-blue-600">Region</span>evel
      </span>
    </Link>
  );

  // Center Slot (Search)
  const centerSlot = (
    <div className="w-full max-w-md">
      <RegionSearch />
    </div>
  );

  // Right Slot (Desktop Navigation & User Profile)
  const rightSlot = (
    <>
      <nav className="hidden md:flex items-center gap-6">
        <Link
          href="/"
          className={`text-sm font-bold transition-colors flex items-center gap-1.5 ${
            pathname === "/" || pathname === "/map" ? "text-blue-600" : "text-slate-500 hover:text-blue-600"
          }`}
        >
          <MapIcon className="w-4 h-4" />
          Map
        </Link>
        <Link
          href="/list"
          className={`text-sm font-bold transition-colors flex items-center gap-1.5 ${
            pathname === "/list" ? "text-blue-600" : "text-slate-500 hover:text-blue-600"
          }`}
        >
          <Trophy className="w-4 h-4" />
          List
        </Link>
        <Link
          href="/about"
          className={`text-sm font-bold transition-colors flex items-center gap-1.5 ${
            pathname === "/about" ? "text-blue-600" : "text-slate-500 hover:text-blue-600"
          }`}
        >
          <Info className="w-4 h-4" />
          About
        </Link>
        <button
          onClick={toggleDrawMode}
          className={`text-sm font-bold transition-all flex items-center gap-1.5 px-3 py-1.5 rounded-xl cursor-pointer ${
            isDrawMode
              ? "bg-amber-500 text-white shadow-md animate-pulse"
              : "text-slate-500 hover:text-amber-600 hover:bg-amber-50"
          }`}
          title="드래그로 경로 그리기 (Draw Route)"
        >
          <Pencil className="w-4 h-4" />
          <span>Draw</span>
        </button>
        <button
          onClick={() => requestShare()}
          className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1.5 active:scale-95 cursor-pointer focus:outline-none"
          title="공유 카드 만들기"
        >
          <Share2 className="w-4 h-4" />
          <span>Share</span>
        </button>
        <button
          onClick={() => setIsTimelineImportOpen(true)}
          className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1.5 active:scale-95 cursor-pointer focus:outline-none"
          title="구글 타임라인 JSON으로 방문 기록 가져오기"
        >
          <MapPinned className="w-4 h-4" />
          <span>Timeline</span>
        </button>
      </nav>

      {/* Divider line for desktop */}
      <div className="hidden md:block h-6 w-px bg-slate-200 dark:bg-slate-700" />

      <div className="flex items-center gap-3 shrink-0">
        {loading ? (
          <div className="size-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        ) : user ? (
          <div ref={dropdownRef} className="relative">
            {/* Avatar circle */}
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="size-8 md:size-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold cursor-pointer ring-2 ring-white dark:ring-slate-800 shadow-md transition-all hover:scale-105 active:scale-95 focus:outline-none"
              title={user.email || 'User'}
            >
              {userInitial}
            </button>

            {/* Profile dropdown menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl overflow-hidden z-[2010] animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Logged in as</p>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={user.email || ""}>
                    {user.email}
                  </p>
                </div>
                <div className="py-1 border-b border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      handleSyncWithJprail();
                      setIsDropdownOpen(false);
                    }}
                    disabled={isSyncing}
                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
                    {isSyncing ? "Syncing..." : "Import from JPRAIL"}
                  </button>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      logout();
                      setIsDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAuthModalOpen(true)}
            className="!bg-blue-600 hover:!bg-blue-700 font-bold shadow-md"
          >
            Sign In
          </Button>
        )}
      </div>
    </>
  );

  // Mobile Action Buttons
  const mobileActionsSlot = (
    <>
      <button
        onClick={() => setIsSearchSheetOpen(true)}
        className={`${TAP_TARGET_CLASS} flex items-center justify-center rounded-xl text-slate-500 active:bg-slate-100 dark:active:bg-slate-800`}
        aria-label="지역 검색"
      >
        <Search className="w-5 h-5" />
      </button>
      <button
        onClick={() => requestShare()}
        className={`${TAP_TARGET_CLASS} flex items-center justify-center rounded-xl text-slate-500 active:bg-slate-100 dark:active:bg-slate-800`}
        aria-label="공유 카드 만들기"
      >
        <Share2 className="w-5 h-5" />
      </button>
      <button
        onClick={() => setIsMenuSheetOpen(true)}
        className={`${TAP_TARGET_CLASS} flex items-center justify-center rounded-xl text-slate-500 active:bg-slate-100 dark:active:bg-slate-800`}
        aria-label="메뉴 열기"
      >
        {user ? (
          <span className="size-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
            {userInitial}
          </span>
        ) : (
          <Menu className="w-5 h-5" />
        )}
      </button>
    </>
  );

  return (
    <>
      <AppHeader
        isMobile={isMobile}
        logo={logoSlot}
        center={centerSlot}
        right={rightSlot}
        mobileActions={mobileActionsSlot}
        style={{ zIndex: Z.header }}
      />

      <MobileSearchSheet isOpen={isSearchSheetOpen} onClose={() => setIsSearchSheetOpen(false)} />
      <MobileMenuSheet
        isOpen={isMenuSheetOpen}
        onClose={() => setIsMenuSheetOpen(false)}
        isDrawMode={isDrawMode}
        onToggleDraw={toggleDrawMode}
        onShare={requestShare}
        onTimelineImport={() => setIsTimelineImportOpen(true)}
        onSyncJprail={handleSyncWithJprail}
        isSyncing={isSyncing}
        onSignIn={handleSignIn}
        onSignOut={logout}
        userEmail={user?.email ?? null}
      />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <TimelineImportModal isOpen={isTimelineImportOpen} onClose={() => setIsTimelineImportOpen(false)} />
      <SyncSummaryModal
        isOpen={isSyncSummaryOpen}
        onClose={() => setIsSyncSummaryOpen(false)}
        importedCount={syncSummaryData.count}
        cities={syncSummaryData.cities}
      />
    </>
  );
}

interface SyncSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  importedCount: number;
  cities: string[];
}

const SyncSummaryModal: React.FC<SyncSummaryModalProps> = ({ isOpen, onClose, importedCount, cities }) => {
  if (!isOpen) return null;
  return (
    <div style={{ zIndex: Z.modalNested }} className="fixed inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl p-6 max-w-sm w-full flex flex-col gap-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
              동기화 완료
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              Regionevel ↔ JPRAIL
            </p>
          </div>
        </div>
        
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl">
          <p className="text-xs text-slate-600 dark:text-slate-300 font-bold leading-relaxed">
            {importedCount > 0 
              ? `JPRAIL에서 총 ${importedCount}개의 시정촌 방문 기록을 성공적으로 가져와 반영했습니다.` 
              : `가져올 새로운 JPRAIL 방문 기록이 없거나 동기화할 데이터가 존재하지 않습니다.`}
          </p>
        </div>

        {cities.length > 0 && (
          <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              가져온 시정촌 목록
            </span>
            <div className="flex flex-wrap gap-1">
              {cities.map((city, idx) => (
                <span key={idx} className="bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-tight">
                  {city}
                </span>
              ))}
            </div>
          </div>
        )}

        <Button
          variant="primary"
          size="md"
          onClick={onClose}
          className="w-full !bg-slate-800 hover:!bg-slate-700 text-white font-bold"
        >
          확인
        </Button>
      </div>
    </div>
  );
};
