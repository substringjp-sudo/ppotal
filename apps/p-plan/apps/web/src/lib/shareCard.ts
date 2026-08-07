/**
 * 공유 카드 렌더러 (클라이언트 canvas).
 *
 * 정적 export 환경이라 서버 OG/동적 이미지 생성이 불가능하므로, SNS 공유 카드를
 * 브라우저 canvas에 직접 그린다. 외부 라이브러리 없이 2D 컨텍스트만 사용한다.
 *
 * 4종 템플릿(A 매거진 · B 분할 · C 타이포 · D 포토북) × 6 테마 팔레트.
 * 앱 홍보를 위해 모든 카드에 PPLANER 워드마크를 새긴다.
 */

export type CardTemplate = 'A' | 'B' | 'C' | 'D';

export interface CardTheme {
    id: string;
    name: string;
    from: string;   // 배경 그라디언트 시작
    to: string;     // 배경 그라디언트 끝
    accent: string; // 강조색
    panel: string;  // 정보 패널 배경
    text: string;   // 주 텍스트
    sub: string;    // 보조 텍스트
}

export const CARD_THEMES: CardTheme[] = [
    { id: 'sunset', name: '노을', from: '#ff7e5f', to: '#feb47b', accent: '#ffffff', panel: '#3d1f1a', text: '#ffffff', sub: 'rgba(255,255,255,0.72)' },
    { id: 'ocean', name: '바다', from: '#2193b0', to: '#6dd5ed', accent: '#ffffff', panel: '#0d2b33', text: '#ffffff', sub: 'rgba(255,255,255,0.72)' },
    { id: 'forest', name: '숲', from: '#134e5e', to: '#71b280', accent: '#eafff2', panel: '#0c2a24', text: '#ffffff', sub: 'rgba(255,255,255,0.72)' },
    { id: 'mono', name: '모노', from: '#232526', to: '#414345', accent: '#ffd166', panel: '#0f0f10', text: '#ffffff', sub: 'rgba(255,255,255,0.68)' },
    { id: 'sakura', name: '벚꽃', from: '#ee9ca7', to: '#ffdde1', accent: '#7a2e3a', panel: '#fff5f6', text: '#3a1c22', sub: 'rgba(58,28,34,0.62)' },
    { id: 'grape', name: '자수정', from: '#7b4397', to: '#dc2430', accent: '#ffffff', panel: '#2a1533', text: '#ffffff', sub: 'rgba(255,255,255,0.72)' },
];

export interface ShareCardData {
    title: string;
    dateText: string;
    placeCount: number;
    dayCount: number;
    themeLabel: string;
    photoUrls: string[];
}

export const CARD_W = 1080;
export const CARD_H = 1350;

const FONT = "'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', system-ui, sans-serif";
/** 타이틀 전용 — 읽는 화면(여행기록/인쇄물)과 같은 에디토리얼 세리프 규칙을 공유 카드도 물려받는다 */
const FONT_EDITORIAL = "'Newsreader', 'Noto Serif KR', serif";

function loadImage(url: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
    });
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
}

/** object-fit: cover 로 이미지를 영역에 채워 그린다 */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
    const ir = img.width / img.height;
    const r = w / h;
    let sw: number, sh: number, sx: number, sy: number;
    if (ir > r) { sh = img.height; sw = sh * r; sx = (img.width - sw) / 2; sy = 0; }
    else { sw = img.width; sh = sw / r; sx = 0; sy = (img.height - sh) / 2; }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/** 최대 줄 수 안에서 텍스트를 감싸 그리고, 마지막 줄이 넘치면 말줄임 */
function wrapText(
    ctx: CanvasRenderingContext2D, text: string, x: number, y: number,
    maxW: number, lineH: number, maxLines: number,
): number {
    const chars = Array.from(text);
    const lines: string[] = [];
    let cur = '';
    for (const ch of chars) {
        const test = cur + ch;
        if (ctx.measureText(test).width > maxW && cur) {
            lines.push(cur);
            cur = ch;
            if (lines.length === maxLines) break;
        } else {
            cur = test;
        }
    }
    if (lines.length < maxLines && cur) lines.push(cur);
    // 마지막 줄 말줄임 처리
    if (lines.length === maxLines) {
        let last = lines[maxLines - 1];
        const rest = chars.slice(lines.join('').length).length;
        if (rest > 0) {
            while (ctx.measureText(last + '…').width > maxW && last.length > 1) last = last.slice(0, -1);
            lines[maxLines - 1] = last + '…';
        }
    }
    lines.forEach((ln, i) => ctx.fillText(ln, x, y + i * lineH));
    return lines.length * lineH;
}

function drawBrand(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, align: CanvasTextAlign = 'left') {
    ctx.save();
    ctx.textAlign = align;
    ctx.fillStyle = color;
    ctx.font = `800 30px ${FONT}`;
    ctx.letterSpacing = '4px';
    ctx.fillText('PPLANER', x, y);
    ctx.letterSpacing = '0px';
    ctx.restore();
}

