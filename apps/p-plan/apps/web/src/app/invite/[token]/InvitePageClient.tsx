'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getTripByInviteToken, joinTripByToken } from '@pplaner/shared';
import { TripDocument } from '@pplaner/shared';
import { motion } from 'framer-motion';

export default function InvitePageClient() {
    const params = useParams();
    
    // Optional Catch-all ([[...token]]) 형식이므로 배열일 가능성을 처리합니다.
    const tokenParam = params.token;
    let token = Array.isArray(tokenParam) ? tokenParam[0] : (tokenParam as string);

    // Firebase Hosting의 Static Export 리라이트([token]=placeholder) 대응
    if (token === 'placeholder' && typeof window !== 'undefined') {
        const pathSegments = window.location.pathname.split('/').filter(Boolean);
        // /invite/TOKEN 형식인 경우 두 번째 세그먼트가 TOKEN입니다.
        if (pathSegments[0] === 'invite' && pathSegments[1]) {
            token = pathSegments[1];
        }
    }

    const { user, loginWithGoogle, loading: authLoading } = useAuth();
    const router = useRouter();

    // token 없으면 홈으로 리다이렉트
    useEffect(() => {
        if (!token) {
            router.replace('/');
        }
    }, [token, router]);

    if (!token) return null;

    const [trip, setTrip] = useState<TripDocument | null>(null);
    const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'joining'>('loading');

    useEffect(() => {
        const checkToken = async () => {
            const data = await getTripByInviteToken(token);
            if (data) {
                setTrip(data);
                setStatus('valid');
            } else {
                setStatus('invalid');
            }
        };
        if (token) checkToken();
    }, [token]);

    const handleJoin = async () => {
        if (!user) {
            loginWithGoogle();
            return;
        }

        setStatus('joining');
        const tripId = await joinTripByToken(token, user.uid);
        if (tripId) {
            router.push(`/dashboard/${tripId}`);
        } else {
            alert("여행 참여에 실패했습니다. 다시 시도해주세요.");
            setStatus('valid');
        }
    };

    if (status === 'loading' || authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    if (status === 'invalid') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
                <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 rounded-3xl flex items-center justify-center text-rose-500 mb-6 font-black">
                    <span className="material-symbols-rounded text-4xl">link_off</span>
                </div>
                <h1 className="text-2xl font-black mb-2">유효하지 않은 초대 링크입니다.</h1>
                <p className="text-slate-500 mb-8 font-medium">링크가 만료되었거나 올바르지 않습니다.</p>
                <button onClick={() => router.push('/')} className="px-8 py-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black rounded-2xl">
                    홈으로 가기
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white dark:bg-slate-900 p-10 rounded-[48px] shadow-2xl text-center border border-slate-200 dark:border-slate-800"
            >
                <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mx-auto mb-8">
                    <span className="material-symbols-rounded text-4xl font-black">rocket_launch</span>
                </div>

                <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-4 italic">Invitation</h1>
                <p className="text-slate-500 font-bold mb-8">
                    <span className="text-slate-900 dark:text-white font-black block text-xl mb-1">"{trip?.title}"</span>
                    여행에 초대받으셨습니다! 함께 계획을 짜볼까요?
                </p>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl mb-8 flex items-center justify-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden ring-2 ring-white dark:ring-slate-800">
                        <img src={`https://i.pravatar.cc/100?u=${trip?.userId}`} alt="Owner" />
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Host</p>
                        <p className="text-sm font-black text-slate-900 dark:text-white">여행 마스터</p>
                    </div>
                </div>

                <button
                    onClick={handleJoin}
                    disabled={status === 'joining'}
                    className="w-full py-5 bg-primary text-white font-black rounded-3xl shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                    {status === 'joining' ? (
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            <span className="material-symbols-rounded font-black">person_add</span>
                            여행 참여하기
                        </>
                    )}
                </button>

                {!user && (
                    <p className="mt-6 text-[11px] font-bold text-slate-400">
                        참여를 위해 로그인이 필요합니다.
                    </p>
                )}
            </motion.div>
        </div>
    );
}
