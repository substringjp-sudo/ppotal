"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth, AuthModal } from "@ppotal/ui";
import { Map as MapIcon, Trophy, LogOut, RefreshCw, CheckCircle2 } from "lucide-react";
import { ExportMapButton } from "@/components/map/ExportMapButton";
import { RegionSearch } from "@/components/common/RegionSearch";
import { usePathname } from "next/navigation";
import { useVisitStore } from "@/store/visitStore";
import { padId } from "@regionevel/utils";

export function Nav() {
  const { user, profile, loading, logout } = useAuth();
  const { importTripsFromJprail, allRegions } = useVisitStore();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncSummaryOpen, setIsSyncSummaryOpen] = useState(false);
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

  // Detect mobile viewport
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  return (
    <header className="flex h-14 items-center border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 md:px-6 shrink-0 sticky top-0 z-[2000] shadow-sm relative justify-between">
      {/* Left: Logo & Title */}
      <div className="flex items-center gap-3 shrink-0 mr-4">
        <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="size-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm overflow-hidden">
            <img src="/icon.png" alt="Regionevel Logo" className="size-full object-cover" />
          </div>
          <h1 className="text-lg md:text-xl font-black tracking-tight text-slate-800 dark:text-white block">
            <span className="text-blue-600">Region</span>evel
          </h1>
        </Link>
      </div>

      {/* Middle: Search (Only in Desktop) */}
      {!isMobile && (
        <div className="flex-1 flex justify-center px-4">
          <RegionSearch />
        </div>
      )}

      {/* Right: Menu Navigation & User Profile */}
      <div className="flex items-center gap-4 ml-auto">
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/map"
            className={`text-sm font-bold transition-colors flex items-center gap-1.5 ${
              pathname === "/map" ? "text-blue-600" : "text-slate-500 hover:text-blue-600"
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
          <ExportMapButton />
        </nav>

        {/* Divider line for desktop */}
        <div className="hidden md:block h-6 w-px bg-slate-200 dark:bg-slate-700" />

        <div className="flex items-center gap-3 shrink-0">
          {loading ? (
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
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
                <div className="absolute right-0 mt-2 w-52 bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl rounded-2xl overflow-hidden z-[2010] animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Logged in as</p>
                    <p className="text-xs font-bold text-slate-800 truncate" title={user.email || ""}>
                      {user.email}
                    </p>
                  </div>
                  <div className="py-1 border-b border-slate-100">
                    <button
                      onClick={() => {
                        handleSyncWithJprail();
                        setIsDropdownOpen(false);
                      }}
                      disabled={isSyncing}
                      className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
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
                      className="w-full px-4 py-2.5 text-left text-xs font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-md hover:shadow-lg active:scale-95"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <SyncSummaryModal
        isOpen={isSyncSummaryOpen}
        onClose={() => setIsSyncSummaryOpen(false)}
        importedCount={syncSummaryData.count}
        cities={syncSummaryData.cities}
      />
    </header>
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
    <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 max-w-sm w-full flex flex-col gap-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800">
              동기화 완료
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              Regionevel ↔ JPRAIL
            </p>
          </div>
        </div>
        
        <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
          <p className="text-xs text-slate-600 font-bold leading-relaxed">
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
                <span key={idx} className="bg-blue-50 border border-blue-100 text-blue-600 px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-tight">
                  {city}
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer mt-1"
        >
          확인
        </button>
      </div>
    </div>
  );
};
