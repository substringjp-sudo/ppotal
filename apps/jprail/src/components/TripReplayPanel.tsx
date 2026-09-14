"use client";

import React from 'react';
import { RotateCcw, Film, Palette } from 'lucide-react';
import { useI18n } from '../lib/i18n-context';
import TripReplayCanvas from './TripReplayCanvas';
import {
    DEFAULT_STROKE_MS,
    MAX_STROKE_MS,
    MIN_STROKE_MS,
    TripAnimation,
    type AnimationFrame,
    type ReplayTrip
} from '../lib/tripAnimation';
import {
    downloadBlob,
    pickRecordingFormat,
    startRecording,
    type Recording,
    type RecordingFormat
} from '../lib/replayRecorder';
import {
    REPLAY_THEMES,
    resolveReplayTheme,
    type ReplayTheme
} from '../lib/replayRenderer';

export type ReplayAspectRatio = '9:16' | '1:1' | '16:9';

export const REPLAY_RESOLUTIONS: Record<ReplayAspectRatio, { width: number; height: number }> = {
    '9:16': { width: 720, height: 1280 },
    '1:1': { width: 1080, height: 1080 },
    '16:9': { width: 1280, height: 720 },
};

export const VIDEO_FPS = 30;

type RecordStatus = 'idle' | 'preparing' | 'recording' | 'done';

const TEXT = {
    ko: {
        strokeSeconds: (seconds: string) => `한 획 ${seconds}초`,
        totalLength: (length: string) => `전체 ${length}`,
        wholeJapan: '전국 (오키나와 포함)',
        recordedRange: '내 기록 범위',
        replayAgain: '처음부터 다시',
        saveVideo: '영상으로 저장하기',
        preparingVideo: '준비하는 중…',
        savingVideo: (percent: number) => `영상 만드는 중 ${percent}%`,
        videoSaved: '영상을 저장했습니다.',
        noTrips: '되짚을 주행 기록이 아직 없습니다. 지도에서 역과 역을 끌어 경로를 기록해 보세요.',
        videoUnsupported: '이 브라우저는 캔버스 영상 저장을 지원하지 않습니다. 크롬이나 엣지에서 다시 시도해 주세요.',
        formatNotice: (label: string) => `${label} 으로 저장되었습니다. X·인스타그램은 이 형식을 받지 않을 수 있어 변환이 필요할 수 있습니다.`,
        videoFailed: '영상을 만들지 못했습니다.',
        videoHint: '보이는 그대로 저장됩니다. 만드는 동안 이 창을 열어 두세요.',
        aspectRatio: '영상 비율',
        ratio916: '9:16 (세로)',
        ratio11: '1:1 (정사각)',
        ratio169: '16:9 (가로)',
        bgTheme: '배경 테마',
        customColor: '직접 선택',
    },
    en: {
        strokeSeconds: (seconds: string) => `${seconds}s per stroke`,
        totalLength: (length: string) => `${length} total`,
        wholeJapan: 'All Japan (with Okinawa)',
        recordedRange: 'My records',
        replayAgain: 'Replay from start',
        saveVideo: 'Save as Video',
        preparingVideo: 'Preparing…',
        savingVideo: (percent: number) => `Rendering ${percent}%`,
        videoSaved: 'Video saved.',
        noTrips: 'No journeys to replay yet. Drag between stations on the map to record one.',
        videoUnsupported: 'This browser cannot record the canvas. Please try Chrome or Edge.',
        formatNotice: (label: string) => `Saved as ${label}. X and Instagram may not accept this format, so conversion may be needed.`,
        videoFailed: 'Could not create the video.',
        videoHint: 'Saved exactly as shown. Keep this window open while it renders.',
        aspectRatio: 'Aspect Ratio',
        ratio916: '9:16 (Portrait)',
        ratio11: '1:1 (Square)',
        ratio169: '16:9 (Landscape)',
        bgTheme: 'Background Theme',
        customColor: 'Custom Color',
    },
    ja: {
        strokeSeconds: (seconds: string) => `1本あたり${seconds}秒`,
        totalLength: (length: string) => `全体 ${length}`,
        wholeJapan: '全国 (沖縄含む)',
        recordedRange: '記録範囲',
        replayAgain: '最初から再生',
        saveVideo: '動画として保存',
        preparingVideo: '準備中…',
        savingVideo: (percent: number) => `動画を作成中 ${percent}%`,
        videoSaved: '動画を保存しました。',
        noTrips: '振り返る走行記録がまだありません。地図上で駅から駅へドラッグして記録してみてください。',
        videoUnsupported: 'このブラウザはキャンバスの録画に対応していません。ChromeまたはEdgeでお試しください。',
        formatNotice: (label: string) => `${label}として保存されました。XやInstagramはこの形式に対応していない場合があり、変換が必要なことがあります。`,
        videoFailed: '動画を作成できませんでした。',
        videoHint: '表示されているとおりに保存されます。作成中はこの画面を開いたままにしてください。',
        aspectRatio: '動画比率',
        ratio916: '9:16 (縦長)',
        ratio11: '1:1 (正方形)',
        ratio169: '16:9 (横長)',
        bgTheme: '背景テーマ',
        customColor: 'カスタム色',
    }
};

