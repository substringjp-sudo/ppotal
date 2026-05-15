'use client';
import React, { useState, useEffect } from 'react';
import { useTripStore } from '@pplaner/shared';
import { useUserStore } from '@pplaner/shared';
import { getFriendList } from '@pplaner/shared';
import { getUserProfile } from '@pplaner/shared';
import { getOrCreateInviteToken } from '@pplaner/shared';
import { UserProfile } from '@pplaner/shared';
import { Participant } from '@pplaner/shared';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@pplaner/shared';

// ─── 구성원 타입 정의 ───────────────────────────────────────────

type MemberGroupType = 'me' | 'partner' | 'family' | 'friends';

interface MemberGroup {
    id: MemberGroupType;
    label: string;
    icon: string;
    description: string;
    color: string;
    maxDisplay: number; 
    maxCount: number;   
    steps: number[];
}

const MEMBER_GROUPS: MemberGroup[] = [
    {
        id: 'me',
        label: '나',
        icon: 'person',
        description: '여행자 본인',
        color: 'primary',
        maxDisplay: 1,
        maxCount: 1,
        steps: [0, 1],
    },
    {
        id: 'partner',
        label: '파트너',
        icon: 'favorite',
        description: '연인, 배우자',
        color: 'rose',
        maxDisplay: 2,
        maxCount: 2,
        steps: [0, 1, 2],
    },
    {
        id: 'family',
        label: '가족',
        icon: 'family_restroom',
        description: '부모님, 자녀 등',
        color: 'amber',
        maxDisplay: 3,
        maxCount: 10,
        steps: [0, 1, 2, 3],
    },
    {
        id: 'friends',
        label: '친구',
        icon: 'group',
        description: '친구들',
        color: 'sky',
        maxDisplay: 4,
        maxCount: 20,
        steps: [0, 1, 2, 3, 4],
    },
];

const COLOR_CLASSES: Record<string, { bg: string; text: string; border: string; indicator: string; light: string }> = {
    primary: {
        bg: 'bg-primary',
        text: 'text-primary',
        border: 'border-primary/30',
        indicator: 'bg-primary',
        light: 'bg-primary/10',
    },
    rose: {
        bg: 'bg-rose-500',
        text: 'text-rose-500',
        border: 'border-rose-500/30',
        indicator: 'bg-rose-500',
        light: 'bg-rose-500/10',
    },
    amber: {
        bg: 'bg-amber-500',
        text: 'text-amber-500',
        border: 'border-amber-500/30',
        indicator: 'bg-amber-500',
        light: 'bg-amber-500/10',
    },
    sky: {
        bg: 'bg-sky-500',
        text: 'text-sky-500',
        border: 'border-sky-500/30',
        indicator: 'bg-sky-500',
        light: 'bg-sky-500/10',
    },
};

function formatCount(count: number, group: MemberGroup): string {
    if (count === 0) return '0';
    if (count > group.maxDisplay) return `${group.maxDisplay}+`;
    return `${count}`;
}

// ─── 구성원 카운터 컴포넌트 ──────────────────────────────────────

interface MemberCounterProps {
    group: MemberGroup;
    count: number;
    onChange: (value: number) => void;
}

