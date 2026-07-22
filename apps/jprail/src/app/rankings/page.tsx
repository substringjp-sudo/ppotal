"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { RankingsModal } from '../../components/RankingsModal';

export default function RankingsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-900/60 flex items-center justify-center">
      <RankingsModal
        isOpen={true}
        onClose={() => router.push('/')}
      />
    </div>
  );
}
