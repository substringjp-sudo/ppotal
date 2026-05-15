"use strict";
/**
 * exportService.ts
 * 여행 데이터를 다양한 형식으로 내보내는 순수 함수 모음.
 * 외부 라이브러리 없이 브라우저 내장 API만 사용.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportToICS = exportToICS;
exports.exportToJSON = exportToJSON;
exports.exportToCSV = exportToCSV;
exports.exportToPrint = exportToPrint;
// ── 공통 헬퍼 ──────────────────────────────────────────────────────────────
/** Blob을 만들어 <a download> 트릭으로 파일 저장 */
function downloadFile(content, filename, mimeType) {
    if (typeof document === 'undefined')
        return;
    const bom = mimeType.includes('csv') ? '\uFEFF' : ''; // Excel/한글 CSV BOM
    const blob = new Blob([bom + content], { type: mimeType + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/** 파일명에 쓸 수 없는 문자 제거 */
function safeFilename(name) {
    return name.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'trip';
}
// ── ICS 헬퍼 ─────────────────────────────────────────────────────────────
function esc(s) {
    return s.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}
function icsDate(d) {
    return d.replace(/-/g, '');
}
function icsDT(date, time) {
    return `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;
}
function addDays(dateStr, n) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
}
function foldLine(line) {
    if (line.length <= 75)
        return line;
    const parts = [];
    let remaining = line;
    parts.push(remaining.slice(0, 75));
    remaining = remaining.slice(75);
    while (remaining.length > 0) {
        parts.push(' ' + remaining.slice(0, 74));
        remaining = remaining.slice(74);
    }
    return parts.join('\r\n');
}
const CATEGORY_LABEL = {
    meal: '식사', shopping: '쇼핑', sightseeing: '관광',
    people: '사람', transport: '이동', accommodation: '숙소',
    reservation: '예약', other: '기타',
};
const BUDGET_CATEGORY_LABEL = {
    transport: '교통', accommodation: '숙소', food: '식비',
    shopping: '쇼핑', activity: '액티비티', other: '기타',
    prep: '준비비용',
};
const PAYMENT_STATUS_LABEL = {
    pre_paid: '결제완료(선불)', paid: '결제완료', pending: '결제예정',
};
const PAYMENT_METHOD_LABEL = {
    cash: '현금', card: '카드', transfer: '이체', other: '기타',
};
const RESERVATION_STATUS_LABEL = {
    confirmed: '확정', missing: '미확정', planned: '계획',
};
function exportToICS(trip) {
    const title = trip.titleSuggestion || trip.title || '여행';
    const uid = (id) => `${id}@pplaner.ai`;
    const lines = [];
    const L = (s) => lines.push(foldLine(s));
    L('BEGIN:VCALENDAR');
    L('VERSION:2.0');
    L('PRODID:-//PPLANER//Travel Planner//KO');
    L('CALSCALE:GREGORIAN');
    L(`X-WR-CALNAME:${esc(title)}`);
    L('X-WR-TIMEZONE:Asia/Seoul');
    (trip.flights ?? []).forEach((f) => {
        if (!f.date && !f.departureTime)
            return;
        const depDate = f.date ?? '';
        const depTime = f.departureTime?.match(/\d{2}:\d{2}/) ? f.departureTime.match(/\d{2}:\d{2}/)[0] : '';
        const arrTime = f.arrivalTime?.match(/\d{2}:\d{2}/) ? f.arrivalTime.match(/\d{2}:\d{2}/)[0] : '';
        const flightLabel = [f.departureLocation, f.arrivalLocation].filter(Boolean).join(' → ');
        const flightNum = [f.airline, f.flightNumber].filter(Boolean).join(' ');
        const summary = `✈️ ${flightLabel}${flightNum ? ` (${flightNum})` : ''}`;
        L('BEGIN:VEVENT');
        L(`UID:${uid(f.id)}`);
        if (depDate && depTime) {
            L(`DTSTART:${icsDT(depDate, depTime)}`);
            if (arrTime)
                L(`DTEND:${icsDT(depDate, arrTime)}`);
            else
                L(`DTEND:${icsDT(depDate, depTime)}`);
        }
        else if (depDate) {
            L(`DTSTART;VALUE=DATE:${icsDate(depDate)}`);
            L(`DTEND;VALUE=DATE:${icsDate(addDays(depDate, 1))}`);
        }
        L(`SUMMARY:${esc(summary)}`);
        if (f.departureLocation)
            L(`LOCATION:${esc(f.departureLocation)}`);
        const desc = [];
        if (flightNum)
            desc.push(`항공편: ${flightNum}`);
        if (f.cost != null)
            desc.push(`비용: ${f.cost.toLocaleString()} ${f.currency ?? ''}`);
        if (desc.length)
            L(`DESCRIPTION:${esc(desc.join('\\n'))}`);
        L('END:VEVENT');
    });
    (trip.accommodation ?? []).forEach((a) => {
        if (!a.startDate)
            return;
        const checkIn = a.expectedCheckInTime ?? a.checkInStartTime;
        L('BEGIN:VEVENT');
        L(`UID:${uid(a.id)}`);
        if (checkIn) {
            L(`DTSTART:${icsDT(a.startDate, checkIn)}`);
            L(`DTEND:${icsDT(a.startDate, checkIn)}`);
        }
        else {
            L(`DTSTART;VALUE=DATE:${icsDate(a.startDate)}`);
            L(`DTEND;VALUE=DATE:${icsDate(a.endDate ?? addDays(a.startDate, 1))}`);
        }
        L(`SUMMARY:${esc(`🏨 ${a.name} 체크인`)}`);
        if (a.location)
            L(`LOCATION:${esc(a.location)}`);
        const desc = [];
        if (a.checkOutEndTime)
            desc.push(`체크아웃: ${a.endDate ?? ''} ${a.expectedCheckOutTime ?? a.checkOutEndTime ?? ''}`);
        if (a.price != null)
            desc.push(`요금: ${a.price.toLocaleString()} ${a.currency ?? ''}`);
        if (desc.length)
            L(`DESCRIPTION:${esc(desc.join('\\n'))}`);
        L('END:VEVENT');
    });
    (trip.dailyTimeline ?? []).forEach((day) => {
        (day.events ?? []).forEach((ev) => {
            if (!day.date)
                return;
            if (ev.isAutoGenerated)
                return;
            L('BEGIN:VEVENT');
            L(`UID:${uid(ev.id ?? Math.random().toString(36).slice(2))}`);
            if (ev.startTime) {
                L(`DTSTART:${icsDT(day.date, ev.startTime)}`);
                if (ev.endTime)
                    L(`DTEND:${icsDT(day.date, ev.endTime)}`);
                else
                    L(`DTEND:${icsDT(day.date, ev.startTime)}`);
            }
            else {
                L(`DTSTART;VALUE=DATE:${icsDate(day.date)}`);
                L(`DTEND;VALUE=DATE:${icsDate(day.date)}`);
            }
            const icon = ev.type === 'meal' ? '🍽️' : ev.type === 'sightseeing' ? '📍' : ev.type === 'shopping' ? '🛍️' : '📌';
            L(`SUMMARY:${esc(`${icon} ${ev.title}`)}`);
            if (ev.location?.name)
                L(`LOCATION:${esc(ev.location.name + (ev.location.address ? `, ${ev.location.address}` : ''))}`);
            const desc = [];
            if (ev.memo)
                desc.push(ev.memo);
            if (ev.cost != null)
                desc.push(`비용: ${ev.cost.toLocaleString()} ${ev.currency ?? ''}`);
            if (desc.length)
                L(`DESCRIPTION:${esc(desc.join('\\n'))}`);
            L('END:VEVENT');
        });
    });
    (trip.reservations ?? []).forEach((r) => {
        if (!r.date)
            return;
        L('BEGIN:VEVENT');
        L(`UID:${uid(r.id)}`);
        if (r.time) {
            L(`DTSTART:${icsDT(r.date, r.time)}`);
            L(`DTEND:${icsDT(r.date, r.time)}`);
        }
        else {
            L(`DTSTART;VALUE=DATE:${icsDate(r.date)}`);
            L(`DTEND;VALUE=DATE:${icsDate(r.date)}`);
        }
        L(`SUMMARY:${esc(`🎫 ${r.title}`)}`);
        if (r.location)
            L(`LOCATION:${esc(r.location)}`);
        if (r.memo)
            L(`DESCRIPTION:${esc(r.memo)}`);
        L('END:VEVENT');
    });
    (trip.prepTimeline ?? []).forEach((p) => {
        const deadline = typeof p.date === 'string' && p.date.match(/^\d{4}-\d{2}-\d{2}/)
            ? p.date.slice(0, 10) : null;
        if (!deadline)
            return;
        L('BEGIN:VEVENT');
        L(`UID:${uid(p.id)}`);
        L(`DTSTART;VALUE=DATE:${icsDate(deadline)}`);
        L(`DTEND;VALUE=DATE:${icsDate(addDays(deadline, 1))}`);
        L(`SUMMARY:${esc(`📋 ${p.title}`)}`);
        if (p.memo)
            L(`DESCRIPTION:${esc(p.memo)}`);
        L('END:VEVENT');
    });
    L('END:VCALENDAR');
    downloadFile(lines.join('\r\n'), `${safeFilename(title)}.ics`, 'text/calendar');
}
function exportToJSON(trip) {
    const title = trip.titleSuggestion || trip.title || '여행';
    const { _loadedSubCollections, ...exportData } = trip;
    const output = {
        _pplaner_export_version: '1.0',
        _exported_at: new Date().toISOString(),
        ...exportData,
    };
    downloadFile(JSON.stringify(output, null, 2), `${safeFilename(title)}.json`, 'application/json');
}
function csvCell(val) {
    const s = val == null ? '' : String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}
function csvRow(cells) {
    return cells.map(csvCell).join(',');
}
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
function getDayOfWeek(dateStr) {
    try {
        return DAY_NAMES[new Date(dateStr).getDay()] + '요일';
    }
    catch {
        return '';
    }
}
function exportToCSV(trip) {
    const title = trip.titleSuggestion || trip.title || '여행';
    const scheduleRows = [
        csvRow(['날짜', '요일', '시간', '유형', '제목', '장소', '상태', '메모']),
    ];
    (trip.flights ?? []).forEach((f) => {
        if (!f.date)
            return;
        scheduleRows.push(csvRow([
            f.date, getDayOfWeek(f.date),
            f.departureTime?.match(/\d{2}:\d{2}/)?.[0] ?? '',
            '항공편',
            [f.departureLocation, f.arrivalLocation].filter(Boolean).join(' → ') +
                ([f.airline, f.flightNumber].filter(Boolean).length ? ` (${[f.airline, f.flightNumber].filter(Boolean).join(' ')})` : ''),
            f.departureLocation ?? '',
            f.isBooked ? '예약완료' : '미예약',
            '',
        ]));
    });
    (trip.publicTransport ?? []).forEach((pt) => {
        if (!pt.date)
            return;
        scheduleRows.push(csvRow([
            pt.date, getDayOfWeek(pt.date),
            pt.departureTime?.match(/\d{2}:\d{2}/)?.[0] ?? '',
            pt.type === 'train' ? '열차' : pt.type === 'bus' ? '버스' : pt.type === 'ferry' ? '선박' : '교통',
            `${pt.departureLocation ?? ''} → ${pt.arrivalLocation ?? ''}`,
            pt.departureLocation ?? '',
            pt.isBooked ? '예약완료' : '미예약',
            pt.name ?? '',
        ]));
    });
    (trip.driving ?? []).forEach((d) => {
        if (!d.date)
            return;
        scheduleRows.push(csvRow([
            d.date, getDayOfWeek(d.date),
            d.pickupTime ?? '',
            d.isRental ? '렌터카' : '자가운전',
            `픽업: ${d.pickupLocation ?? ''}`,
            d.pickupLocation ?? '',
            d.isBooked ? '예약완료' : '미예약',
            '',
        ]));
    });
    (trip.accommodation ?? []).forEach((a) => {
        if (!a.startDate)
            return;
        scheduleRows.push(csvRow([
            a.startDate, getDayOfWeek(a.startDate),
            a.expectedCheckInTime ?? a.checkInStartTime ?? '',
            '숙소 체크인',
            a.name,
            a.location,
            a.status === 'booked' ? '예약완료' : '미확정',
            a.memo ?? '',
        ]));
    });
    (trip.reservations ?? []).forEach((r) => {
        if (!r.date)
            return;
        scheduleRows.push(csvRow([
            r.date, getDayOfWeek(r.date),
            r.time ?? '',
            '예약',
            r.title,
            r.location ?? '',
            RESERVATION_STATUS_LABEL[r.status] ?? r.status,
            r.memo ?? '',
        ]));
    });
    (trip.dailyTimeline ?? []).forEach((day) => {
        (day.events ?? []).forEach((ev) => {
            if (ev.isAutoGenerated)
                return;
            scheduleRows.push(csvRow([
                day.date, getDayOfWeek(day.date),
                ev.startTime ?? '',
                CATEGORY_LABEL[ev.type] ?? ev.type,
                ev.title,
                ev.location?.name ?? '',
                ev.maturity === 'confirmed' ? '확정' : ev.maturity === 'planned' ? '계획' : '아이디어',
                ev.memo ?? '',
            ]));
        });
    });
    (trip.prepTimeline ?? []).forEach((p) => {
        const deadline = typeof p.date === 'string' && p.date.match(/^\d{4}-\d{2}-\d{2}/)
            ? p.date.slice(0, 10) : '';
        scheduleRows.push(csvRow([
            deadline, deadline ? getDayOfWeek(deadline) : '',
            '',
            '준비항목',
            p.title,
            '',
            p.status === 'done' ? '완료' : p.status === 'active' ? '진행중' : p.status === 'upcoming' ? '예정' : '미완료',
            p.memo ?? '',
        ]));
    });
    downloadFile(scheduleRows.join('\n'), `${safeFilename(title)}-일정표.csv`, 'text/csv');
    setTimeout(() => {
        const budgetRows = [
            csvRow(['카테고리', '항목', '금액', '통화', '지불방법', '상태', '날짜', '메모']),
        ];
        (trip.budget?.expenses ?? []).forEach((e) => {
            budgetRows.push(csvRow([
                BUDGET_CATEGORY_LABEL[e.category] ?? e.category,
                e.title,
                e.amount,
                e.currency,
                PAYMENT_METHOD_LABEL[e.paymentMethod ?? ''] ?? (e.paymentMethod ?? ''),
                PAYMENT_STATUS_LABEL[e.paymentStatus ?? ''] ?? (e.paymentStatus ?? ''),
                e.date ?? '',
                e.memo ?? '',
            ]));
        });
        (trip.flights ?? []).forEach((f) => {
            if (f.cost != null) {
                budgetRows.push(csvRow([
                    '교통', `✈️ ${[f.departureLocation, f.arrivalLocation].filter(Boolean).join('→')}`,
                    f.cost, f.currency ?? trip.budget?.currency ?? '',
                    PAYMENT_METHOD_LABEL[f.paymentMethod ?? ''] ?? '',
                    PAYMENT_STATUS_LABEL[f.paymentStatus ?? ''] ?? '',
                    f.date ?? '', '',
                ]));
            }
        });
        (trip.accommodation ?? []).forEach((a) => {
            if (a.price != null) {
                budgetRows.push(csvRow([
                    '숙소', a.name, a.price, a.currency ?? trip.budget?.currency ?? '',
                    PAYMENT_METHOD_LABEL[a.paymentMethod ?? ''] ?? '',
                    PAYMENT_STATUS_LABEL[a.paymentStatus ?? ''] ?? '',
                    a.startDate ?? '', a.memo ?? '',
                ]));
            }
        });
        downloadFile(budgetRows.join('\n'), `${safeFilename(title)}-예산표.csv`, 'text/csv');
    }, 150);
}
function htmlEsc(s) {
    return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function exportToPrint(trip) {
    if (typeof window === 'undefined')
        return;
    const title = trip.titleSuggestion || trip.title || '여행';
    const startDate = trip.dates?.startDate?.replace(/-/g, '.') ?? '';
    const endDate = trip.dates?.endDate?.replace(/-/g, '.') ?? '';
    const participantNames = (trip.participants ?? []).map((p) => p.name ?? p.id ?? '').filter(Boolean).join(', ');
    const regionNames = trip.locations?.regionNames?.join(', ') ?? '';
    const flightCount = (trip.flights ?? []).length;
    const hotelCount = (trip.accommodation ?? []).length;
    const eventCount = (trip.dailyTimeline ?? []).reduce((sum, d) => sum + (d.events?.filter(e => !e.isAutoGenerated).length ?? 0), 0);
    const allRows = [];
    (trip.flights ?? []).forEach((f) => {
        if (!f.date)
            return;
        allRows.push({
            date: f.date, dow: getDayOfWeek(f.date),
            time: f.departureTime?.match(/\d{2}:\d{2}/)?.[0] ?? '',
            type: '✈️ 항공',
            title: [f.departureLocation, f.arrivalLocation].filter(Boolean).join(' → ') +
                ([f.airline, f.flightNumber].filter(Boolean).length ? ` (${[f.airline, f.flightNumber].filter(Boolean).join(' ')})` : ''),
            location: f.departureLocation ?? '',
            status: f.isBooked ? '예약완료' : '미예약', memo: '',
        });
    });
    (trip.accommodation ?? []).forEach((a) => {
        if (!a.startDate)
            return;
        allRows.push({
            date: a.startDate, dow: getDayOfWeek(a.startDate),
            time: a.expectedCheckInTime ?? a.checkInStartTime ?? '',
            type: '🏨 숙소',
            title: `${a.name} 체크인`,
            location: a.location,
            status: a.status === 'booked' ? '예약완료' : '미확정', memo: a.memo ?? '',
        });
    });
    (trip.dailyTimeline ?? []).forEach((day) => {
        (day.events ?? []).forEach((ev) => {
            if (ev.isAutoGenerated)
                return;
            const icon = ev.type === 'meal' ? '🍽️' : ev.type === 'sightseeing' ? '📍' : ev.type === 'shopping' ? '🛍️' : ev.type === 'accommodation' ? '🏨' : ev.type === 'transport' ? '🚌' : '📌';
            allRows.push({
                date: day.date, dow: getDayOfWeek(day.date),
                time: ev.startTime ?? '',
                type: `${icon} ${CATEGORY_LABEL[ev.type] ?? ev.type}`,
                title: ev.title,
                location: ev.location?.name ?? '',
                status: ev.maturity === 'confirmed' ? '확정' : ev.maturity === 'planned' ? '계획' : '아이디어',
                memo: ev.memo ?? '',
            });
        });
    });
    (trip.reservations ?? []).forEach((r) => {
        if (!r.date)
            return;
        allRows.push({
            date: r.date, dow: getDayOfWeek(r.date),
            time: r.time ?? '',
            type: '🎫 예약',
            title: r.title,
            location: r.location ?? '',
            status: RESERVATION_STATUS_LABEL[r.status] ?? r.status, memo: r.memo ?? '',
        });
    });
    allRows.sort((a, b) => {
        const dc = a.date.localeCompare(b.date);
        if (dc !== 0)
            return dc;
        return a.time.localeCompare(b.time);
    });
    const totalExpenses = (trip.budget?.expenses ?? []).reduce((sum, e) => sum + (e.amount ?? 0), 0);
    const baseCurrency = trip.budget?.currency ?? 'KRW';
    const budgetByCategory = {};
    (trip.budget?.expenses ?? []).forEach((e) => {
        const cat = BUDGET_CATEGORY_LABEL[e.category] ?? e.category;
        budgetByCategory[cat] = (budgetByCategory[cat] ?? 0) + (e.amount ?? 0);
    });
    const scheduleTableRows = allRows.map((r) => `
        <tr>
            <td>${htmlEsc(r.date.replace(/-/g, '.'))}</td>
            <td>${htmlEsc(r.dow)}</td>
            <td>${htmlEsc(r.time)}</td>
            <td>${htmlEsc(r.type)}</td>
            <td><strong>${htmlEsc(r.title)}</strong></td>
            <td>${htmlEsc(r.location)}</td>
            <td><span class="badge">${htmlEsc(r.status)}</span></td>
            <td class="memo">${htmlEsc(r.memo)}</td>
        </tr>`).join('');
    const budgetTableRows = Object.entries(budgetByCategory).map(([cat, amount]) => `
        <tr>
            <td>${htmlEsc(cat)}</td>
            <td class="num">${amount.toLocaleString()}</td>
            <td>${htmlEsc(baseCurrency)}</td>
            <td class="num">${totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) + '%' : '-'}</td>
        </tr>`).join('');
    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${htmlEsc(title)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; color: #1e293b; font-size: 12px; padding: 20px; }
  h1 { font-size: 24px; font-weight: 900; color: #0f172a; }
  h2 { font-size: 14px; font-weight: 800; color: #ec5b13; text-transform: uppercase; letter-spacing: 0.1em; margin: 24px 0 8px; border-left: 3px solid #ec5b13; padding-left: 8px; }
  .cover { padding: 24px 0 20px; border-bottom: 2px solid #e2e8f0; margin-bottom: 20px; }
  .meta { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 8px; color: #64748b; font-size: 11px; font-weight: 600; }
  .meta span::before { content: '• '; color: #ec5b13; }
  .stats { display: flex; gap: 12px; margin: 12px 0 0; flex-wrap: wrap; }
  .stat { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 12px; text-align: center; }
  .stat .n { font-size: 20px; font-weight: 900; color: #ec5b13; }
  .stat .l { font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #ec5b13; color: white; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; padding: 6px 8px; text-align: left; }
  td { border: 1px solid #e2e8f0; padding: 5px 8px; vertical-align: top; font-size: 11px; }
  tr:nth-child(even) td { background: #f8fafc; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .memo { color: #94a3b8; font-size: 10px; }
  .badge { display: inline-block; padding: 1px 6px; border-radius: 4px; background: #f1f5f9; font-size: 9px; font-weight: 700; color: #475569; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 10px; text-align: center; }
  @media print {
    body { padding: 0; font-size: 11px; }
    h2 { page-break-before: auto; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; }
    .footer { display: none; }
  }
</style>
</head>
<body>
  <div class="cover">
    <h1>${htmlEsc(title)}</h1>
    <div class="meta">
      ${startDate ? `<span>📅 ${htmlEsc(startDate)} ~ ${htmlEsc(endDate)}</span>` : ''}
      ${regionNames ? `<span>📍 ${htmlEsc(regionNames)}</span>` : ''}
      ${participantNames ? `<span>👥 ${htmlEsc(participantNames)}</span>` : ''}
    </div>
    <div class="stats">
      <div class="stat"><div class="n">${flightCount}</div><div class="l">항공편</div></div>
      <div class="stat"><div class="n">${hotelCount}</div><div class="l">숙소</div></div>
      <div class="stat"><div class="n">${eventCount}</div><div class="l">일정</div></div>
      <div class="stat"><div class="n">${(trip.reservations ?? []).length}</div><div class="l">예약</div></div>
      ${totalExpenses > 0 ? `<div class="stat"><div class="n">${totalExpenses.toLocaleString()}</div><div class="l">${baseCurrency}</div></div>` : ''}
    </div>
  </div>

  <h2>📅 전체 일정</h2>
  <table>
    <thead><tr>
      <th>날짜</th><th>요일</th><th>시간</th><th>유형</th><th>내용</th><th>장소</th><th>상태</th><th>메모</th>
    </tr></thead>
    <tbody>${scheduleTableRows || '<tr><td colspan="8" style="text-align:center;color:#94a3b8">일정 데이터 없음</td></tr>'}</tbody>
  </table>

  ${totalExpenses > 0 ? `
  <h2>💰 예산 요약</h2>
  <table>
    <thead><tr><th>카테고리</th><th>금액</th><th>통화</th><th>비율</th></tr></thead>
    <tbody>
      ${budgetTableRows}
      <tr style="font-weight:900; background:#fff7ed">
        <td><strong>합계</strong></td>
        <td class="num"><strong>${totalExpenses.toLocaleString()}</strong></td>
        <td>${htmlEsc(baseCurrency)}</td>
        <td class="num">100%</td>
      </tr>
    </tbody>
  </table>` : ''}

  <div class="footer">PPLANER · 내보내기 일시: ${new Date().toLocaleString('ko-KR')} · 이 문서는 여행 계획 요약입니다.</div>

  <script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;
    const w = window.open('', '_blank');
    if (!w) {
        alert('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.');
        return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
}
