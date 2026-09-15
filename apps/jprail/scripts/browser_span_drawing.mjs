/**
 * 그리기가 **진짜 브라우저의 손가락과 마우스**에 붙었는지 본다.
 *
 * 순수 규칙은 `npm run verify:span` 이 본다. 여기서 보는 것은 그 규칙이 실제 이벤트에
 * 닿는가다 — 순수 함수로는 잡을 수 없고, 화면 없이 눈으로도 못 보는 것들이다.
 *
 *   1. **넓은 창에서도 손가락으로 그려지는가.** 전에는 창 너비로 갈라서 터치 노트북에서
 *      아무리 눌러도 열리지 않았다.
 *   2. **짧게 치는 것은 그리기가 아닌가.** 뒤따라오는 흉내 mousedown 까지 포함해서.
 *   3. **띠 안에서 손을 멈춰도 지도가 흐르는가.** 이벤트가 올 때만 셈하면 멈춘다.
 *   4. **길게 그어도 끝까지 살아 있는가.** 손가락이 처음 닿은 요소가 지도 이동으로
 *      다시 그려져 사라지면, 포인터를 붙잡아 두지 않는 한 그 뒤의 이벤트가 어디에도
 *      닿지 않아 그리다 만 채 얼어붙는다.
 *
 * 쓰는 법 — 먼저 `npx next dev -p 3111`, 그리고
 *
 *   node scripts/browser_span_drawing.mjs
 *
 * playwright-core 는 이 저장소의 의존성이 아니다. 없으면 건너뛴다(CI 를 막지 않는다).
 * 브라우저 경로는 `CHROME_PATH` 로 준다.
 */
const URL_BASE = process.env.SPAN_URL || 'http://127.0.0.1:3111/';
const EXEC = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

let chromium;
try {
    ({ chromium } = await import('playwright-core'));
} catch {
    console.log('playwright-core 가 없어 건너뜁니다 (npm i -D playwright-core 로 켤 수 있습니다).');
    process.exit(0);
}

let fails = 0;
const ok = (condition, label, extra = '') => {
    if (!condition) fails += 1;
    console.log(`  ${condition ? '✓' : '✗'} ${label}${extra ? ' — ' + extra : ''}`);
};

/** leaflet 지도 인스턴스를 react fiber 에서 찾아 `window.__MAP__` 에 걸어 둔다. */
function findMap() {
    const el = document.querySelector('.leaflet-container');
    if (!el) return false;
    const key = Object.keys(el).find(k => k.startsWith('__reactFiber$'));
    if (!key) return false;
    const seen = new Set();
    const isMap = v => {
        try {
            return !!v && typeof v === 'object' && typeof v.setView === 'function' && v._container === el;
        } catch { return false; }
    };
    const scan = (node, depth) => {
        if (!node || depth > 60 || seen.has(node)) return null;
        seen.add(node);
        for (const prop of ['memoizedState', 'memoizedProps', 'stateNode', 'pendingProps']) {
            let v;
            try { v = node[prop]; } catch { continue; }
            if (isMap(v)) return v;
            if (v && typeof v === 'object') {
                for (const k of Object.keys(v)) { try { if (isMap(v[k])) return v[k]; } catch { /* getter */ } }
                let h = v;
                for (let i = 0; h && i < 40; i += 1) {
                    try {
                        if (isMap(h.memoizedState)) return h.memoizedState;
                        if (h.memoizedState && isMap(h.memoizedState.current)) return h.memoizedState.current;
                    } catch { /* getter */ }
                    try { h = h.next; } catch { break; }
                }
            }
        }
        return scan(node.return, depth + 1) || scan(node.child, depth + 1);
    };
    const m = scan(el[key], 0);
    if (!m) return false;
    window.__MAP__ = m;
    return true;
}

const browser = await chromium.launch({ executablePath: EXEC });

const open = async hasTouch => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 }, hasTouch });
    const page = await ctx.newPage();
    page.on('pageerror', e => console.log('  [pageerror]', String(e).slice(0, 200)));
    await page.goto(URL_BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.leaflet-container', { timeout: 60000 });
    await page.waitForTimeout(9000);
    for (const label of ['Got it', '확인']) {
        const btn = page.locator(`button:has-text("${label}")`).first();
        if (await btn.count() && await btn.isVisible().catch(() => false)) { await btn.click(); break; }
    }
    await page.waitForTimeout(500);
    await page.addScriptTag({ content: `window.__findMap = ${findMap.toString()}` });
    await page.evaluate(() => window.__findMap());
    await page.evaluate(() => { window.__MAP__.setView([35.6812, 139.7671], 14); });
    await page.waitForTimeout(3500);
    const rect = await page.evaluate(() => {
        const r = window.__MAP__.getContainer().getBoundingClientRect();
        return { left: r.left, top: r.top, width: r.width, height: r.height };
    });
    return { ctx, page, rect };
};

/** 지도 한가운데에 가장 가까운 역을 **화면(뷰포트) 좌표**로. 컨테이너 좌표와 섞지 않는다. */
const nearestStation = page => page.evaluate(async () => {
    const src = await (await fetch('/rail/stations_master.json')).json();
    const map = window.__MAP__;
    const bounds = map.getBounds();
    const r = map.getContainer().getBoundingClientRect();
    let best = null;
    let bestDistance = Infinity;
    for (const key of Object.keys(src)) {
        const s = src[key];
        if (!bounds.contains([s.lat, s.lon])) continue;
        const pt = map.latLngToContainerPoint([s.lat, s.lon]);
        const d = Math.hypot(pt.x - r.width / 2, pt.y - r.height / 2);
        if (d < bestDistance) {
            bestDistance = d;
            best = { name: s.name, x: Math.round(pt.x + r.left), y: Math.round(pt.y + r.top) };
        }
    }
    return best;
});