function MemberCounter({ group, count, onChange }: MemberCounterProps) {
    const colors = COLOR_CLASSES[group.color];
    const displayCount = formatCount(count, group);

    const increment = () => {
        if (count < group.maxCount) {
            const nextStep = group.steps.find(s => s > count);
            if (nextStep !== undefined) {
                onChange(nextStep);
            } else {
                onChange(Math.min(count + 1, group.maxCount));
            }
        }
    };

    const decrement = () => {
        if (count > 0) {
            const prevStep = [...group.steps].reverse().find(s => s < count);
            if (prevStep !== undefined) {
                onChange(prevStep);
            } else {
                onChange(Math.max(count - 1, 0));
            }
        }
    };

    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            className={cn(
                "relative flex flex-col items-center p-5 rounded-[28px] border-2 transition-all duration-300 group cursor-default overflow-hidden",
                count > 0
                    ? `border-2 ${colors.border} bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/50 shadow-lg`
                    : "border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30"
            )}
        >
            {count > 0 && (
                <div className={`absolute inset-0 opacity-5 ${colors.bg} pointer-events-none`} />
            )}

            <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-all shadow-sm",
                count > 0 ? `${colors.light} ${colors.text}` : "bg-slate-100 dark:bg-slate-800 text-slate-400"
            )}>
                <span className="material-symbols-rounded text-2xl">{group.icon}</span>
            </div>

            <div className="text-center mb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{group.label}</p>
                <AnimatePresence mode="wait">
                    <motion.p
                        key={displayCount}
                        initial={{ opacity: 0, y: -8, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.8 }}
                        transition={{ duration: 0.15 }}
                        className={cn(
                            "text-4xl font-black italic tracking-tighter leading-none",
                            count > 0 ? colors.text : "text-slate-200 dark:text-slate-700"
                        )}
                    >
                        {displayCount}
                    </motion.p>
                </AnimatePresence>
                <p className="text-[9px] font-bold text-slate-400 mt-1">{group.description}</p>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={decrement}
                    disabled={count <= 0}
                    className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black transition-all active:scale-90",
                        count > 0
                            ? `${colors.light} ${colors.text} hover:${colors.bg} hover:text-white`
                            : "bg-slate-100 dark:bg-slate-800 text-slate-300 cursor-not-allowed"
                    )}
                >
                    <span className="material-symbols-rounded text-sm">remove</span>
                </button>
                <button
                    onClick={increment}
                    disabled={count >= group.maxCount}
                    className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black transition-all active:scale-90",
                        count < group.maxCount
                            ? `${colors.bg} text-white shadow-lg hover:opacity-90`
                            : "bg-slate-100 dark:bg-slate-800 text-slate-300 cursor-not-allowed"
                    )}
                >
                    <span className="material-symbols-rounded text-sm">add</span>
                </button>
            </div>
        </motion.div>
    );
}

// ─── 참여자 아바타 컴포넌트 ─────────────────────────────────

function ParticipantAvatar({ participant }: { participant: Participant }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all group"
        >
            <div className="relative">
                <div
                    className={cn(
                        "w-10 h-10 rounded-full bg-slate-200 bg-cover bg-center border-2 border-white dark:border-slate-700 shadow-sm"
                    )}
                    style={{ backgroundImage: participant.avatarUrl ? `url('${participant.avatarUrl}')` : undefined }}
                >
                    {!participant.avatarUrl && (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-black">
                            {participant.name.charAt(0)}
                        </div>
                    )}
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{participant.name}</p>
                <p className="text-[10px] text-slate-400 font-medium capitalize">작성자</p>
            </div>
        </motion.div>
    );
}

// ─── 메인 컴포넌트 ───────────────────────────────────────────────

