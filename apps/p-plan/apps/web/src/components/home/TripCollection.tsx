'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { useWizardStore } from '@pplaner/shared';
import { motion } from 'framer-motion';
import Badge from '@/components/common/Badge';
import TripCoverImage from '@/components/trips/TripCoverImage';
import { TripSummary } from '@pplaner/shared';

interface TripCollectionProps {
  trips: TripSummary[];
  itemVariants: any;
}

export default function TripCollection({ trips, itemVariants }: TripCollectionProps) {
  const router = useRouter();
  const openWizard = useWizardStore((state) => state.open);

  return (
    <section className="pt-1">
      <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
              <div className="section-bar" />
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  나의 컬렉션
                  <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-[9px] font-black text-slate-400 tabular-nums">{trips.length}</span>
              </h3>
          </div>
          <Link href="/trips" className="px-3 py-1.5 bg-white dark:bg-slate-900 rounded-full text-[9px] font-black text-slate-500 hover:text-primary border border-slate-200 dark:border-slate-800 transition-all flex items-center gap-1">
              전체 보기
              <span className="material-symbols-rounded text-[10px]">chevron_right</span>
          </Link>
      </div>
      
      {trips.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 gap-3">
              {trips.slice(0, 8).map((trip) => (
                  <motion.div 
                      key={trip.id} 
                      variants={itemVariants} 
                      whileHover={{ y: -8 }}
                      onClick={() => router.push(`/dashboard/${trip.id}`)}
                      className="group bg-white dark:bg-slate-900 rounded-[20px] border border-slate-200 dark:border-slate-800 p-1.5 cursor-pointer shadow-sm hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 h-full flex flex-col"
                  >
                      <div className="aspect-[4/5] rounded-[16px] overflow-hidden mb-2 relative">
                          <TripCoverImage trip={trip} className="h-full scale-100 group-hover:scale-110 transition-transform duration-1000" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                              <div className="flex items-center gap-1.5 text-white/80 text-[8px] font-black uppercase tracking-widest">
                                  <span className="material-symbols-rounded text-xs">flight</span>
                                  {trip.flightCount || 0}편의 항공
                              </div>
                          </div>
                          
                          {/* D-Day Badge */}
                          <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1">
                                  {(() => {
                                      if (!trip.dates?.startDate) return <Badge variant="outline">WISH</Badge>;

                                      const start = parseISO(trip.dates.startDate);
                                      const end = trip.dates.endDate ? parseISO(trip.dates.endDate) : start;
                                      const today = new Date();
                                      today.setHours(0, 0, 0, 0);

                                      const diffTime = start.getTime() - today.getTime();
                                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                      if (today >= start && today <= end) {
                                          return <Badge variant="success" pulse>ONGOING</Badge>;
                                      } else if (diffDays > 0 && diffDays <= 30) {
                                          return <Badge variant="primary">D-{diffDays}</Badge>;
                                      } else {
                                          return <Badge variant="glass">{format(start, 'yyyy')}</Badge>;
                                      }
                                  })()}
                          </div>
                      </div>
                      <div className="px-2 pb-2 flex-1">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white mb-1 line-clamp-1 group-hover:text-primary transition-colors">{trip.title || 'Untitled'}</h4>
                          <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight truncate">
                                  {trip.locations?.regions?.[0]?.name || trip.locations?.regionNames?.[0] || 'TBD'}
                              </span>
                              {trip.dates?.startDate && (
                                  <>
                                      <span className="w-0.5 h-0.5 rounded-full bg-slate-300" />
                                      <span className="text-[9px] font-bold text-slate-400 tabular-nums">
                                          {format(parseISO(trip.dates.startDate), 'MMM dd')}
                                      </span>
                                  </>
                              )}
                          </div>
                      </div>
                  </motion.div>
              ))}
              {trips.length > 8 && (
                 <motion.div 
                     variants={itemVariants}
                     onClick={() => router.push('/trips')}
                     className="group aspect-[4/5] bg-slate-100 dark:bg-slate-900/50 rounded-[28px] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-4 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
                 >
                     <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:rotate-45 transition-all mb-4">
                         <span className="material-symbols-rounded">add</span>
                     </div>
                     <p className="text-[10px] font-black text-slate-400 group-hover:text-primary uppercase tracking-widest">더 보기</p>
                 </motion.div>
              )}
          </div>
      ) : (
          <div className="py-24 text-center bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 rounded-[48px] border-2 border-dashed border-slate-200 dark:border-slate-700 shadow-inner">
              <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-[24px] flex items-center justify-center mx-auto mb-6 shadow-premium ring-1 ring-slate-100 dark:ring-slate-800">
                  <span className="material-symbols-rounded text-4xl text-slate-300 dark:text-slate-600">navigation</span>
              </div>
              <p className="text-slate-900 dark:text-white font-black uppercase tracking-[0.25em] text-xs mb-2">당신의 첫 번째 여정을 기록해보세요</p>
              <p className="text-slate-400 font-medium text-[10px] mb-8">PPLANER와 함께 완벽한 여행을 설계할 준비가 되셨나요?</p>
              <button 
                  onClick={() => openWizard('PLAN')}
                  className="px-8 py-3 bg-primary text-white font-black rounded-xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-[10px] uppercase tracking-widest"
              >
                  첫 번째 여행 만들기
              </button>
          </div>
      )}
    </section>
  );
}
