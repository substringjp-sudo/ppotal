'use client';
import { useRouter } from 'next/navigation';
import { format, parseISO, differenceInDays, startOfDay } from 'date-fns';
import { motion, Variants } from 'framer-motion';
import { cn, formatTripDuration } from '@pplaner/shared';
import TripCoverImage from '@/components/trips/TripCoverImage';
import { TripSummary } from '@pplaner/shared';
import { UserProfile } from '@pplaner/shared';

interface TripHighlightCardProps {
  ongoingTrip?: TripSummary;
  nextTrip?: TripSummary;
  user: UserProfile | null;
  nextMilestone: { title: string; time: string; icon: string } | null;
  itemVariants: Variants;
}

export default function TripHighlightCard({ ongoingTrip, nextTrip, user, nextMilestone, itemVariants }: TripHighlightCardProps) {
  const router = useRouter();
  const targetTrip = ongoingTrip || nextTrip;

  return (
    <motion.section variants={itemVariants} className="relative group overflow-hidden bg-slate-900 rounded-[32px] p-4 lg:p-6 text-white min-h-[200px] lg:min-h-[240px] h-full flex flex-col justify-between shadow-xl">
      {targetTrip ? (
          <>
              <div className="absolute inset-0 opacity-60 group-hover:scale-105 transition-transform duration-[8s] ease-out">
                  <TripCoverImage trip={targetTrip} className="w-full h-full object-cover" />
              </div>
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent z-[1]" />
              <div className="absolute inset-0 bg-slate-950/10 z-[0]" />
              
              <div className="relative z-10 flex flex-col 2xl:flex-row justify-between items-start gap-5 h-full">
                  <div className="flex-1 flex flex-col justify-between h-full">
                      <div>
                          <div className="flex items-center gap-2 mb-2">
                              <span className={cn(
                                  "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-lg backdrop-blur-xl",
                                  ongoingTrip ? "bg-rose-500 text-white animate-pulse" : "bg-primary/90 text-white"
                              )}>
                                  {ongoingTrip ? '지금 여행 중 ✈️' : '다음 여행'}
                              </span>
                              {ongoingTrip && ongoingTrip.dates && (
                                  <span className="text-[9px] font-black text-white/70 uppercase tracking-widest bg-white/10 px-2 py-1 rounded-lg">Day {differenceInDays(startOfDay(new Date()), parseISO(ongoingTrip.dates.startDate)) + 1} of {differenceInDays(parseISO(ongoingTrip.dates.endDate), parseISO(ongoingTrip.dates.startDate)) + 1}</span>
                              )}
                          </div>
                          <h2 className="text-2xl md:text-4xl font-black mb-2 leading-tight tracking-tight drop-shadow-2xl">
                              <span className="font-display tracking-tight">{targetTrip.title}</span>
                          </h2>
                          <div className="flex flex-wrap items-center gap-4 text-white font-bold uppercase tracking-widest text-[10px]">
                              <div className="flex items-center gap-2.5 px-3 py-1.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/5 group-hover:bg-white/20 transition-colors">
                                  <span className="material-symbols-rounded text-sm text-primary">calendar_month</span>
                                  {targetTrip.dates?.startDate 
                                      ? `${format(parseISO(targetTrip.dates.startDate), 'MMM dd')}${targetTrip.dates.endDate ? ` - ${format(parseISO(targetTrip.dates.endDate), 'MMM dd, yyyy')}` : ''}`
                                      : formatTripDuration(undefined, undefined, targetTrip.dates?.durationDays)}
                              </div>
                              <div className="flex items-center gap-2.5 px-3 py-1.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/5 group-hover:bg-white/20 transition-colors">
                                  <span className="material-symbols-rounded text-sm text-primary">location_on</span>
                                  {targetTrip.locations?.regions?.[0]?.name || targetTrip.locations?.regionNames?.[0] || 'Flexible'}
                              </div>
                              {!ongoingTrip && targetTrip.dates?.startDate && (
                                  <div className="flex items-center gap-2.5 px-3 py-1.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/5 group-hover:bg-primary group-hover:text-white transition-all text-primary font-black shadow-lg shadow-black/10">
                                      D-{differenceInDays(parseISO(targetTrip.dates.startDate), startOfDay(new Date()))}
                                  </div>
                              )}
                          </div>
                      </div>

                      {/* Action Footprints */}
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-3">
                              <div className="flex -space-x-2">
                                  <div className="w-10 h-10 rounded-xl border-2 border-slate-950 overflow-hidden bg-primary/20 ring-2 ring-white/10 transition-transform hover:scale-110 cursor-pointer relative group/avatar flex items-center justify-center">
                                      {user?.photoURL ? (
                                          <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                                      ) : (
                                          <span className="text-xs font-black text-primary">{user?.displayName?.[0] || 'U'}</span>
                                      )}
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
                                          <span className="text-[6px] font-black uppercase text-white">Me</span>
                                      </div>
                                  </div>
                                  {(targetTrip.participantCount || 0) > 0 && (
                                      <div 
                                          title="파트너와 공유 중인 여행입니다"
                                          className="w-10 h-10 rounded-xl border-2 border-slate-950 bg-slate-800/80 backdrop-blur-md flex items-center justify-center text-[9px] font-black ring-2 ring-white/10 text-primary hover:text-white transition-colors cursor-pointer"
                                      >
                                          +{targetTrip.participantCount}
                                      </div>
                                  )}
                              </div>
                              <div className="flex flex-col">
                                  <span className="text-[8px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">공유 상태</span>
                                  <span className={cn(
                                      "text-[10px] font-black flex items-center gap-1",
                                      (targetTrip.participantCount || 0) > 0 ? "text-rose-400" : "text-slate-500"
                                  )}>
                                      <span className={cn("w-1 h-1 rounded-full", (targetTrip.participantCount || 0) > 0 ? "bg-rose-400 animate-pulse" : "bg-slate-500")} />
                                      {(targetTrip.participantCount || 0) > 0 ? `${targetTrip.participantCount}명의 일행과 공유됨` : '개인 여행'}
                                  </span>
                              </div>
                          </div>
                          <div className="h-8 w-px bg-white/10 mx-2" />
                          <div className="flex gap-8">
                              <div className="flex flex-col">
                                  <span className="text-[8px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">항공편</span>
                                  <span className="text-xl font-black leading-none tabular-nums not-italic">{targetTrip.flightCount || 0}</span>
                              </div>
                              <div className="flex flex-col">
                                  <span className="text-[8px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">숙소</span>
                                  <span className="text-xl font-black leading-none tabular-nums not-italic">{targetTrip.accommodationCount || 0}</span>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Today's/Next Highlight Widget */}
                  <div className="w-full 2xl:w-[260px] shrink-0 bg-white/5 backdrop-blur-2xl rounded-2xl border border-white/10 p-3.5 flex flex-col justify-between gap-3 hover:bg-white/10 transition-all duration-500">
                      <div className="flex justify-between items-start">
                          <div>
                              <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-1">현재 상태</p>
                              <h3 className="text-xl font-black">{ongoingTrip ? '오늘 일정' : '다음 일정'}</h3>
                          </div>
                          <div className="text-right">
                              {targetTrip.dates?.startDate && (
                                  <>
                                      <div className="text-2xl font-black leading-tight tabular-nums not-italic">
                                          {ongoingTrip 
                                              ? `${differenceInDays(startOfDay(new Date()), parseISO(targetTrip.dates.startDate)) + 1}일차`
                                              : `D-${differenceInDays(parseISO(targetTrip.dates.startDate), startOfDay(new Date()))}`
                                          }
                                      </div>
                                      <p className="text-[8px] font-bold text-white/40 mt-1 uppercase">
                                          {ongoingTrip ? '여행 진행 중' : '출발까지'}
                                      </p>
                                  </>
                              )}
                          </div>
                      </div>

                      <div className="space-y-4">
                          {nextMilestone ? (
                              <div className="flex items-center gap-4 group/subItem cursor-pointer">
                                  <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary group-hover/subItem:bg-primary group-hover/subItem:text-white transition-all">
                                      <span className="material-symbols-rounded text-lg">{nextMilestone.icon}</span>
                                  </div>
                                  <div>
                                      <p className="text-xs font-black group-hover/subItem:text-primary transition-colors">{nextMilestone.title}</p>
                                      <p className="text-[9px] font-bold text-white/30 uppercase tracking-tighter">{nextMilestone.time} · 예정된 일정</p>
                                  </div>
                              </div>
                          ) : (
                              <button
                                 onClick={() => router.push(`/dashboard/${targetTrip.id}`)}
                                 className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-3 hover:bg-white/10 transition-all group/empty"
                              >
                                 <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary group-hover/empty:scale-110 transition-transform">
                                     <span className="material-symbols-rounded text-lg">add_task</span>
                                 </div>
                                 <div className="text-left">
                                     <p className="text-xs font-black">일정 추가하기</p>
                                     <p className="text-[9px] font-bold text-white/30 uppercase tracking-tighter">아직 등록된 일정이 없어요</p>
                                 </div>
                              </button>
                          )}
                      </div>

                      <button
                          onClick={() => router.push(`/dashboard/${targetTrip.id}`)}
                          className="w-full py-3.5 bg-primary text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-xs border border-white/10"
                      >
                          {ongoingTrip ? `${targetTrip.title} 대시보드로 이동` : `${targetTrip.title} 일정 완성하기`}
                          <span className="material-symbols-rounded text-sm">arrow_forward</span>
                      </button>

                      {/* Scroll Hint */}
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.6, 0], y: [0, 4, 0] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        className="absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 pointer-events-none"
                      >
                         <span className="text-[7px] font-black uppercase tracking-[0.2em] text-white/40 mb-0.5">스크롤하여 더 보기</span>
                         <span className="material-symbols-rounded text-[14px] text-primary/60">keyboard_arrow_down</span>
                      </motion.div>
                  </div>
              </div>
          </>
      ) : (
          <div className="relative z-10 text-center py-20 flex flex-col items-center flex-1 justify-center">
              <motion.div 
                  animate={{ y: [0, -10, 0] }} 
                  transition={{ repeat: Infinity, duration: 3 }}
                  className="w-24 h-24 bg-primary/20 rounded-[32px] flex items-center justify-center mb-8 backdrop-blur-md"
              >
                  <span className="material-symbols-rounded text-5xl text-primary font-black">explore</span>
              </motion.div>
              <h2 className="text-4xl font-black mb-4">어디로 떠나고 싶으신가요?</h2>
              <p className="text-white/50 text-xl font-bold mb-10 italic max-w-sm">첫 번째 여행 노트를 직접 만들어보세요.</p>
              <button
                onClick={() => {
                   const useWizardStore = require('@pplaner/shared').useWizardStore;
                   useWizardStore.getState().open();
                }}
                className="px-10 py-5 bg-primary text-white font-black rounded-2xl shadow-2xl shadow-primary/30 hover:scale-105 transition-all"
              >
                  첫 번째 여행 계획하기
              </button>
          </div>
      )}
    </motion.section>
  );
}
