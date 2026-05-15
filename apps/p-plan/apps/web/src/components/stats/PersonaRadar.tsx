'use client';

import { motion } from 'framer-motion';
import { TravelStats } from '@pplaner/shared';

interface PersonaRadarProps {
  stats: TravelStats;
}

export default function PersonaRadar({ stats }: PersonaRadarProps) {
  const { persona, mbti, fantasyClass } = stats;

  const labels = [
    { 
      key: 'p', 
      label: '계획성 (Planning)', 
      sides: ['즉흥적인 매력', '철저한 계획'],
      desc: '계획 수립의 스타일'
    },
    { 
      key: 'a', 
      label: '활동 에너지 (Activity)', 
      sides: ['여유로운 휴식', '에너제틱 활동'],
      desc: '일정의 에너지 레벨'
    },
    { 
      key: 't', 
      label: '여행의 밀도 (Pace)', 
      sides: ['최대한 여유있게', '알차게 꽉 채워'],
      desc: '일정 소화의 밀도'
    },
    { 
      key: 'th', 
      label: '선호 성향 (Preference)', 
      sides: ['현지인 감성', '트렌디한 핫플'],
      desc: '장소 선택의 기준'
    },
  ];

  const size = 300;
  const center = size / 2;
  const radius = size * 0.4;

  const getCoordinates = (value: number, index: number, total: number) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
    const r = (value / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const points = labels.map((l, i) => 
    getCoordinates(persona[l.key as keyof typeof persona], i, labels.length)
  );

  const pathData = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')} Z`;

  const handleRetest = () => {
    (window as any).showPersonaTest?.();
  };

  return (
    <section className="h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[40px] p-8 md:p-10 flex flex-col md:flex-row items-center gap-12 shadow-sm">
      <div className="relative group">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[45deg] relative">
          {/* Background Circles */}
          {[20, 40, 60, 80, 100].map((tick) => (
            <circle
              key={tick}
              cx={center}
              cy={center}
              r={(tick / 100) * radius}
              fill="none"
              stroke="currentColor"
              className="text-slate-100 dark:text-slate-800"
              strokeDasharray={tick === 100 ? "0" : "4 4"}
            />
          ))}

          {/* Axis Lines */}
          {labels.map((_, i) => {
            const edge = getCoordinates(100, i, labels.length);
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={edge.x}
                y2={edge.y}
                stroke="currentColor"
                className="text-slate-100 dark:text-slate-800"
              />
            );
          })}

          {/* Data Polygon */}
          <motion.path
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            d={pathData}
            fill="rgba(244, 63, 94, 0.1)"
            stroke="#f43f5e"
            strokeWidth="3"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {points.map((p, i) => (
            <motion.circle
              key={i}
              initial={{ r: 0 }}
              animate={{ r: 4 }}
              transition={{ delay: 1 + i * 0.1 }}
              cx={p.x}
              cy={p.y}
              fill="#f43f5e"
              className="drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]"
            />
          ))}
        </svg>

        {/* Floating MBTI */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none select-none">
          <p 
            className="text-5xl font-black text-orange-500 dark:text-orange-400 tracking-[0.2em] transition-all duration-700"
            style={{
              textShadow: '0 0 20px rgba(249, 115, 22, 0.4)',
              WebkitTextStroke: '3px var(--text-stroke-color, white)',
            }}
          >
            {mbti}
          </p>
          <style jsx>{`
            p { --text-stroke-color: white; }
            :global(.dark) p { --text-stroke-color: #0f172a; }
          `}</style>
        </div>
      </div>

      <div className="flex-1 space-y-8 w-full">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">여행 DNA 분석</h2>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
            <p className="text-[10px] font-black text-primary uppercase tracking-widest">Calculated by User Behavior Data</p>
          </div>
        </div>

        <div className="space-y-8">
          {labels.map((l, i) => {
            const val = persona[l.key as keyof typeof persona] ?? 50;
            const leftPercent = 100 - val;
            const rightPercent = val;
            
            return (
              <div key={l.key} className="space-y-3">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-primary/40" />
                    {l.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded ${leftPercent > 50 ? 'bg-primary/10 text-primary' : 'bg-slate-50 text-slate-400'}`}>{leftPercent}</span>
                    <span className="text-slate-200">:</span>
                    <span className={`px-1.5 py-0.5 rounded ${rightPercent >= 50 ? 'bg-primary/10 text-primary' : 'bg-slate-50 text-slate-400'}`}>{rightPercent}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {/* Left Label */}
                  <div className={`flex-1 text-right transition-all duration-700 ${leftPercent > 50 ? 'text-slate-900 dark:text-white scale-105 font-black' : 'text-slate-300 dark:text-slate-700 font-bold'}`}>
                    <p className="text-[10px] leading-tight">{l.sides[0]}</p>
                  </div>

                  {/* Enhanced Balanced Bar */}
                  <div className="relative w-40 h-2.5 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden flex items-center border border-slate-200/50 dark:border-white/5">
                    {/* Center Point */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/50 dark:bg-black/20 z-10" />
                    
                    {/* Left Fill */}
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${leftPercent}%` }}
                      transition={{ delay: 0.5 + i * 0.1, duration: 1.2, ease: "circOut" }}
                      style={{ left: 0 }}
                      className="absolute top-0 bottom-0 bg-gradient-to-r from-slate-200/30 to-primary/20"
                    />
                    
                    {/* Right Fill */}
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${rightPercent}%` }}
                      transition={{ delay: 0.5 + i * 0.1, duration: 1.2, ease: "circOut" }}
                      style={{ right: 0 }}
                      className="absolute top-0 bottom-0 bg-gradient-to-l from-primary to-primary/40"
                    />

                    {/* Handle */}
                    <motion.div 
                      initial={{ left: "50%" }}
                      animate={{ left: `${rightPercent}%` }}
                      transition={{ delay: 0.5 + i * 0.1, duration: 1.2, ease: "circOut" }}
                      className="absolute top-0 bottom-0 w-1 bg-white dark:bg-slate-900 border-x border-primary/30 z-20 shadow-[0_0_8px_rgba(244,63,94,0.3)]"
                    />
                  </div>

                  {/* Right Label */}
                  <div className={`flex-1 text-left transition-all duration-700 ${rightPercent >= 50 ? 'text-slate-900 dark:text-white scale-105 font-black' : 'text-slate-300 dark:text-slate-700 font-bold'}`}>
                    <p className="text-[10px] leading-tight">{l.sides[1]}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-6 border-t border-slate-200/60 dark:border-slate-800 mt-auto flex items-center justify-between">
            <div className="space-y-1">
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1 leading-none">부여된 클래스</p>
                <p className="text-xl font-black text-slate-900 dark:text-white leading-none">{fantasyClass}</p>
            </div>
            <button 
                onClick={handleRetest}
                className="px-4 py-2 bg-slate-50 dark:bg-white/5 hover:bg-primary/10 text-slate-400 hover:text-primary rounded-xl border border-slate-200 dark:border-white/5 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
            >
                <span className="material-symbols-rounded text-sm">restart_alt</span>
                Retest
            </button>
        </div>
      </div>
    </section>
  );
}
