import { Trip, TripWarning } from '../../types/trip';

/**
 * 국가별 공휴일·대형 연휴 혼잡 데이터셋.
 *
 * 공휴일은 국가 고유의 사실이므로(기후처럼 위도로 일반화 불가) 국가별 데이터셋으로 관리한다.
 * - fixed: 매년 같은 월/일 (MM-DD). endMD < startMD 이면 연말연시처럼 해를 넘기는 구간.
 * - dates: 음력 등 매년 날짜가 바뀌는 연휴의 명시적 구간 (YYYY-MM-DD).
 *
 * 음력 연휴 날짜는 근사치이며 info 수준 안내용이다. 연 1회 갱신 권장(2025~2027 수록).
 */

interface HolidayEntry {
    name: string;
    fixed?: { startMD: string; endMD: string };
    dates?: Array<{ start: string; end: string }>;
}

interface CountryHolidays {
    aliases: string[];
    holidays: HolidayEntry[];
}

const CONGESTION_NOTE = '관공서·상점·명소가 휴무일 수 있고, 교통·숙박이 혼잡하며 가격이 오를 수 있어요.';

const COUNTRY_HOLIDAYS: CountryHolidays[] = [
    {
        aliases: ['일본', 'japan', '도쿄', '오사카', '교토', '후쿠오카', '홋카이도', '오키나와'],
        holidays: [
            { name: '골든위크', fixed: { startMD: '04-29', endMD: '05-06' } },
            { name: '오봉', fixed: { startMD: '08-11', endMD: '08-16' } },
            { name: '연말연시', fixed: { startMD: '12-29', endMD: '01-03' } },
        ],
    },
    {
        aliases: ['중국', 'china', '베이징', '상하이', '상해', '광저우'],
        holidays: [
            { name: '노동절 연휴', fixed: { startMD: '05-01', endMD: '05-05' } },
            { name: '국경절 골든위크', fixed: { startMD: '10-01', endMD: '10-07' } },
            {
                name: '춘절',
                dates: [
                    { start: '2025-01-28', end: '2025-02-04' },
                    { start: '2026-02-16', end: '2026-02-22' },
                    { start: '2027-02-05', end: '2027-02-11' },
                ],
            },
        ],
    },
    {
        aliases: ['대만', 'taiwan', '타이완', '타이베이'],
        holidays: [
            {
                name: '춘절',
                dates: [
                    { start: '2025-01-28', end: '2025-02-02' },
                    { start: '2026-02-16', end: '2026-02-19' },
                    { start: '2027-02-05', end: '2027-02-09' },
                ],
            },
        ],
    },
    {
        aliases: ['한국', '대한민국', 'korea', '서울', '부산', '제주'],
        holidays: [
            {
                name: '설날 연휴',
                dates: [
                    { start: '2025-01-28', end: '2025-01-30' },
                    { start: '2026-02-16', end: '2026-02-18' },
                    { start: '2027-02-06', end: '2027-02-08' },
                ],
            },
            {
                name: '추석 연휴',
                dates: [
                    { start: '2025-10-05', end: '2025-10-08' },
                    { start: '2026-09-24', end: '2026-09-26' },
                    { start: '2027-09-14', end: '2027-09-16' },
                ],
            },
        ],
    },
    {
        aliases: ['미국', 'united states', 'usa', '뉴욕', '로스앤젤레스', '하와이', '괌'],
        holidays: [
            { name: '독립기념일', fixed: { startMD: '07-04', endMD: '07-04' } },
            {
                name: '추수감사절',
                dates: [
                    { start: '2025-11-27', end: '2025-11-28' },
                    { start: '2026-11-26', end: '2026-11-27' },
                    { start: '2027-11-25', end: '2027-11-26' },
                ],
            },
            { name: '연말연시', fixed: { startMD: '12-24', endMD: '01-01' } },
        ],
    },
    {
        aliases: ['베트남', 'vietnam', '하노이', '호치민', '다낭'],
        holidays: [
            {
                name: '뗏(Tết) 설 연휴',
                dates: [
                    { start: '2025-01-27', end: '2025-02-02' },
                    { start: '2026-02-16', end: '2026-02-22' },
                    { start: '2027-02-05', end: '2027-02-11' },
                ],
            },
        ],
    },
    {
        aliases: ['태국', 'thailand', '방콕', '푸켓', '치앙마이'],
        holidays: [{ name: '송끄란(물축제)', fixed: { startMD: '04-13', endMD: '04-15' } }],
    },
    {
        aliases: [
            '유럽', 'europe', '프랑스', '독일', '이탈리아', '스페인', '영국', '스위스',
            '오스트리아', '네덜란드', '캐나다', '호주', '뉴질랜드',
        ],
        holidays: [{ name: '크리스마스·연말', fixed: { startMD: '12-24', endMD: '01-01' } }],
    },
];

function yearsInRange(startDate: string, endDate: string): number[] {
    const ys = parseInt(startDate.slice(0, 4), 10);
    const ye = parseInt(endDate.slice(0, 4), 10);
    const out: number[] = [];
    if (isNaN(ys) || isNaN(ye)) return out;
    for (let y = ys; y <= ye && out.length < 5; y++) out.push(y);
    return out;
}

export function validateHolidayCongestion(trip: Trip, warnings: TripWarning[]) {
    if (!trip.dates?.startDate || !trip.dates?.endDate) return;
    const tripStart = trip.dates.startDate;
    const tripEnd = trip.dates.endDate;

    const regionNames = (trip.locations?.regions || []).map(r => (r.name || '').toLowerCase());
    if (regionNames.length === 0) return;

    const years = yearsInRange(tripStart, tripEnd);

    COUNTRY_HOLIDAYS.forEach(country => {
        const matched = country.aliases.some(a => regionNames.some(n => n.includes(a.toLowerCase())));
        if (!matched) return;

        country.holidays.forEach(h => {
            const ranges: Array<{ start: string; end: string }> = [];

            if (h.fixed) {
                const { startMD, endMD } = h.fixed;
                const wraps = endMD < startMD; // 해를 넘기는 구간(예: 12-29 ~ 01-03)
                years.forEach(y => {
                    if (wraps) {
                        ranges.push({ start: `${y}-${startMD}`, end: `${y + 1}-${endMD}` });
                        ranges.push({ start: `${y - 1}-${startMD}`, end: `${y}-${endMD}` });
                    } else {
                        ranges.push({ start: `${y}-${startMD}`, end: `${y}-${endMD}` });
                    }
                });
            }
            if (h.dates) h.dates.forEach(d => ranges.push(d));

            const overlaps = ranges.some(r => r.start <= tripEnd && tripStart <= r.end);
            const id = `holiday-${country.aliases[0]}-${h.name}`;
            if (overlaps && !warnings.some(w => w.id === id)) {
                warnings.push({
                    id,
                    type: 'seasonal',
                    severity: 'info',
                    message: `여행 기간에 현지 연휴 '${h.name}'가 포함돼요. ${CONGESTION_NOTE}`,
                    suggestion: '연휴에는 교통·숙소·인기 식당을 서둘러 예약하고, 휴무 가능성이 있는 명소는 영업 여부를 미리 확인하세요.',
                    sourceType: 'location',
                });
            }
        });
    });
}
