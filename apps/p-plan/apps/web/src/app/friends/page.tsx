'use client';
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/hooks/useAuth';
import { useUserStore } from '@pplaner/shared';
import { 
    searchUserByEmail, 
    searchUsersByName,
    getUserProfile
} from '@pplaner/shared';
import { 
    sendFriendRequest, 
    getFriendList, 
    getReceivedRequests, 
    acceptFriendRequest, 
    deleteFriendship 
} from '@pplaner/shared';
import { UserProfile } from '@pplaner/shared';
import { Friendship } from '@pplaner/shared';
import { motion, AnimatePresence } from 'framer-motion';
import FriendProfileModal from '@/components/social/FriendProfileModal';
import { usePageActionStore } from '@pplaner/shared';

export default function FriendsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { pendingFriendRequests, setPendingFriendRequests } = useUserStore();
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!loading && !user) router.replace('/');
    }, [user, loading, router]);

    const { setPageAction, clearPageAction } = usePageActionStore();
    useEffect(() => {
        setPageAction(() => {
            searchInputRef.current?.focus();
            searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 'person_search', '친구 찾기');
        return () => clearPageAction();
    }, [setPageAction, clearPageAction]);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    
    const [friends, setFriends] = useState<(UserProfile & { friendshipId: string })[]>([]);
    const [isLoadingFriends, setIsLoadingFriends] = useState(true);

    const [selectedFriend, setSelectedFriend] = useState<UserProfile | null>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    const openProfile = (p: UserProfile) => {
        setSelectedFriend(p);
        setIsProfileModalOpen(true);
    };

    /*
     * ### 6. 친구 프로필 상세 정보 및 여행 요약
     * - **프로필 요약 모달:** 친구 목록 또는 검색 결과에서 프로필을 클릭하면 상세 모달이 열립니다.
     * - **여행 데이터 통계:** 해당 친구의 총 여행 횟수, 고유 방문 지역 수, 최근 활동(여행 제목 및 날짜)을 요약하여 보여줍니다.
     * - **디자인:** 유리모피즘(Glassmorphism) 스타일과 애니메이션을 적용하여 고급스러운 사용자 경험을 제공합니다.
     */
    const fetchFriendsAndRequests = async () => {
        if (!user?.uid) return;
        setIsLoadingFriends(true);
        try {
            // 수락된 친구 목록
            const friendshipList = await getFriendList(user.uid);
            const friendProfiles = await Promise.all(
                friendshipList.map(async (f) => {
                    const friendId = f.uids.find(id => id !== user.uid)!;
                    const profile = await getUserProfile(friendId);
                    return profile ? { ...profile, friendshipId: f.id } : null;
                })
            );
            setFriends(friendProfiles.filter(p => p !== null) as any);

            // 대기 중인 요청
            const received = await getReceivedRequests(user.uid);
            setPendingFriendRequests(received);
        } catch (error) {
            console.error("Error fetching friends data:", error);
        } finally {
            setIsLoadingFriends(false);
        }
    };

    useEffect(() => {
        fetchFriendsAndRequests();
    }, [user?.uid]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        
        setIsSearching(true);
        try {
            let results: UserProfile[] = [];
            if (searchQuery.includes('@')) {
                const found = await searchUserByEmail(searchQuery);
                if (found) results = [found];
            } else {
                results = await searchUsersByName(searchQuery);
            }
            // 나 자신은 제외
            setSearchResults(results.filter(r => r.userId !== user?.uid));
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSendRequest = async (targetUid: string) => {
        if (!user?.uid) return;
        try {
            await sendFriendRequest(user.uid, targetUid);
            toast.success("친구 요청을 보냈습니다.");
            // 검색 결과에서 상태 업데이트 로직 추가 가능
        } catch (error: any) {
            toast.error(error.message || "요청 보내기 실패");
        }
    };

    const handleAcceptRequest = async (friendshipId: string) => {
        try {
            await acceptFriendRequest(friendshipId);
            toast.success("친구 요청을 수락했습니다.");
            await fetchFriendsAndRequests();
        } catch (error) {
            console.error("Accept error:", error);
            toast.error("요청 수락 중 오류가 발생했습니다.");
        }
    };

    const handleDeleteFriend = async (friendshipId: string) => {
        if (!confirm("정말 삭제하시겠습니까?")) return;
        try {
            await deleteFriendship(friendshipId);
            toast.success("삭제되었습니다.");
            await fetchFriendsAndRequests();
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("삭제 중 오류가 발생했습니다.");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-pretendard">
            
            <main className="max-w-4xl mx-auto px-4 py-12">
                <div className="mb-12 text-center">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">친구 관리</h1>
                    <p className="text-slate-500 dark:text-slate-400">파트너를 찾아 여행을 함께 계획해보세요.</p>
                </div>

                {/* 검색 섹션 */}
                <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 mb-8">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <div className="relative flex-1">
                            <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="이름 또는 이메일로 친구 검색..."
                                className="w-full pl-12 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                        <button 
                            type="submit"
                            disabled={isSearching}
                            className="px-6 py-3 bg-primary text-white font-black rounded-2xl hover:bg-primary/90 transition-all text-sm disabled:opacity-50"
                        >
                            검색
                        </button>
                    </form>

                    {/* 검색 결과 */}
                    <AnimatePresence>
                        {searchResults.length > 0 && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-6 pt-6 border-t border-slate-200/60 dark:border-slate-800 space-y-4"
                            >
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">검색 결과</h3>
                                {searchResults.map((result) => (
                                    <div key={result.userId} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl group cursor-pointer hover:bg-white dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700" onClick={() => openProfile(result)}>
                                        <div className="flex items-center gap-3">
                                            <div 
                                                className="w-10 h-10 rounded-full bg-slate-200 bg-cover bg-center ring-2 ring-transparent group-hover:ring-primary/20 transition-all"
                                                style={{ backgroundImage: `url('${result.photoURL || ''}')` }}
                                            />
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{result.displayName}</p>
                                                <p className="text-[10px] text-slate-500">{result.email}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSendRequest(result.userId);
                                            }}
                                            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-primary rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm"
                                        >
                                            친구 요청
                                        </button>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                    
                    {searchResults.length === 0 && searchQuery && isSearching === false && (
                        <p className="mt-4 text-center text-xs text-slate-400">검색 결과가 없습니다.</p>
                    )}
                </section>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* 친구 요청 섹션 */}
                    <section>
                        <div className="flex items-center gap-2 mb-4 px-2">
                            <span className="material-symbols-rounded text-xl text-primary font-bold">person_add</span>
                            <h2 className="text-lg font-black text-slate-900 dark:text-white">대기 중인 요청</h2>
                            {pendingFriendRequests.length > 0 && (
                                <span className="bg-primary text-white text-[10px] px-2 py-0.5 rounded-full font-black">
                                    {pendingFriendRequests.length}
                                </span>
                            )}
                        </div>
                        
                        <div className="space-y-3">
                            {pendingFriendRequests.length > 0 ? (
                                pendingFriendRequests.map((req) => (
                                    <div key={req.id} className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                                                <span className="material-symbols-rounded text-slate-400">person</span>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400 mb-0.5">보낸 사람: {req.initiatorUid}</p>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">새로운 친구 요청</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleAcceptRequest(req.id)}
                                                className="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all"
                                                title="수락"
                                            >
                                                <span className="material-symbols-rounded text-xl">check</span>
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteFriend(req.id)}
                                                className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                                                title="거절"
                                            >
                                                <span className="material-symbols-rounded text-xl">close</span>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center bg-slate-100/50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                                    <p className="text-xs font-bold text-slate-400">받은 요청이 없습니다.</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* 친구 목록 섹션 */}
                    <section>
                        <div className="flex items-center gap-2 mb-4 px-2">
                            <span className="material-symbols-rounded text-xl text-primary font-bold">group</span>
                            <h2 className="text-lg font-black text-slate-900 dark:text-white">내 친구 목록</h2>
                        </div>
                        
                        <div className="space-y-3">
                            {friends.length > 0 ? (
                                friends.map((friend) => (
                                    <div key={friend.userId} className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between group cursor-pointer hover:shadow-md transition-all" onClick={() => openProfile(friend)}>
                                        <div className="flex items-center gap-3">
                                            <div 
                                                className="w-10 h-10 rounded-full bg-slate-200 bg-cover bg-center ring-2 ring-transparent group-hover:ring-primary/20 transition-all"
                                                style={{ backgroundImage: `url('${friend.photoURL || ''}')` }}
                                            />
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{friend.displayName}</p>
                                                <p className="text-[10px] text-slate-500">{friend.email}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteFriend(friend.friendshipId);
                                            }}
                                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                            title="친구 삭제"
                                        >
                                            <span className="material-symbols-rounded text-xl">person_remove</span>
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center bg-slate-100/50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                                    <p className="text-xs font-bold text-slate-400">친구가 없습니다. 새로운 친구를 찾아보세요!</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </main>

            <FriendProfileModal 
                friend={selectedFriend}
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
            />
        </div>
    );
}
