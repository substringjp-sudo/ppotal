/**
 * 캔버스에 그려지는 되짚기를 그대로 영상 파일로 받는다.
 *
 * 브라우저가 인코딩을 대신 해 주므로 프레임을 직접 밀어 넣거나 색 공간을 바꿀
 * 일이 없다. 대신 **형식이 브라우저에 달려 있다**: 크롬·파이어폭스의 기본은
 * WebM 인데 X·인스타그램은 WebM 업로드를 받지 않는다. 그래서 mp4 를 먼저
 * 물어보고, 안 되면 WebM 으로 떨어진 뒤 그 사실을 화면에 알린다.
 */

export interface RecordingFormat {
    mimeType: string;
    extension: 'mp4' | 'webm';
    label: string;
    /**
     * H.264 라고 **확신할 수 있는지**.
     *
     * 확장자만으로는 모자란다. 크롬에 `video/mp4` 로 부탁하면 컨테이너는 mp4 인데
     * 안은 VP9 인 파일이 나온다(호환 브랜드에 `vp09` 가 찍힌다). 그런 파일은
     * X·인스타그램이 WebM 과 마찬가지로 받지 않는다. 코덱을 대놓고 지정해서
     * 받아들여졌을 때만 참이다.
     */
    h264: boolean;
}

/** 위에서부터 물어본다. 앞쪽일수록 다른 서비스에 올리기 쉽다. */
const CANDIDATES: RecordingFormat[] = [
    { mimeType: 'video/mp4;codecs=avc1.42E01E', extension: 'mp4', label: 'MP4 (H.264)', h264: true },
    { mimeType: 'video/mp4;codecs=avc1.4D401E', extension: 'mp4', label: 'MP4 (H.264)', h264: true },
    { mimeType: 'video/mp4', extension: 'mp4', label: 'MP4', h264: false },
    { mimeType: 'video/webm;codecs=vp9', extension: 'webm', label: 'WebM', h264: false },
    { mimeType: 'video/webm;codecs=vp8', extension: 'webm', label: 'WebM', h264: false },
    { mimeType: 'video/webm', extension: 'webm', label: 'WebM', h264: false }
];

export function pickRecordingFormat(): RecordingFormat | null {
    if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return null;
    for (const candidate of CANDIDATES) {
        try {
            if (MediaRecorder.isTypeSupported(candidate.mimeType)) return candidate;
        } catch {
            // isTypeSupported 가 없는 구형 구현. 다음 후보로 넘어간다.
        }
    }
    return null;
}

export interface Recording {
    /**
     * 인코더가 실제로 돌기 시작할 때까지.
     *
     * `start()` 를 부른 것과 인코더가 준비되는 것은 다르다. 헤드리스 크롬에서
     * mp4 인코더가 **1.9초 뒤에야** 시작하는 것을 확인했다. 그 사이에 짧은
     * 애니메이션이 끝나 버리면 빈 파일이 나온다. 그래서 여기서 기다린 뒤에
     * 애니메이션을 시작한다.
     */
    ready: Promise<void>;
    /** 녹화를 끝내고 파일을 받는다. */
    stop: () => Promise<Blob>;
    /** 결과를 버리고 끝낸다. */
    cancel: () => void;
}

/** 인코더가 준비되기를 기다리는 한도. */
const READY_TIMEOUT_MS = 20_000;

export function startRecording(
    canvas: HTMLCanvasElement,
    format: RecordingFormat,
    fps = 30,
    videoBitsPerSecond = 6_000_000
): Recording {
    const stream = canvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, { mimeType: format.mimeType, videoBitsPerSecond });
    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) chunks.push(event.data);
    };
    const ready = new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('인코더가 시작되지 않았습니다.')), READY_TIMEOUT_MS);
        recorder.addEventListener('start', () => {
            clearTimeout(timer);
            resolve();
        }, { once: true });
        recorder.addEventListener('error', () => {
            clearTimeout(timer);
            reject(new Error('녹화를 시작하지 못했습니다.'));
        }, { once: true });
    });

    // 조각을 주기적으로 받아 둔다. 마지막에 한 번에 받으면 긴 영상에서 통째로 잃을 수 있다.
    recorder.start(200);

    const stopTracks = () => stream.getTracks().forEach(track => track.stop());
    let settled = false;

    return {
        ready,
        stop() {
            return new Promise<Blob>((resolve, reject) => {
                if (settled) {
                    reject(new Error('이미 끝난 녹화입니다.'));
                    return;
                }
                settled = true;

                if (recorder.state === 'inactive') {
                    stopTracks();
                    resolve(new Blob(chunks, { type: format.mimeType }));
                    return;
                }
                recorder.onerror = () => {
                    stopTracks();
                    reject(new Error('녹화 중 오류가 났습니다.'));
                };
                recorder.onstop = () => {
                    stopTracks();
                    resolve(new Blob(chunks, { type: format.mimeType }));
                };
                recorder.stop();
            });
        },
        cancel() {
            settled = true;
            try {
                if (recorder.state !== 'inactive') recorder.stop();
            } finally {
                stopTracks();
            }
        }
    };
}

export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // 즉시 해제하면 일부 브라우저에서 저장이 끊긴다.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
