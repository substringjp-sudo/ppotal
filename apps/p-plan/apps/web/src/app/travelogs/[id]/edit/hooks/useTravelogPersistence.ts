'use client';

import { useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, Travelog } from '@pplaner/shared';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface UseTravelogPersistenceProps {
  id: string;
  travelog: Travelog | null;
  setTravelog: (travelog: Travelog | null) => void;
  setIsLoading: (loading: boolean) => void;
  setIsSaving: (saving: boolean) => void;
}

export function useTravelogPersistence({
  id,
  travelog,
  setTravelog,
  setIsLoading,
  setIsSaving,
}: UseTravelogPersistenceProps) {
  const { user, loading: authLoading } = useAuth();
  const autoSaveTimerRef = useRef<any>(null);

  // 초기 데이터 로드
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    const loadData = async () => {
      try {
        const docRef = doc(db, 'travelogs', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setTravelog(docSnap.data() as Travelog);
        } else {
          // 신규 생성 로직 (필요시)
          const newTravelog: Travelog = {
            id,
            userId: user.uid,
            title: '',
            summary: '',
            theme: '감성',
            memberCounts: { me: 1, partner: 0, family: 0, friends: 0 },
            sourceContext: 'scratch',
            isPublic: false,
            status: 'draft',
            timeline: [{ day: 1, date: new Date().toISOString().split('T')[0], events: [] }],
            sections: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await setDoc(docRef, newTravelog);
          setTravelog(newTravelog);
        }
      } catch (error) {
        console.error('Data load error:', error);
        toast.error('데이터를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id, user, authLoading, setTravelog, setIsLoading]);

  // 저장 함수
  const handleSave = useCallback(async (silent = false) => {
    if (!travelog || !user) return;

    setIsSaving(true);
    try {
      const docRef = doc(db, 'travelogs', id);
      await updateDoc(docRef, {
        ...travelog,
        updatedAt: new Date().toISOString()
      });
      if (!silent) toast.success('저장되었습니다.');
    } catch (error) {
      console.error('Save error:', error);
      if (!silent) toast.error('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  }, [id, travelog, user, setIsSaving]);

  // 자동 저장 (디바운스)
  useEffect(() => {
    if (!travelog || !user) return;

    if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
    
    autoSaveTimerRef.current = window.setTimeout(() => {
      handleSave(true);
    }, 5000); // 5초 후 자동 저장

    return () => {
      if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
    };
  }, [travelog, user, handleSave]);

  return { handleSave };
}