function statChips(ctx: CanvasRenderingContext2D, data: ShareCardData, x: number, y: number, color: string, sub: string) {
    const items = [
        `${data.dayCount}일`,
        `장소 ${data.placeCount}`,
        data.themeLabel,
    ].filter((t) => t && !t.endsWith('undefined'));
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    let cx = x;
    items.forEach((t) => {
        ctx.font = `700 26px ${FONT}`;
        const w = ctx.measureText(t).width + 40;
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        roundRectPath(ctx, cx, y - 26, w, 52, 26);
        ctx.fillStyle = sub === color ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.16)';
        ctx.fill();
        ctx.fillStyle = color;
        ctx.fillText(t, cx + 20, y + 1);
        cx += w + 14;
    });
    ctx.restore();
}

async function drawBackground(ctx: CanvasRenderingContext2D, theme: CardTheme) {
    const g = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
    g.addColorStop(0, theme.from);
    g.addColorStop(1, theme.to);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
}

/** A · 매거진 커버: 전면 사진 + 하단 그라디언트 오버레이 + 큰 타이틀 */
async function renderA(ctx: CanvasRenderingContext2D, theme: CardTheme, data: ShareCardData) {
    await drawBackground(ctx, theme);
    const hero = data.photoUrls[0] ? await loadImage(data.photoUrls[0]) : null;
    if (hero) drawCover(ctx, hero, 0, 0, CARD_W, CARD_H);

    // 하단 어둠 오버레이
    const og = ctx.createLinearGradient(0, CARD_H * 0.35, 0, CARD_H);
    og.addColorStop(0, 'rgba(0,0,0,0)');
    og.addColorStop(1, 'rgba(0,0,0,0.82)');
    ctx.fillStyle = og;
    ctx.fillRect(0, 0, CARD_W, CARD_H);

    drawBrand(ctx, 72, 96, '#ffffff');
    // 강조 라인
    ctx.fillStyle = theme.from;
    roundRectPath(ctx, 72, 118, 64, 8, 4); ctx.fill();

    // 하단에서부터 역산해 배치(제목이 2줄이어도 칩이 잘리지 않도록)
    const titleY = CARD_H - 380; // 첫 줄 baseline
    const lineH = 100;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.font = `700 30px ${FONT}`;
    ctx.fillText(data.dateText, 72, titleY - 86);

    ctx.fillStyle = '#ffffff';
    ctx.font = `600 92px ${FONT_EDITORIAL}`;
    const used = wrapText(ctx, data.title, 72, titleY, CARD_W - 144, lineH, 2);

    ctx.textBaseline = 'middle';
    statChips(ctx, data, 72, titleY + used + 8, '#ffffff', theme.sub);
}

/** B · 분할: 상단 사진 + 하단 정보 패널 */
async function renderB(ctx: CanvasRenderingContext2D, theme: CardTheme, data: ShareCardData) {
    await drawBackground(ctx, theme);
    const photoH = Math.round(CARD_H * 0.62);
    const hero = data.photoUrls[0] ? await loadImage(data.photoUrls[0]) : null;
    if (hero) {
        drawCover(ctx, hero, 0, 0, CARD_W, photoH);
    } else {
        const g = ctx.createLinearGradient(0, 0, CARD_W, photoH);
        g.addColorStop(0, theme.from); g.addColorStop(1, theme.to);
        ctx.fillStyle = g; ctx.fillRect(0, 0, CARD_W, photoH);
    }
    // 하단 패널
    ctx.fillStyle = theme.panel;
    ctx.fillRect(0, photoH, CARD_W, CARD_H - photoH);

    drawBrand(ctx, 72, photoH + 84, theme.accent);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = theme.sub;
    ctx.font = `700 28px ${FONT}`;
    ctx.fillText(data.dateText, 72, photoH + 132);

    ctx.fillStyle = theme.text;
    ctx.font = `600 76px ${FONT_EDITORIAL}`;
    const used = wrapText(ctx, data.title, 72, photoH + 210, CARD_W - 144, 84, 2);

    ctx.textBaseline = 'middle';
    statChips(ctx, data, 72, photoH + 210 + used + 30, theme.text, theme.sub);
}

