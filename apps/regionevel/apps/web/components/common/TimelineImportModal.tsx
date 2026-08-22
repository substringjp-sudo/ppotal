"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Z } from "@/lib/layers";
import {
  TimelineIcon, CloseIcon, UploadIcon, WarningIcon
} from "@ppotal/ui";
import { Loader2, CheckCircle2, Footprints, TrainFront, Camera, BedDouble } from "lucide-react";
import type { VisitCategory } from "@regionevel/types";
import { VISIT_CONFIG } from "@regionevel/types";
import { useVisitStore } from "@/store/visitStore";
import { describeParseFailure, parseGoogleTimeline } from "@/lib/timelineImport/parseGoogleTimeline";
import { buildTimelineImportPreview } from "@/lib/timelineImport/classify";
import type { TimelineImportPreview } from "@/lib/timelineImport/types";

export interface TimelineImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Phase = "intro" | "analyzing" | "review" | "done" | "error";

const CATEGORY_ICON: Record<VisitCategory, React.ElementType> = {
  pass: Footprints,
  transit: TrainFront,
  visit: Camera,
  stay: BedDouble,
  residence: BedDouble,
};

async function readFilesAsJson(files: FileList): Promise<unknown[]> {
  const texts = await Promise.all(Array.from(files).map((f) => f.text()));
  return texts.map((t) => JSON.parse(t));
}

