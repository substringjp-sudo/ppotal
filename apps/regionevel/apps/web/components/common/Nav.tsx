"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth, AuthModal } from "@ppotal/ui";
import { Map as MapIcon, Sparkles, Trophy } from "lucide-react";
import { ExportMapButton } from "@/components/map/ExportMapButton";

export function Nav() {
  const { user, profile, loading, logout, refreshProfile } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <nav className="flex h-14 items-center gap-4 px-4 bg-white border-b border-gray-200 shadow-sm sticky top-0 z-[2000]">
      <Link href="/" className="font-bold text-blue-700 text-lg tracking-tight">
        Regionevel
      </Link>
      <Link
        href="/map"
        className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
      >
        Map
      </Link>
      <Link
        href="/list"
        className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
      >
        List
      </Link>
      <div className="ml-auto flex items-center gap-3">
        <ExportMapButton />
        {loading ? (
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        ) : user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">{profile?.displayName || user.email?.split('@')[0]}</span>
            <button 
              onClick={() => logout()}
              className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setIsAuthModalOpen(true)}
            className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-md hover:shadow-lg"
          >
            Sign In
          </button>
        )}
      </div>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </nav>
  );
}
