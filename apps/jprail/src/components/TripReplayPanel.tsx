"use client";

import React from 'react';
import { RotateCcw, Film } from 'lucide-react';
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

/** 세로 화면 기준. 일본 열도가 가로보다 세로로 길어 세로 프레임에 잘 들어간다. */
export const VIDEO_WIDTH = 720;
export const VIDEO_HEIGHT = 1280;
export const VIDEO_FPS = 30;

type RecordStatus = 'idle' | 'preparing' | 'recording' | 'done';

const TEXT = {
    ko: {
        strokeSeconds: (seconds: string) => `한 획 ${seconds}초`,
        totalLength: (length: string) => `전체 ${length}`,
        wholeJapan: '전국',
        recordedRange: '기록 범위',
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
    },
    en: {
        strokeSeconds: (seconds: string) => `${seconds}s per stroke`,
        totalLength: (length: string) => `${length} total`,
        wholeJapan: 'All Japan',
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
    },
    ja: {
        strokeSeconds: (seconds: string) => `1本あたり${seconds}秒`,
        totalLength: (length: string) => `全体 ${length}`,
        wholeJapan: '全国',
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
    }
};

/** `0:21` 처럼. 언어를 타지 않는 표기라 번역이 필요 없다. */
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
}

/**
 * 주행 애니메이션 미리보기와 영상 저장.
 *
 * **미리 보는 캔버스가 곧 녹화되는 캔버스다.** 화면 크기와 무관하게 실제 픽셀은
 * 720×1280 으로 잡아 두고 CSS 로 줄여 보여 주므로, 보이는 그대로가 저장된다.
 */
const TripReplayPanel: React.FC<TripReplayPanelProps> = ({ trips, landRings, railLines }) => {
    const { language } = useI18n();
    const t = TEXT[language as keyof typeof TEXT] || TEXT.en;

    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
    const recordingRef = React.useRef<Recording | null>(null);
    const formatRef = React.useRef<RecordingFormat | null>(null);

    const [strokeMs, setStrokeMs] = React.useState<number>(DEFAULT_STROKE_MS);
    const [wholeJapan, setWholeJapan] = React.useState(true);
    const [restartKey, setRestartKey] = React.useState(0);
    const [status, setStatus] = React.useState<RecordStatus>('idle');
    const [progress, setProgress] = React.useState(0);
    const [message, setMessage] = React.useState<string | null>(null);
    const [savedFormat, setSavedFormat] = React.useState<RecordingFormat | null>(null);

    // 좌표는 한 번만 재고, 속도만 갈아 끼운다.
    const base = React.useMemo(() => TripAnimation.build(trips), [trips]);
    const animation = React.useMemo(() => base.withStrokeDuration(strokeMs), [base, strokeMs]);

    const statusRef = React.useRef(status);
    React.useEffect(() => { statusRef.current = status; }, [status]);
    const totalRef = React.useRef(animation.totalDurationMs);
    React.useEffect(() => { totalRef.current = animation.totalDurationMs; }, [animation]);

    // 창을 닫거나 탭을 바꾸면 만들던 영상은 버린다.
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
            // 빈 파일을 "저장했습니다" 라고 말하지 않는다. 인코더가 제때 못 돌면
            // 실제로 0바이트가 나온다.
            if (blob.size === 0) {
                setMessage(t.videoFailed);
                setStatus('idle');
                return;
            }
            const extension = formatRef.current?.extension ?? 'webm';
            downloadBlob(blob, `jprail-replay-${new Date().toISOString().slice(0, 10)}.${extension}`);
            setSavedFormat(formatRef.current);
            setProgress(100);
            setStatus('done');
        }).catch(() => {
            setMessage(t.videoFailed);
            setStatus('idle');
        });
    }, [t]);

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

        // 먼저 첫 장면으로 되감아 멈춰 세운다. 인코더가 준비되는 동안 지도가
        // 흘러가면 영상이 중간부터 시작한다.
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

        // **인코더가 실제로 돌기 시작한 뒤에** 애니메이션을 튼다. start() 를 부른
        // 것과 인코더가 준비된 것은 다르다 — 짧은 애니메이션은 그 사이에 끝나
        // 버려서 빈 파일이 나온다.
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

    return (
        <div className="p-6">
            <div
                className="mx-auto mb-4 rounded-2xl overflow-hidden shadow-inner bg-[#080D16]"
                style={{ height: 340, aspectRatio: `${VIDEO_WIDTH} / ${VIDEO_HEIGHT}` }}
            >
                <TripReplayCanvas
                    animation={animation}
                    landRings={landRings}
                    railLines={railLines}
                    wholeJapan={wholeJapan}
                    playing={status !== 'done' && status !== 'preparing'}
                    loop={status !== 'recording'}
                    width={VIDEO_WIDTH}
                    height={VIDEO_HEIGHT}
                    canvasRef={canvasRef}
                    restartKey={restartKey}
                    onFrame={handleFrame}
                    onFinished={handleFinished}
                />
            </div>

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

            <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-slate-400 dark:text-slate-500">
                    {VIDEO_WIDTH}×{VIDEO_HEIGHT} · {VIDEO_FPS}fps
                </span>
                <button
                    onClick={() => setWholeJapan(value => !value)}
                    disabled={busy}
                    className="text-xs font-bold text-primary hover:underline disabled:opacity-40 disabled:no-underline"
                >
                    {wholeJapan ? t.wholeJapan : t.recordedRange}
                </button>
            </div>

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                    onClick={replayAgain}
                    disabled={busy}
                    className="flex items-center justify-center gap-3 py-4 px-6 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-2xl transition-all disabled:opacity-40"
                >
                    <RotateCcw className="w-5 h-5" />
                    {t.replayAgain}
                </button>

                <button
                    onClick={beginRecording}
                    disabled={busy}
                    className="flex items-center justify-center gap-3 py-4 px-6 bg-primary hover:brightness-110 text-white font-bold rounded-2xl transition-all shadow-lg disabled:opacity-60"
                >
                    <Film className="w-5 h-5" />
                    {status === 'preparing' ? t.preparingVideo : recording ? t.savingVideo(progress) : t.saveVideo}
                </button>
            </div>

            <p className="mt-4 text-xs text-slate-400 dark:text-slate-500 text-center leading-relaxed">
                {t.videoHint}
            </p>
        </div>
    );
};

export default TripReplayPanel;
