import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { localDateKey, msUntilNextLocalMidnight } from '@pplaner/shared';

/**
 * 현지 달력 기준 오늘 날짜("YYYY-MM-DD"). 자정이 지나면 스스로 바뀐다.
 *
 * 기록 화면은 켜 둔 채로 자정을 넘기는 일이 흔하다. 날짜를 렌더 시점에 한 번만
 * 계산하면 그 화면은 다음 날 내내 어제를 가리키고, 그날 남긴 기록은 화면에
 * 뜨지 않는다. 타이머는 백그라운드에서 밀리므로 앱이 앞으로 돌아올 때도 다시
 * 확인한다.
 */
export const useToday = (): string => {
    const [today, setToday] = useState(() => localDateKey());

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;

        const sync = () => {
            setToday((prev) => {
                const next = localDateKey();
                return next === prev ? prev : next;
            });
            timer = setTimeout(sync, msUntilNextLocalMidnight());
        };

        timer = setTimeout(sync, msUntilNextLocalMidnight());

        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') {
                clearTimeout(timer);
                sync();
            }
        });

        return () => {
            clearTimeout(timer);
            sub.remove();
        };
    }, []);

    return today;
};
