export interface Trip {
    id: string;
    name?: string;
    /** 이 기록을 만든 시각(ISO). **탄 날이 아니다.** */
    createdAt?: string;
    /**
     * 실제로 탄 날(`YYYY-MM-DD`).
     *
     * 앱(jpApp)의 `Trip.date` 와 같은 뜻이다. 손으로 그린 경로는 언제 탔는지 알 수
     * 없으므로 비워 둔다 — 기록한 날을 대신 넣으면 되짚기 애니메이션이 시간순으로
     * 도는 화면인데 2019년에 탄 여정보다 오늘 그린 경로가 앞에 서고, 화면에는 틀린
     * 날짜가 박힌다. 모르면 모른다고 두고, 되짚기는 그런 여정을 맨 뒤에 섞어서 붙인다.
     */
    date?: string;
    start: string;
    end: string;
    startId?: string;
    endId?: string;
    distance: number;
    path: string[];
    waypoints: string[];
    geometries: [number, number][][]; // Array of segments, each segment is array of points [lon, lat]
    sectionIds: number[];
}