/** `0:21` 처럼 포맷 */
function formatClock(ms: number): string {
    const total = Math.max(0, Math.round(ms / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export interface TripReplayPanelProps {
    trips: ReplayTrip[];
    landRings: [number, number][][];
    railLines: [number, number][][];
    onAspectRatioChange?: (ratio: ReplayAspectRatio) => void;
}

/**
 * 주행 애니메이션 미리보기와 영상 저장.
 * 비율(9:16, 1:1, 16:9) 및 배경색/테마 커스터마이징 지원.
 */
const TripReplayPanel: React.FC<TripReplayPanelProps> = ({
    trips,
    landRings,
    railLines,
    onAspectRatioChange
}) => {
    const { language } = useI18n();
    const t = TEXT[language as keyof typeof TEXT] || TEXT.en;

    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
    const recordingRef = React.useRef<Recording | null>(null);
    const formatRef = React.useRef<RecordingFormat | null>(null);

    const [aspectRatio, setAspectRatio] = React.useState<ReplayAspectRatio>('9:16');
    const [themeId, setThemeId] = React.useState<string>('dark');
    const [customSeaColor, setCustomSeaColor] = React.useState<string>('#080D16');

    const [strokeMs, setStrokeMs] = React.useState<number>(DEFAULT_STROKE_MS);
    const [wholeJapan, setWholeJapan] = React.useState(true);
    const [restartKey, setRestartKey] = React.useState(0);
    const [status, setStatus] = React.useState<RecordStatus>('idle');
    const [progress, setProgress] = React.useState(0);
    const [message, setMessage] = React.useState<string | null>(null);
    const [savedFormat, setSavedFormat] = React.useState<RecordingFormat | null>(null);

    const activeResolution = REPLAY_RESOLUTIONS[aspectRatio];
    const activeTheme: ReplayTheme = React.useMemo(
        () => resolveReplayTheme(themeId, customSeaColor),
        [themeId, customSeaColor]
    );

    const handleRatioChange = (ratio: ReplayAspectRatio) => {
        setAspectRatio(ratio);
        onAspectRatioChange?.(ratio);
    };

    // 좌표는 한 번만 계산, 속도만 조절
    const base = React.useMemo(() => TripAnimation.build(trips), [trips]);
    const animation = React.useMemo(() => base.withStrokeDuration(strokeMs), [base, strokeMs]);

    const statusRef = React.useRef(status);
    React.useEffect(() => { statusRef.current = status; }, [status]);
    const totalRef = React.useRef(animation.totalDurationMs);
    React.useEffect(() => { totalRef.current = animation.totalDurationMs; }, [animation]);

    React.useEffect(() => () => {
        recordingRef.current?.cancel();
        recordingRef.current = null;
    }, []);

    const handleFrame = React.useCallback((frame: AnimationFrame) => {
        if (statusRef.current !== 'recording') return;
        const total = totalRef.current;
        const next = total > 0 ? Math.min(100, Math.round((frame.elapsedMs / total) * 100)) : 0;
        setProgress(previous => (previous === next ? previous : next));
    }, []);

    const handleFinished = React.useCallback(() => {
        const active = recordingRef.current;
        if (!active) return;
        recordingRef.current = null;
        active.stop().then(blob => {
            if (blob.size === 0) {
                setMessage(t.videoFailed);
                setStatus('idle');
                return;
            }
            const extension = formatRef.current?.extension ?? 'webm';
            downloadBlob(blob, `jprail-replay-${aspectRatio.replace(':', '-')}-${new Date().toISOString().slice(0, 10)}.${extension}`);
            setSavedFormat(formatRef.current);
            setProgress(100);
            setStatus('done');
        }).catch(() => {
            setMessage(t.videoFailed);
            setStatus('idle');
        });
    }, [t, aspectRatio]);

    const beginRecording = React.useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const format = pickRecordingFormat();
        if (!format) {
            setMessage(t.videoUnsupported);
            return;
        }
        setMessage(null);
        setSavedFormat(null);
        setProgress(0);
        formatRef.current = format;

        setRestartKey(key => key + 1);
        setStatus('preparing');

        let active: Recording;
        try {
            active = startRecording(canvas, format, VIDEO_FPS);
        } catch {
            setMessage(t.videoFailed);
            setStatus('idle');
            return;
        }
        recordingRef.current = active;

        active.ready.then(() => {
            if (recordingRef.current !== active) return;
            setStatus('recording');
        }).catch(() => {
            recordingRef.current = null;
            active.cancel();
            setMessage(t.videoFailed);
            setStatus('idle');
        });
    }, [t]);

    const replayAgain = React.useCallback(() => {
        setStatus('idle');
        setProgress(0);
        setRestartKey(key => key + 1);
    }, []);

    if (base.isEmpty) {
        return (
            <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {t.noTrips}
            </div>
        );
    }

    const recording = status === 'recording';
    const busy = recording || status === 'preparing';

    // 비율에 따른 미리보기 컨테이너 크기
    const previewHeight = aspectRatio === '16:9' ? 240 : aspectRatio === '1:1' ? 300 : 340;
    const previewAspect = aspectRatio === '16:9' ? '16 / 9' : aspectRatio === '1:1' ? '1 / 1' : '720 / 1280';

    return (
        <div className="p-6">
            {/* 비율 선택 탭 */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        {t.aspectRatio}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                        {activeResolution.width}×{activeResolution.height}
                    </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
                    {(['9:16', '1:1', '16:9'] as ReplayAspectRatio[]).map(ratio => (
                        <button
                            key={ratio}
                            onClick={() => handleRatioChange(ratio)}
                            disabled={busy}
                            className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                aspectRatio === ratio
                                    ? 'bg-white dark:bg-slate-900 text-primary shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                        >
                            {ratio === '9:16' ? t.ratio916 : ratio === '1:1' ? t.ratio11 : t.ratio169}
                        </button>
                    ))}
                </div>
            </div>

            {/* 배경색 및 테마 선택 */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        {t.bgTheme}
                    </span>
                    <span className="text-[11px] text-slate-400">
                        {activeTheme.labelKo || activeTheme.id}
                    </span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                    {Object.values(REPLAY_THEMES).map(thm => (
                        <button
                            key={thm.id}
                            onClick={() => setThemeId(thm.id)}
                            disabled={busy}
                            title={language === 'ko' ? thm.labelKo : language === 'ja' ? thm.labelJa : thm.labelEn}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                themeId === thm.id
                                    ? 'border-primary ring-2 ring-primary/30 bg-primary/5 text-primary'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-300'
                            }`}
                        >
                            <span
                                className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-sm shrink-0"
                                style={{ backgroundColor: thm.sea }}
                            />
                            <span className="whitespace-nowrap">
                                {language === 'ko' ? thm.labelKo : language === 'ja' ? thm.labelJa : thm.labelEn}
                            </span>
                        </button>
                    ))}

                    {/* 커스텀 컬러 피커 */}
                    <label
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer relative ${
                            themeId === 'custom'
                                ? 'border-primary ring-2 ring-primary/30 bg-primary/5 text-primary'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-300'
                        }`}
                        title={t.customColor}
                    >
                        <input
                            type="color"
                            value={customSeaColor}
                            disabled={busy}
                            onChange={(e) => {
                                setCustomSeaColor(e.target.value);
                                setThemeId('custom');
                            }}
                            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                        />
                        <Palette className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="whitespace-nowrap">{t.customColor}</span>
                    </label>
                </div>
            </div>

            {/* 캔버스 미리보기 컨테이너 */}
            <div
                className="mx-auto mb-4 rounded-2xl overflow-hidden shadow-inner border border-slate-800/10 dark:border-white/5 transition-all duration-300 flex items-center justify-center"
                style={{
                    height: previewHeight,
                    aspectRatio: previewAspect,
                    backgroundColor: activeTheme.sea
                }}
            >
                <TripReplayCanvas
                    animation={animation}
                    landRings={landRings}
                    railLines={railLines}
                    wholeJapan={wholeJapan}
                    playing={status !== 'done' && status !== 'preparing'}
                    loop={status !== 'recording'}
                    width={activeResolution.width}
                    height={activeResolution.height}
                    theme={activeTheme}
                    canvasRef={canvasRef}
                    restartKey={restartKey}
                    onFrame={handleFrame}
                    onFinished={handleFinished}
                />
            </div>

            {/* 슬라이더: 속도 조절 */}
            <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {t.strokeSeconds((strokeMs / 1000).toFixed(2))}
                </span>
                <input
                    type="range"
                    min={MIN_STROKE_MS}
                    max={MAX_STROKE_MS}
                    step={10}
                    value={strokeMs}
                    disabled={busy}
                    onChange={event => setStrokeMs(Number(event.target.value))}
                    className="flex-1 accent-primary disabled:opacity-40"
                    aria-label={t.strokeSeconds((strokeMs / 1000).toFixed(2))}
                />
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {t.totalLength(formatClock(animation.totalDurationMs))}
                </span>
            </div>

            {/* 프레임 정보 및 범위 토글 */}
            <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-slate-400 dark:text-slate-500">
                    {activeResolution.width}×{activeResolution.height} · {VIDEO_FPS}fps
                </span>
                <button
                    onClick={() => setWholeJapan(value => !value)}
                    disabled={busy}
                    className="text-xs font-bold text-primary hover:underline disabled:opacity-40 disabled:no-underline cursor-pointer"
                >
                    {wholeJapan ? t.wholeJapan : t.recordedRange}
                </button>
            </div>

            {/* 진행 바 */}
            {busy && (
                <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 mb-3 overflow-hidden">
                    <div
                        className="h-full bg-primary transition-[width] duration-200"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}

            {message && (
                <p className="text-xs text-rose-500 mb-3 leading-relaxed">{message}</p>
            )}

            {status === 'done' && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-3 leading-relaxed">
                    {t.videoSaved}
                    {savedFormat && !savedFormat.h264 ? ` ${t.formatNotice(savedFormat.label)}` : ''}
                </p>
            )}

            {/* 제어 버튼 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                    onClick={replayAgain}
                    disabled={busy}
                    className="flex items-center justify-center gap-3 py-3.5 px-6 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-2xl transition-all disabled:opacity-40 cursor-pointer"
                >
                    <RotateCcw className="w-4 h-4" />
                    {t.replayAgain}
                </button>

                <button
                    onClick={beginRecording}
                    disabled={busy}
                    className="flex items-center justify-center gap-3 py-3.5 px-6 bg-primary hover:brightness-110 text-white font-bold rounded-2xl transition-all shadow-lg disabled:opacity-60 cursor-pointer"
                >
                    <Film className="w-4 h-4" />
                    {status === 'preparing' ? t.preparingVideo : recording ? t.savingVideo(progress) : t.saveVideo}
                </button>
            </div>

            <p className="mt-3.5 text-[11px] text-slate-400 dark:text-slate-500 text-center leading-relaxed">
                {t.videoHint}
            </p>
        </div>
    );
};

export default TripReplayPanel;
