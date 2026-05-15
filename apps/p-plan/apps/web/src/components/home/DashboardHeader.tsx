'use client';
import { useRouter } from 'next/navigation';
import { useWizardStore } from '@pplaner/shared';
import { motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { parseTripFromJSON } from '@pplaner/shared';
import { saveTrip } from '@pplaner/shared';
import { toast } from 'sonner';

interface DashboardHeaderProps {
  user: any;
  progress: number;
  itemVariants: any;
}

export default function DashboardHeader({ user, progress, itemVariants }: DashboardHeaderProps) {
  const router = useRouter();
  const openWizard = useWizardStore(state => state.open);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              setImporting(true);
              const jsonString = event.target?.result as string;
              const newTrip = parseTripFromJSON(jsonString);
              
              if (!user) throw new Error('로그인이 필요합니다.');

              await saveTrip(newTrip, { uid: user.uid, name: user.displayName || '여행자', photoURL: user.photoURL });
              
              toast.success('여행을 성공적으로 불러왔습니다!');
              router.push(`/dashboard/${newTrip.id}`);
          } catch (error) {
              console.error(error);
              toast.error('파일을 불러오는데 실패했습니다.');
          } finally {
              setImporting(false);
              if (fileInputRef.current) fileInputRef.current.value = '';
          }
      };
      reader.readAsText(file);
  };

  return (
    <section className="flex flex-col md:flex-row md:items-center justify-between gap-3 py-2">
      <motion.div variants={itemVariants}>
          <div className="flex items-center gap-2 mb-0.5">
             <div className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-black rounded-full tracking-widest uppercase">나의 여행 노트</div>
             {progress > 0 && <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">여행 {Math.round(progress)}% 완성</div>}
          </div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
              <span className="text-primary italic mr-1">{user?.displayName?.split(' ')?.[0] || '여행자'}</span>님의 여행 기록
          </h1>
      </motion.div>

      <motion.div variants={itemVariants} className="flex gap-2">
          {/* JSON 업로드 인풋 (숨김) */}
          <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              className="hidden"
              onChange={handleImport}
          />
          <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 rounded-xl text-sm font-black hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
              <span className={`material-symbols-rounded text-base ${importing ? 'animate-spin' : ''}`}>
                  {importing ? 'sync' : 'upload_file'}
              </span>
              불러오기
          </button>

          <button onClick={() => openWizard('RECORD')} className="px-4 sm:px-5 py-2 bg-primary text-white rounded-xl text-sm font-black shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
              <span className="material-symbols-rounded font-black text-base">edit_note</span>
              새 여행 기록하기
          </button>
          <div className="relative group hidden sm:block">
              <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <button onClick={() => router.push('/trips')} className="relative px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl text-sm font-black hover:bg-slate-50 dark:hover:bg-slate-850 transition-all flex items-center gap-2">
                  <span className="material-symbols-rounded text-base">grid_view</span>
                  내 여행 노트
              </button>
          </div>
      </motion.div>
    </section>
  );
}