export default function MembersEditor() {
    const currentTrip = useTripStore((state) => state.currentTrip);
    const profile = useUserStore((state) => state.profile);
    const updateTrip = useTripStore((state) => state.updateTrip);

    const [friends, setFriends] = useState<UserProfile[]>([]);
    const [isLoadingFriends, setIsLoadingFriends] = useState(false);
    const [inviteLink, setInviteLink] = useState('');
    const [isGeneratingLink, setIsGeneratingLink] = useState(false);
    const [copiedSuccess, setCopiedSuccess] = useState(false);
    const [activeTab, setActiveTab] = useState<'members' | 'invite'>('members');

    const getMemberCount = (role: MemberGroupType): number => {
        if (!currentTrip) return role === 'me' ? 1 : 0;
        const meta = currentTrip.memberCounts;
        if (meta) return meta[role] ?? (role === 'me' ? 1 : 0);
        return role === 'me' ? 1 : 0;
    };

    const [memberCounts, setMemberCounts] = useState({
        me: getMemberCount('me'),
        partner: getMemberCount('partner'),
        family: getMemberCount('family'),
        friends: getMemberCount('friends'),
    });

    const handleCountChange = async (role: MemberGroupType, value: number) => {
        const newCounts = { ...memberCounts, [role]: value };
        setMemberCounts(newCounts);
        updateTrip({ memberCounts: newCounts });
    };

    const totalTravelers = memberCounts.me + memberCounts.partner + memberCounts.family + memberCounts.friends;

    useEffect(() => {
        const fetchFriends = async () => {
            if (!profile?.userId) return;
            setIsLoadingFriends(true);
            try {
                const friendshipList = await getFriendList(profile.userId);
                const friendProfiles = await Promise.all(
                    friendshipList.map(async (f) => {
                        const friendId = f.uids.find(id => id !== profile.userId)!;
                        return await getUserProfile(friendId);
                    })
                );
                setFriends(friendProfiles.filter(p => p !== null) as UserProfile[]);
            } catch (error) {
                console.error('Error fetching friends:', error);
            } finally {
                setIsLoadingFriends(false);
            }
        };

        fetchFriends();
    }, [profile?.userId]);

    const handleCopyInviteLink = async () => {
        if (!currentTrip?.id) return;
        setIsGeneratingLink(true);
        try {
            const token = await getOrCreateInviteToken(currentTrip.id);
            const link = `${window.location.origin}/invite/${token}`;
            setInviteLink(link);
            await navigator.clipboard.writeText(link);
            setCopiedSuccess(true);
            setTimeout(() => setCopiedSuccess(false), 2500);
        } catch (error) {
            console.error('Link generation error:', error);
        } finally {
            setIsGeneratingLink(false);
        }
    };

    if (!currentTrip) return null;

    const tabs = [
        { id: 'members', label: '구성원 설정', icon: 'group' },
        { id: 'invite', label: '공유 및 링크', icon: 'share' },
    ] as const;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-1">
                <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-rounded text-primary">groups</span>
                    여행 멤버 및 공유
                </h2>
                <p className="text-sm text-slate-500">여행 구성원을 설정하고, 링크를 통해 여행 계획을 공유해보세요.</p>
            </div>

            <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-[24px] border border-slate-200 dark:border-slate-800">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-rounded">luggage</span>
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">총 여행 인원</p>
                    <p className="text-2xl font-black italic text-slate-900 dark:text-white leading-tight">
                        {totalTravelers}명
                        <span className="text-sm font-bold text-slate-400 ml-1 not-italic">함께 여행</span>
                    </p>
                </div>
            </div>

            <div className="flex bg-slate-100 dark:bg-slate-900 rounded-2xl p-1 gap-1">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as 'members' | 'invite')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            activeTab === tab.id
                                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                                : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        <span className="material-symbols-rounded text-sm">{tab.icon}</span>
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'members' && (
                    <motion.div
                        key="members"
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 16 }}
                        className="space-y-6"
                    >
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {MEMBER_GROUPS.map(group => (
                                <MemberCounter
                                    key={group.id}
                                    group={group}
                                    count={memberCounts[group.id]}
                                    onChange={(val) => handleCountChange(group.id, val)}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'invite' && (
                    <motion.div
                        key="invite"
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 16 }}
                        className="space-y-6"
                    >
                        <section className="bg-gradient-to-br from-primary/5 via-primary/10 to-transparent dark:from-primary/10 dark:via-primary/20 dark:to-transparent rounded-[28px] p-6 border border-primary/20">
                            <div className="flex items-start gap-4 mb-5">
                                <div className="w-12 h-12 rounded-[18px] bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                    <span className="material-symbols-rounded text-2xl">share</span>
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-primary">공유 링크 생성</h3>
                                    <p className="text-[11px] text-primary/60 font-medium mt-0.5 leading-relaxed">
                                        링크를 생성하여 친구들에게 여행 정보를 공유하세요.<br />
                                        상대방은 로그인 없이도 고해상도 지도로 일정을 확인할 수 있습니다.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={handleCopyInviteLink}
                                disabled={isGeneratingLink}
                                className={cn(
                                    "w-full py-3.5 text-white text-[11px] font-black rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2",
                                    copiedSuccess
                                        ? "bg-emerald-500 shadow-emerald-500/20"
                                        : "bg-primary shadow-primary/20 hover:scale-[1.02] active:scale-95"
                                )}
                            >
                                {isGeneratingLink ? (
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : copiedSuccess ? (
                                    <>
                                        <span className="material-symbols-rounded text-sm">check_circle</span>
                                        링크 복사 완료!
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-rounded text-sm">content_copy</span>
                                        공유 링크 생성 및 복사
                                    </>
                                )}
                            </button>
                        </section>

                        {friends.length > 0 && (
                            <section className="space-y-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PPlan 친구에게 공유하기</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {friends.map((friend) => (
                                        <div
                                            key={friend.userId}
                                            className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 bg-cover bg-center" style={{ backgroundImage: friend.photoURL ? `url('${friend.photoURL}')` : undefined }} />
                                                <span className="text-xs font-bold truncate">{friend.displayName}</span>
                                            </div>
                                            <button 
                                                onClick={handleCopyInviteLink}
                                                className="text-[10px] font-black text-primary px-3 py-1 bg-primary/10 rounded-lg"
                                            >
                                                링크 전달
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
