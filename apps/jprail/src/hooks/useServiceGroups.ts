import { useEffect, useState } from 'react';
import { ServiceGroup, ServicesFile } from '../types/railData';

let cached: Promise<ServiceGroup[]> | null = null;

/**
 * 운행계통을 읽는다.
 *
 * 철도 데이터(`useRailData`)와 따로 받는다. 계통은 **없어도 지도가 도는 부가
 * 정보**라, 같은 `Promise.all` 에 넣어 하나가 실패했다고 전체를 막고 싶지 않다.
 * 못 읽으면 빈 목록을 주고 지도는 선적으로만 묶인다.
 */
export const useServiceGroups = () => {
    const [services, setServices] = useState<ServiceGroup[]>([]);

    useEffect(() => {
        if (!cached) {
            cached = fetch('/rail/services.json')
                .then((res) => (res.ok ? res.json() : { services: {} }))
                .then((data: ServicesFile) =>
                    Object.values(data.services ?? {}).sort((a, b) =>
                        (a.name_kr || a.name).localeCompare(b.name_kr || b.name)
                    )
                )
                .catch((err) => {
                    console.warn('운행계통을 읽지 못했습니다. 선적으로만 표시됩니다.', err);
                    cached = null;
                    return [];
                });
        }
        let alive = true;
        cached.then((list) => {
            if (alive) setServices(list);
        });
        return () => {
            alive = false;
        };
    }, []);

    return services;
};