const fogBadge = page => page.evaluate(() =>
    [...document.querySelectorAll('div')]
        .map(d => d.textContent)
        .filter(t => t && /^흐림 \d+역$/.test(t))[0] || null);
const draggable = page => page.evaluate(() => window.__MAP__.dragging.enabled());
const centre = page => page.evaluate(() => { const c = window.__MAP__.getCenter(); return [c.lat, c.lng]; });
const nothingRecorded = page => page.evaluate(() => document.body.innerText.includes('No trips recorded yet'));
const toucher = async (ctx, page) => {
    const cdp = await ctx.newCDPSession(page);
    return (type, x, y) => cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ x, y, radiusX: 12, radiusY: 12, force: 1 }]
    });
};

console.log('넓은 창 + 손가락: 눌러 두고 긋기');
{
    const { ctx, page, rect } = await open(true);
    const touch = await toucher(ctx, page);
    const st = await nearestStation(page);
    console.log(`  (지도 ${rect.width}x${rect.height} @ ${rect.left},${rect.top} / 시작역 ${st.name})`);

    await touch('touchStart', st.x, st.y);
    await page.waitForTimeout(520);                    // 눌러 두기를 넘긴다
    ok(!(await draggable(page)), '눌러 두면 그리기가 열린다');

    for (let i = 1; i <= 25; i += 1) {
        await touch('touchMove', st.x - i * 7, st.y + i * 2);
        await page.waitForTimeout(16);
    }
    await page.waitForTimeout(250);
    const drew = await fogBadge(page);
    ok(drew !== null, '그으면 흐림 배지가 뜬다', String(drew));

    await touch('touchMove', rect.left + 12, st.y + 50);
    await page.waitForTimeout(80);
    const before = await centre(page);
    await page.waitForTimeout(1200);                   // 손은 그대로. 지도만 흘러야 한다.
    const after = await centre(page);
    ok(Math.abs(after[1] - before[1]) > 0.005, '띠 안에서 손을 멈춰도 지도가 흐른다',
        `경도 ${(after[1] - before[1]).toFixed(4)}°`);

    // 그은 자리로 돌아가면 그리기가 되감기므로, 빈 자리로 뺀다.
    const rest = {
        x: Math.round(rect.left + rect.width * 0.62),
        y: Math.round(rect.top + rect.height * 0.5)
    };
    await touch('touchMove', rest.x, rest.y);
    await page.waitForTimeout(80);
    const settled = await centre(page);
    await page.waitForTimeout(900);
    ok(Math.abs((await centre(page))[1] - settled[1]) < 1e-9, '띠 밖으로 빼면 멈춘다');

    await touch('touchEnd', rest.x, rest.y);
    await page.waitForTimeout(900);
    // 여기까지 오면 포인터를 붙잡아 둔 덕이다. 놓아 두면 지도가 밀리는 사이 손가락이
    // 처음 닿은 선이 다시 그려져 사라지고, 그 뒤의 이벤트가 어디에도 닿지 않는다.
    ok((await fogBadge(page)) === null, '길게 긋고 손을 떼도 그리던 표시가 걷힌다');
    ok(await draggable(page), '손을 떼면 지도를 다시 끌 수 있다');
    ok(!(await nothingRecorded(page)), '손을 떼면 기록이 남는다');
    await ctx.close();
}

console.log('넓은 창 + 손가락: 짧게 치기');
{
    const { ctx, page } = await open(true);
    const touch = await toucher(ctx, page);
    const st = await nearestStation(page);
    await touch('touchStart', st.x, st.y);
    await page.waitForTimeout(120);
    await touch('touchEnd', st.x, st.y);
    await page.waitForTimeout(300);
    ok(await draggable(page), '짧게 치면 그리기가 열리지 않는다');

    await page.mouse.move(st.x, st.y);
    await page.mouse.down();
    await page.waitForTimeout(120);
    ok(await draggable(page), '뗀 직후의 흉내 mousedown 도 그리기를 열지 않는다');
    await page.mouse.move(st.x - 200, st.y);           // 클릭으로 끝나지 않게 뺀다
    await page.mouse.up();
    await ctx.close();
}

console.log('넓은 창 + 마우스');
{
    const { ctx, page } = await open(false);
    const st = await nearestStation(page);
    await page.mouse.move(st.x, st.y);
    await page.mouse.down();
    await page.waitForTimeout(100);
    ok(!(await draggable(page)), '마우스는 누르는 순간 그리기가 열린다', `시작역 ${st.name}`);
    for (let i = 1; i <= 25; i += 1) {
        await page.mouse.move(st.x - i * 7, st.y + i * 2);
        await page.waitForTimeout(12);
    }
    await page.waitForTimeout(250);
    await page.mouse.up();
    await page.waitForTimeout(900);
    ok(await draggable(page), '마우스를 떼면 지도를 다시 끌 수 있다');
    ok(!(await nothingRecorded(page)), '마우스로 그은 것도 기록으로 남는다');
    await ctx.close();
}

await browser.close();
console.log(fails === 0 ? '\n브라우저 검증 통과' : `\n브라우저 검증 실패 — ${fails}건`);
process.exit(fails === 0 ? 0 : 1);
