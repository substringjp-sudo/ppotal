"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth, AuthModal } from "@ppotal/ui";
import { Map as MapIcon, Trophy, LogOut } from "lucide-react";
import { ExportMapButton } from "@/components/map/ExportMapButton";
import { RegionSearch } from "@/components/common/RegionSearch";
import { usePathname } from "next/navigation";

export function Nav() {
  const { user, profile, loading, logout } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

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
    <nav className="flex h-14 items-center gap-4 px-4 bg-white border-b border-gray-200 shadow-sm sticky top-0 z-[2000] justify-between">
      {/* Left Logo */}
      <div className="flex items-center gap-3 shrink-0">
        <Link href="/" className="font-bold text-blue-700 text-lg tracking-tight hover:opacity-90 transition-opacity">
          Regionevel
        </Link>
      </div>

      {/* Middle: Search (Only in Desktop & Map/List pages) */}
      {!isMobile && (pathname === "/map" || pathname === "/list") && (
        <div className="flex-1 flex justify-center px-4">
          <RegionSearch />
        </div>
      )}

      {/* Right: Menu Navigation & User Profile */}
      <div className="flex items-center gap-4 ml-auto">
        <nav className="hidden md:flex items-center gap-5">
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
        </nav>

        {/* Divider line for desktop */}
        <div className="hidden md:block h-5 w-px bg-slate-200" />

        <div className="flex items-center gap-3 shrink-0">
          <ExportMapButton />
          
          {loading ? (
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          ) : user ? (
            <div ref={dropdownRef} className="relative">
              {/* Avatar circle */}
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="size-8 md:size-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold cursor-pointer ring-2 ring-white shadow-md transition-all hover:scale-105 active:scale-95 focus:outline-none"
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
    </nav>
  );
}