/** C · 타이포: 사진 없이도 완성되는 그라디언트 + 중앙 타이포 */
async function renderC(ctx: CanvasRenderingContext2D, theme: CardTheme, data: ShareCardData) {
    await drawBackground(ctx, theme);
    // 은은한 광원
    const rg = ctx.createRadialGradient(CARD_W / 2, CARD_H * 0.32, 60, CARD_W / 2, CARD_H * 0.32, CARD_W * 0.9);
    rg.addColorStop(0, 'rgba(255,255,255,0.22)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, CARD_W, CARD_H);

    ctx.textAlign = 'center';
    drawBrand(ctx, CARD_W / 2, 150, theme.text, 'center');

    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = theme.sub;
    ctx.font = `700 32px ${FONT}`;
    ctx.fillText(data.dateText, CARD_W / 2, CARD_H / 2 - 170);

    ctx.fillStyle = theme.text;
    ctx.font = `600 104px ${FONT_EDITORIAL}`;
    wrapText2Centered(ctx, data.title, CARD_W / 2, CARD_H / 2 - 60, CARD_W - 180, 112, 3);

    // 구분선
    ctx.strokeStyle = theme.sub;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(CARD_W / 2 - 60, CARD_H - 300); ctx.lineTo(CARD_W / 2 + 60, CARD_H - 300); ctx.stroke();

    ctx.textBaseline = 'middle';
    ctx.fillStyle = theme.text;
    ctx.font = `800 40px ${FONT}`;
    ctx.fillText(`${data.dayCount}일  ·  장소 ${data.placeCount}  ·  ${data.themeLabel}`, CARD_W / 2, CARD_H - 230);
}

/** D · 포토북: 2×2 사진 그리드 + 하단 타이틀 바 */
async function renderD(ctx: CanvasRenderingContext2D, theme: CardTheme, data: ShareCardData) {
    await drawBackground(ctx, theme);
    const pad = 40;
    const gridH = Math.round(CARD_H * 0.66);
    const cellW = (CARD_W - pad * 3) / 2;
    const cellH = (gridH - pad * 3) / 2;
    const slots = [
        { x: pad, y: pad },
        { x: pad * 2 + cellW, y: pad },
        { x: pad, y: pad * 2 + cellH },
        { x: pad * 2 + cellW, y: pad * 2 + cellH },
    ];
    const imgs = await Promise.all(data.photoUrls.slice(0, 4).map(loadImage));
    for (let i = 0; i < 4; i++) {
        const s = slots[i];
        ctx.save();
        roundRectPath(ctx, s.x, s.y, cellW, cellH, 28);
        ctx.clip();
        const im = imgs[i];
        if (im) {
            drawCover(ctx, im, s.x, s.y, cellW, cellH);
        } else {
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            ctx.fillRect(s.x, s.y, cellW, cellH);
        }
        ctx.restore();
    }
    // 하단 타이틀 바
    ctx.fillStyle = theme.panel;
    roundRectPath(ctx, pad, gridH + pad, CARD_W - pad * 2, CARD_H - gridH - pad * 2, 32);
    ctx.fill();

    drawBrand(ctx, pad + 32, gridH + pad + 66, theme.accent);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = theme.text;
    ctx.font = `600 68px ${FONT_EDITORIAL}`;
    const used = wrapText(ctx, data.title, pad + 32, gridH + pad + 150, CARD_W - pad * 2 - 64, 76, 1);
    ctx.fillStyle = theme.sub;
    ctx.font = `700 28px ${FONT}`;
    ctx.fillText(`${data.dateText}   ·   ${data.dayCount}일   ·   장소 ${data.placeCount}`, pad + 32, gridH + pad + 150 + used + 16);
}

function wrapText2Centered(
    ctx: CanvasRenderingContext2D, text: string, cx: number, y: number,
    maxW: number, lineH: number, maxLines: number,
) {
    const chars = Array.from(text);
    const lines: string[] = [];
    let cur = '';
    for (const ch of chars) {
        const test = cur + ch;
        if (ctx.measureText(test).width > maxW && cur) {
            lines.push(cur); cur = ch;
            if (lines.length === maxLines) break;
        } else cur = test;
    }
    if (lines.length < maxLines && cur) lines.push(cur);
    lines.forEach((ln, i) => ctx.fillText(ln, cx, y + i * lineH));
}

const RENDERERS: Record<CardTemplate, (ctx: CanvasRenderingContext2D, t: CardTheme, d: ShareCardData) => Promise<void>> = {
    A: renderA, B: renderB, C: renderC, D: renderD,
};

/** 카드를 canvas에 그린다. 폰트 로딩을 기다린 뒤 렌더한다. */
export async function renderShareCard(
    canvas: HTMLCanvasElement, template: CardTemplate, theme: CardTheme, data: ShareCardData,
): Promise<void> {
    canvas.width = CARD_W;
    canvas.height = CARD_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // document.fonts.ready 는 "이미 요청된" 폰트만 기다린다 — 캔버스는 CSS처럼 폰트를
    // 자동 요청하지 않으므로, 실제로 그릴 굵기/크기로 명시 로드해야 첫 렌더에서
    // 폴백 세리프로 그려지는 걸 막을 수 있다.
    try {
        await Promise.all([
            (document as any).fonts?.load?.(`600 104px ${FONT_EDITORIAL}`),
            (document as any).fonts?.ready,
        ]);
    } catch { /* noop */ }
    ctx.clearRect(0, 0, CARD_W, CARD_H);
    ctx.textBaseline = 'alphabetic';
    await RENDERERS[template](ctx, theme, data);
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
    return new Promise((resolve) => {
        try {
            canvas.toBlob((b) => resolve(b), 'image/png', 0.95);
        } catch {
            resolve(null); // 이미지 CORS 오염 시 등
        }
    });
}
