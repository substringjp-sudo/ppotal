'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { subscribeToUserTrips, getTrip, isGoogleMapsReady } from '@pplaner/shared';
import { TripSummary, TripDocument } from '@pplaner/shared';
import { GOOGLE_MAPS_ID } from '@pplaner/shared';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@pplaner/shared';
import { Wrapper } from '@googlemaps/react-wrapper';
import { useWishlistStore, useUserStore } from '@pplaner/shared';

import AchievementGrid from '@/components/profile/AchievementGrid';
import StatsHero from '@/components/stats/StatsHero';


// --- Types for Advanced Profile ---
interface UnifiedEvent {
    id: string;
    tripId: string;
    tripTitle: string;
    type: 'flight' | 'accommodation' | 'transport' | 'event' | 'airport';
    title: string;
    startTime: string; // ISO or HH:mm
    date: string; // YYYY-MM-DD
    location?: {
        name: string;
        lat?: number;
        lng?: number;
        countryId?: string;
        prefectureId?: string;
        cityId?: string;
        regionId?: string; 
    };
    originalData: any;
}

export default function ProfilePageClient() {
    const { user } = useAuth();
    const [trips, setTrips] = useState<TripSummary[]>([]);
    const [fullTrips, setFullTrips] = useState<TripDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const profile = useUserStore(state => state.profile);


    const wishlistItems = useWishlistStore(state => state.items);
    const [selectedFilters, setSelectedFilters] = useState<{ country?: string; region?: string; city?: string }>({});
    const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'map' | 'achievements'>('achievements');
    const [selectedEvent, setSelectedEvent] = useState<UnifiedEvent | null>(null);


    // 1. Fetch Trip Summaries
    useEffect(() => {
        if (!user) return;
        // No longer need to load regionData on client


        const unsubscribe = subscribeToUserTrips(user.uid, (data) => {
            setTrips(data);
        });
        return () => unsubscribe();
    }, [user]);

    // 2. Fetch Full Trip Details
    useEffect(() => {
        const fetchAllDetails = async () => {
            if (trips.length === 0) {
                setLoading(false);
                return;
            }
            try {
                const results = await Promise.all(trips.map(t => getTrip(t.id)));
                setFullTrips(results.filter((t): t is TripDocument => t !== null));
            } catch (error) {
                console.error("Error fetching full trip details:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAllDetails();
    }, [trips]);

    // 3. Process Data for XP and Events
    const { upcomingEvents, pastEvents, travelStats, countries, regions } = useMemo(() => {
        const now = new Date();
        const allUnified: UnifiedEvent[] = [];
        const countryMap = new Map<string, string>();
        const regionMap = new Map<string, string>();

        const stats = profile?.metadata?.travelStats;


        fullTrips.forEach(trip => {
            trip.flights?.forEach(f => {
                allUnified.push({
                    id: f.id, tripId: trip.id, tripTitle: trip.title, type: 'flight', title: `${f.airline || ''} ${f.flightNumber || 'Flight'}`,
                    startTime: f.departureTime || '', date: f.date || '',
                    location: { name: f.departureLocation || '', lat: f.departureLat, lng: f.departureLng, countryId: f.departureCountryId },
                    originalData: f
                });
            });

            trip.accommodation?.forEach(acc => {
                allUnified.push({
                    id: acc.id, tripId: trip.id, tripTitle: trip.title, type: 'accommodation', title: acc.name,
                    startTime: acc.expectedCheckInTime || '', date: acc.startDate,
                    location: { name: acc.location, lat: acc.lat, lng: acc.lng, countryId: acc.countryId, regionId: acc.prefectureId, cityId: acc.cityId },
                    originalData: acc
                });
            });

            trip.dailyTimeline?.forEach(day => {
                day.events?.forEach(e => {
                    allUnified.push({
                        id: e.id, tripId: trip.id, tripTitle: trip.title, type: 'event', title: e.title,
                        startTime: e.startTime || '', date: day.date,
                        location: e.location ? { name: e.location.name, lat: e.location.lat, lng: e.location.lng, countryId: e.location.countryId, prefectureId: e.location.prefectureId, cityId: e.location.cityId } as any : undefined,
                        originalData: e
                    });
                });
            });
        });

        // Map names from summaries
        trips.forEach(t => {
            if (t.locations?.regions) {
                t.locations.regions.forEach(r => {
                    if (r.type === 'country') countryMap.set(r.id, r.name);
                    if (r.type === 'prefecture') regionMap.set(r.id, r.name);
                });
            }
        });

        const sorted = allUnified.sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.startTime || '00:00'}`);
            const dateB = new Date(`${b.date}T${b.startTime || '00:00'}`);
            return dateA.getTime() - dateB.getTime();
        });

        return {
            upcomingEvents: sorted.filter(e => new Date(`${e.date}T23:59:59`) >= now),
            pastEvents: sorted.filter(e => new Date(`${e.date}T23:59:59`) < now),
            travelStats: stats!,
            countries: Array.from(countryMap.entries()).map(([id, name]) => ({ id, name })),
            regions: Array.from(regionMap.entries()).map(([id, name]) => ({ id, name }))
        };
    }, [fullTrips, trips, profile, wishlistItems]);


    const filteredMarkers = useMemo(() => {
        return [...upcomingEvents, ...pastEvents].filter(e => {
            if (selectedFilters.country && e.location?.countryId !== selectedFilters.country) return false;
            if (selectedFilters.region && e.location?.regionId !== selectedFilters.region) return false;
            if (!e.location?.lat || !e.location?.lng) return false;
            return true;
        });
    }, [upcomingEvents, pastEvents, selectedFilters]);

    if (loading || !profile?.metadata?.travelStats) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-black italic tracking-widest animate-pulse">ANALYZING YOUR JOURNEY...</div>;


    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-primary/30">
            <main className="max-w-7xl mx-auto px-6 py-12 space-y-20">
                {/* 1. Hero Experience Section */}
                <StatsHero 
                    stats={travelStats} 
                    userName={user?.displayName || 'Traveler'} 
                />

                {/* 2. Navigation Tabs */}
                <div className="flex items-center justify-center">
                    <div className="bg-white/5 backdrop-blur-3xl p-1.5 rounded-[28px] border border-white/10 flex gap-1 shadow-2xl">
                        {[
                            { id: 'achievements', label: '업적', icon: 'military_tech' },
                            { id: 'map', label: '여행 지도', icon: 'map' },
                            { id: 'upcoming', label: '다가오는 여정', icon: 'calendar_today' },
                            { id: 'past', label: '지난 추억', icon: 'history' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={cn(
                                    "px-6 py-3 rounded-[22px] text-xs font-black transition-all flex items-center gap-2",
                                    activeTab === tab.id 
                                        ? "bg-primary text-white shadow-xl shadow-primary/20 scale-105" 
                                        : "text-white/40 hover:text-white hover:bg-white/5"
                                )}
                            >
                                <span className="material-symbols-rounded text-sm">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 3. Content Sections */}
                <div className="min-h-[600px] relative">
                    <AnimatePresence mode="wait">
                        {activeTab === 'achievements' && (
                            <motion.section 
                                key="achievements"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.5, ease: "circOut" }}
                                className="space-y-12"
                            >
                                <div className="text-center max-w-2xl mx-auto space-y-4">
                                    <h2 className="text-4xl font-black tracking-tighter">Traveler&apos;s Records</h2>
                                    <p className="text-white/40 font-bold leading-relaxed italic">
                                        당신이 걸어온 모든 발자취가 특별한 기록이 됩니다. <br/>새로운 업적을 잠금 해제하고 세계를 정복하세요!
                                    </p>
                                </div>
                                <AchievementGrid badges={travelStats.badges} />
                            </motion.section>
                        )}

                        {activeTab === 'map' && (
                            <motion.section 
                                key="map"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.02 }}
                                className="h-[700px] bg-white/5 rounded-[48px] border border-white/10 relative overflow-hidden shadow-2xl"
                            >
                                <div className="absolute inset-0">
                                    <Wrapper apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''} version="beta" libraries={['marker']}>
                                        <AdvancedMap 
                                            markers={filteredMarkers} 
                                            onMarkerClick={setSelectedEvent}
                                        />
                                    </Wrapper>
                                </div>

                                <div className="absolute top-8 left-8 flex gap-3 z-10">
                                    <select 
                                        onChange={(e) => setSelectedFilters({ ...selectedFilters, country: e.target.value || undefined })}
                                        className="bg-slate-900/90 backdrop-blur-3xl border border-white/10 rounded-2xl px-5 py-3 text-xs font-black outline-none ring-primary/50 focus:ring-2 hover:bg-slate-800 transition-all appearance-none pr-10"
                                    >
                                        <option value="">All Countries</option>
                                        {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <select 
                                        onChange={(e) => setSelectedFilters({ ...selectedFilters, region: e.target.value || undefined })}
                                        className="bg-slate-900/90 backdrop-blur-3xl border border-white/10 rounded-2xl px-5 py-3 text-xs font-black outline-none ring-primary/50 focus:ring-2 hover:bg-slate-800 transition-all appearance-none pr-10"
                                    >
                                        <option value="">All Regions</option>
                                        {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>

                                <AnimatePresence>
                                    {selectedEvent && (
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                            className="absolute bottom-10 left-10 w-[360px] z-10"
                                        >
                                            <EventCard event={selectedEvent} onDismiss={() => setSelectedEvent(null)} />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.section>
                        )}

                        {(activeTab === 'upcoming' || activeTab === 'past') && (
                            <motion.section 
                                key={activeTab}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                            >
                                {(activeTab === 'upcoming' ? upcomingEvents : pastEvents).map((event) => (
                                    <EventCard key={event.id} event={event} />
                                ))}
                                {(activeTab === 'upcoming' ? upcomingEvents : pastEvents).length === 0 && (
                                    <div className="col-span-full py-40 text-center space-y-4">
                                        <span className="material-symbols-rounded text-6xl text-white/10 block">event_busy</span>
                                        <p className="text-white/40 font-bold italic">기록된 일정이 없습니다.</p>
                                    </div>
                                )}
                            </motion.section>
                        )}
                    </AnimatePresence>
                </div>
            </main>


        </div>
    );
}

function EventCard({ event, onDismiss }: { event: UnifiedEvent; onDismiss?: () => void }) {
    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -5 }}
            className="bg-slate-900/60 backdrop-blur-3xl rounded-[36px] border border-white/10 p-7 shadow-2xl relative group overflow-hidden"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            {onDismiss && (
                <button onClick={onDismiss} className="absolute top-6 right-6 text-white/20 hover:text-white transition-colors z-10">
                    <span className="material-symbols-rounded text-sm">close</span>
                </button>
            )}
            <div className="flex items-start justify-between mb-6 relative z-10">
                <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-xl",
                    event.type === 'flight' ? "bg-blue-500/20 text-blue-400" :
                    event.type === 'accommodation' ? "bg-emerald-500/20 text-emerald-400" :
                    "bg-primary/20 text-primary"
                )}>
                    <span className="material-symbols-rounded">
                        {event.type === 'flight' ? 'flight' : event.type === 'accommodation' ? 'bed' : 'explore'}
                    </span>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">{event.date}</p>
                    <p className="text-sm font-black">{event.startTime || 'All Day'}</p>
                </div>
            </div>
            <div className="relative z-10">
                <h3 className="font-black text-xl mb-2 group-hover:text-primary transition-colors line-clamp-1 tracking-tight">{event.title}</h3>
                <p className="text-xs font-bold text-white/40 flex items-center gap-1.5 mb-6">
                    <span className="material-symbols-rounded text-sm">location_on</span>
                    {event.location?.name || 'Location TBD'}
                </p>
                <div className="pt-5 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-black px-3 py-1.5 bg-white/5 rounded-xl border border-white/10 text-white/40 uppercase tracking-wider">{event.tripTitle}</span>
                    <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/20 hover:bg-primary hover:text-white transition-all">
                        <span className="material-symbols-rounded text-sm">arrow_forward</span>
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

function AdvancedMap({ markers, onMarkerClick }: { markers: UnifiedEvent[], onMarkerClick: (e: UnifiedEvent) => void }) {
    const mapRef = useRef<HTMLDivElement>(null);
    const googleMap = useRef<google.maps.Map | null>(null);

    useEffect(() => {
        if (!mapRef.current || !isGoogleMapsReady()) return;
        
        const map = new google.maps.Map(mapRef.current, {
            center: { lat: 35.6762, lng: 139.6503 },
            zoom: 4,
            styles: mapStyles,
            disableDefaultUI: true,
            zoomControl: true,
            mapId: GOOGLE_MAPS_ID
        });
        
        googleMap.current = map;
        return () => {};
    }, []);

    useEffect(() => {
        if (!googleMap.current || !isGoogleMapsReady(['marker'])) return;
        const map = googleMap.current;
        const bounds = new google.maps.LatLngBounds();
        const activeMarkers: any[] = [];

        markers.forEach(m => {
            if (m.location?.lat && m.location?.lng) {
                const pos = { lat: m.location.lat, lng: m.location.lng };
                const pinElement = document.createElement('div');
                pinElement.innerHTML = `
                    <div class="w-10 h-10 rounded-full border-4 border-white shadow-2xl flex items-center justify-center text-white transition-transform hover:scale-125 cursor-pointer" 
                         style="background: ${m.type === 'flight' ? '#3b82f6' : m.type === 'accommodation' ? '#10b981' : '#f43f5e'}">
                        <span class="material-symbols-rounded" style="font-size: 20px;">
                            ${m.type === 'flight' ? 'flight' : m.type === 'accommodation' ? 'bed' : 'explore'}
                        </span>
                    </div>
                `;

                const marker = new google.maps.marker.AdvancedMarkerElement({
                    map: googleMap.current,
                    position: pos,
                    title: m.title,
                    content: pinElement
                });
                
                marker.addListener('click', () => onMarkerClick(m));
                activeMarkers.push(marker);
                bounds.extend(pos);
            }
        });

        if (markers.length > 0) {
            googleMap.current.fitBounds(bounds, 100);
        }

        return () => {
            activeMarkers.forEach(mrk => mrk.map = null);
        };
    }, [markers, onMarkerClick]);

    return <div ref={mapRef} className="w-full h-full" />;
}

const mapStyles = [
    { "elementType": "geometry", "stylers": [{ "color": "#020617" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#475569" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#020617" }] },
    { "featureType": "administrative", "elementType": "geometry.stroke", "stylers": [{ "color": "#334155" }, { "weight": 1 }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0f172a" }] },
    { "featureType": "landscape", "elementType": "geometry", "stylers": [{ "color": "#020617" }] },
    { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
    { "featureType": "transit", "stylers": [{ "visibility": "off" }] }
];
