'use client';

import { useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, Travelog, hasMinimumContent } from '@pplaner/shared';
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
          // 신규: 로컬 상태로만 시작한다. 빈 여행기를 서버에 만들지 않기 위해
          // 최소 내용이 채워져 저장될 때 비로소 문서가 생성된다.
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

    // 빈 여행기는 저장하지 않는다 (제목 + 최소 내용 필요)
    if (!hasMinimumContent(travelog)) {
      if (!silent) toast.error('제목과 최소한의 내용을 입력해야 저장돼요.');
      return;
    }

    setIsSaving(true);
    try {
      const docRef = doc(db, 'travelogs', id);
      // setDoc+merge: 첫 저장이면 생성, 이후면 갱신 (빈 문서를 미리 만들지 않으므로)
      await setDoc(docRef, {
        ...travelog,
        updatedAt: new Date().toISOString()
      }, { merge: true });
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
