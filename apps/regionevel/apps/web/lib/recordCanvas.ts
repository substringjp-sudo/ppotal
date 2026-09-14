/**
 * Turning a canvas animation into a file.
 *
 * `MediaRecorder` over `captureStream` is the only route that does not need a
 * codec shipped with the app. What it produces depends on the browser — webm
 * on Chrome and Firefox, mp4 on recent Safari — so the caller is told which it
 * got rather than being promised one.
 */

const CANDIDATE_TYPES = [
  "video/mp4;codecs=avc1",
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

export interface RecordingResult {
  blob: Blob;
  /** "mp4" or "webm" — what the browser actually encoded. */
  extension: string;
}

export function isRecordingSupported(): boolean {
  return (
    typeof window !== "undefined"
    && typeof MediaRecorder !== "undefined"
    && typeof HTMLCanvasElement.prototype.captureStream === "function"
    && pickMimeType() !== null
  );
}

function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const type of CANDIDATE_TYPES) {
    if (MediaRecorder.isTypeSupported?.(type)) return type;
  }
  return null;
}

/**
 * Records `drawFrame(i)` over `frameCount` frames at `fps`.
 *
 * Frames are driven by this function rather than by the page's own playback
 * loop, so the recording runs at its true rate no matter what the preview is
 * doing — and a dropped repaint cannot lose a day out of the middle.
 */
export async function recordFrames(
  canvas: HTMLCanvasElement,
  frameCount: number,
  fps: number,
  drawFrame: (index: number) => void,
  options: { holdLastMs?: number; onProgress?: (done: number, total: number) => void } = {},
): Promise<RecordingResult> {
  const mimeType = pickMimeType();
  if (!mimeType) throw new Error("This browser cannot record a canvas.");
  if (frameCount <= 0) throw new Error("Nothing to record.");

  const stream = canvas.captureStream(0);
  const track = stream.getVideoTracks()[0] as (CanvasCaptureMediaStreamTrack | undefined);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  const done = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    recorder.onerror = () => reject(new Error("Recording failed."));
  });

  recorder.start();

  const frameDelay = 1000 / fps;
  for (let i = 0; i < frameCount; i++) {
    drawFrame(i);
    // requestFrame is what makes a 0-fps stream emit exactly the frames we
    // drew. Without it the recorder samples whenever it likes and the result
    // does not match the sequence.
    track?.requestFrame();
    options.onProgress?.(i + 1, frameCount);
    await new Promise((r) => setTimeout(r, frameDelay));
  }

  // Let the finished map sit on screen instead of cutting on the last step.
  const hold = options.holdLastMs ?? 1200;
  if (hold > 0) {
    const extra = Math.round(hold / frameDelay);
    for (let i = 0; i < extra; i++) {
      track?.requestFrame();
      await new Promise((r) => setTimeout(r, frameDelay));
    }
  }

  recorder.stop();
  stream.getTracks().forEach((t) => t.stop());

  const blob = await done;
  return { blob, extension: mimeType.includes("mp4") ? "mp4" : "webm" };
}
