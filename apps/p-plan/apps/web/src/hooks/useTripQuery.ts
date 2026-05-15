import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTripMain, getTripSubCollection, saveTrip, Trip } from '@pplaner/shared';

/**
 * 여행의 메인 정보(기본 정보, 예산 등)를 가져오는 훅 (Lazy Loading의 시작)
 */
export function useTrip(id: string) {
    return useQuery({
        queryKey: ['trip', id],
        queryFn: () => getTripMain(id),
        enabled: !!id,
        staleTime: 1000 * 60 * 5, // 5분간 fresh 유지
    });
}

/**
 * 특정 하위 컬렉션(항공, 숙소, 일정 등) 데이터를 가져오는 훅
 */
export function useTripSubData(id: string, subCollection: string, enabled: boolean = true) {
    return useQuery({
        queryKey: ['trip', id, subCollection],
        queryFn: () => getTripSubCollection(id, subCollection),
        enabled: !!id && enabled,
        staleTime: 1000 * 60 * 5,
    });
}

export function useSaveTrip() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ trip, user }: { trip: Trip, user: { uid: string, name: string, photoURL?: string } }) => saveTrip(trip, user),
        onSuccess: (_, variables) => {
            // 메인 데이터 무효화
            queryClient.invalidateQueries({ queryKey: ['trip', variables.trip.id] });
        },
    });
}