export const TimelineImportModal: React.FC<TimelineImportModalProps> = ({ isOpen, onClose }) => {
  const applyTimelineImport = useVisitStore((s) => s.applyTimelineImport);
  const [phase, setPhase] = useState<Phase>("intro");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<TimelineImportPreview | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totals = useMemo(() => {
    const t: Partial<Record<VisitCategory, number>> = {};
    if (!preview) return t;
    for (const r of preview.regions) {
      for (const [cat, count] of Object.entries(r.counts)) {
        t[cat as VisitCategory] = (t[cat as VisitCategory] ?? 0) + (count ?? 0);
      }
    }
    return t;
  }, [preview]);

  const runImport = useCallback(async (roots: unknown[]) => {
    setPhase("analyzing");
    setError(null);
    try {
      const parsed = parseGoogleTimeline(roots.length === 1 ? roots[0] : roots);
      if (parsed.stays.length === 0 && parsed.moves.length === 0) {
        // Say what was actually seen. "No records found" on its own gives the
        // user nothing to act on and tells us nothing about their file.
        console.warn("[Timeline] parsed nothing:", parsed.diagnostics, parsed.skipped);
        setError(describeParseFailure(parsed.diagnostics));
        setPhase("error");
        return;
      }
      const built = await buildTimelineImportPreview(parsed);
      if (built.regions.length === 0) {
        console.warn("[Timeline] no regions matched:", built.resolution, parsed.diagnostics);
        const { pointsTried, pointsResolved } = built.resolution;
        setError(
          pointsResolved === 0
            ? `방문 ${parsed.stays.length}건, 이동 ${parsed.moves.length}건을 읽었지만 ${pointsTried}개 지점이 모두 지역 경계 밖으로 나왔어요. 경계 데이터를 불러오지 못했을 수 있어요.`
            : `지점 ${pointsResolved}/${pointsTried}개는 찾았지만 반영할 지역이 없었어요.`,
        );
        setPhase("error");
        return;
      }
      setPreview(built);
      setPhase("review");
    } catch (e: any) {
      console.error("Timeline import failed:", e);
      const raw = String(e?.message ?? e ?? "");
      // Carry the real reason through. A bare "something went wrong" leaves
      // the user with nothing to try and us with nothing to go on.
      setError(
        raw.includes("JSON")
          ? "JSON 형식을 읽을 수 없어요. 올바른 Timeline.json 파일인지 확인해주세요."
          : /firestore|firebase|network|fetch/i.test(raw)
            ? "지역 경계 데이터를 불러오지 못했어요. 네트워크 상태를 확인하고 다시 시도해주세요."
            : `가져오는 중 오류가 발생했어요: ${raw.slice(0, 160)}`,
      );
      setPhase("error");
    }
  }, []);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      const roots = await readFilesAsJson(files);
      await runImport(roots);
    } catch {
      setError("JSON 파일을 읽을 수 없어요.");
      setPhase("error");
    }
  }, [runImport]);

  const handleConfirm = useCallback(() => {
    if (!preview || preview.applyList.length === 0) return;
    applyTimelineImport(preview.applyList);
    setPhase("done");
  }, [preview, applyTimelineImport]);

  const handleClose = useCallback(() => {
    onClose();
    setTimeout(() => {
      setPhase("intro");
      setError(null);
      setPreview(null);
    }, 200);
  }, [onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
      style={{ zIndex: Z.modal }}>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200/80 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <TimelineIcon className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
              Google 타임라인 가져오기
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="닫기"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {phase === "intro" && (
            <>
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  스마트폰에서 Timeline.json 내보내기
                </p>
                <ol className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed space-y-1.5 list-decimal list-inside">
                  <li>구글맵 앱 → 프로필 → <strong>내 위치기록(타임라인)</strong> 을 엽니다.</li>
                  <li><strong>위치기록 데이터 및 개인정보 보호</strong> → <strong>타임라인 데이터 내보내기</strong>를 선택합니다.</li>
                  <li>다운로드된 <code className="px-1 py-0.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">Timeline.json</code> 파일을 이 기기로 옮겨 아래에 첨부하세요.</li>
                </ol>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-1">
                  * 옛날에 받은 Google Takeout의 &quot;semantic location history&quot; 파일(월별 JSON)도 지원돼요.
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  * 위치 데이터는 이 브라우저 안에서만 처리되고 서버로 전송되지 않아요.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">판정 기준</p>
                <ul className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed space-y-1">
                  <li>🚗 <strong>통과</strong> — 그 지역에서 멈춘 기록 없이 지나감</li>
                  <li>🚉 <strong>환승</strong> — 30분 이하로 머무름</li>
                  <li>📸 <strong>방문</strong> — 30분 넘게 머무름</li>
                  <li>🛌 <strong>숙박</strong> — 새벽 2~6시 사이 그 지역에 있었음이 확인됨</li>
                </ul>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-1">
                  * 숙박 판정은 경도로 추정한 현지 시간을 기준으로 해요. 시간대 경계 근처에서는 오차가 있을 수 있어요.
                </p>
              </div>

              <label
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFiles(e.dataTransfer.files);
                }}
                className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 cursor-pointer transition-colors ${
                  dragOver ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30" : "border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                }`}
              >
                <UploadIcon className="w-7 h-7 text-blue-500" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Timeline.json 파일을 여기로 드래그하거나 클릭해서 선택
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </label>
            </>
          )}

          {phase === "analyzing" && (
            <div className="flex flex-col items-center justify-center gap-3 py-14">
              <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
              <p className="text-xs font-bold text-slate-500">타임라인을 지역별로 분석하는 중...</p>
            </div>
          )}

          {phase === "error" && (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <WarningIcon className="w-7 h-7 text-amber-500" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300 max-w-xs">{error}</p>
              <button
                onClick={() => setPhase("intro")}
                className="mt-1 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                다시 시도
              </button>
            </div>
          )}

          {phase === "review" && preview && (
            <>
              <div className="grid grid-cols-4 gap-2">
                {(["pass", "transit", "visit", "stay"] as VisitCategory[]).map((cat) => {
                  const Icon = CATEGORY_ICON[cat];
                  return (
                    <div key={cat} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-2.5 flex flex-col items-center gap-1">
                      <Icon className="w-4 h-4 text-slate-500" />
                      <span className="text-base font-black text-slate-800 dark:text-white">{totals[cat] ?? 0}</span>
                      <span className="text-[10px] font-bold text-slate-400">{VISIT_CONFIG[cat].label}</span>
                    </div>
                  );
                })}
              </div>

              <div className="max-h-[280px] overflow-y-auto space-y-1.5 pr-1">
                {preview.regions.map((r) => (
                  <div key={r.regionId} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{r.name}</p>
                      {r.ancestorNames.length > 0 && (
                        <p className="text-[10px] text-slate-400 truncate">{r.ancestorNames.join(" › ")}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {(Object.entries(r.counts) as [VisitCategory, number][]).map(([cat, count]) => (
                        <span
                          key={cat}
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                          style={{ color: VISIT_CONFIG[cat].color, backgroundColor: `${VISIT_CONFIG[cat].color}1a` }}
                          title={VISIT_CONFIG[cat].label}
                        >
                          {VISIT_CONFIG[cat].emoji} {count}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {Object.keys(preview.skipped).length > 0 && (
                <p className="text-[10px] text-slate-400">
                  일부 구간은 인식하지 못해 건너뛰었어요 ({Object.entries(preview.skipped).map(([k, v]) => `${k}: ${v}`).join(", ")}).
                </p>
              )}
            </>
          )}

          {phase === "done" && (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {preview?.regions.length ?? 0}개 지역의 방문 기록을 반영했어요!
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2 shrink-0">
          {phase === "intro" && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer"
            >
              파일 선택
            </button>
          )}
          {phase === "review" && (
            <>
              <button
                onClick={handleClose}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer"
              >
                {preview?.regions.length ?? 0}개 지역 반영하기
              </button>
            </>
          )}
          {(phase === "done" || phase === "error") && (
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer"
            >
              닫기
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
