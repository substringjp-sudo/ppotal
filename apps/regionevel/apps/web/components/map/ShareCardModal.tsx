"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Feature } from "geojson";
import { Share2, Download, Copy, X, Check, Loader2, Moon, Sun } from "lucide-react";
import type { Region, RegionScore, RegionVisit } from "@regionevel/types";
import { padId } from "@regionevel/utils";
import { Z } from "@/lib/layers";
import { SAFE_AREA, TAP_TARGET_CLASS, haptic } from "@/lib/mobile";
import { useIsPhone } from "@/lib/useIsPhone";
import {
  SHARE_BLOCKS, availableScopes, computeShareStats, resolveShareSubject, shareMessage,
  type ShareBlockId, type ShareScope, type ShareScopeKind,
} from "@/lib/shareCard";
import {
  CARD_SIZE, DARK_THEME, LIGHT_THEME, drawShareCard, type CardAspectRatio,
} from "@/lib/shareCardRender";

export interface ShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  regions: Region[];
  visits: RegionVisit[];
  scores: Record<string, RegionScore>;
  /** Boundaries currently loaded for the map, reused so the card needs no extra fetch. */
  features: Feature[];
  /** The region the user has tapped, if any. Preferred as the card's subject. */
  selectedRegionId: string | null;
  /** The region the map has drilled into. Used when nothing is tapped. */
  currentRegionId: string | null;
}

type Delivery = "share" | "copy" | "download";

const RATIOS: Array<{ id: CardAspectRatio; label: string; hint: string }> = [
  { id: "1:1", label: "1:1", hint: "지도만" },
  { id: "16:9", label: "16:9", hint: "가로" },
  { id: "9:16", label: "9:16", hint: "세로 · 스토리" },
];

const BLOCK_LABEL: Record<ShareBlockId, string> = {
  map: "지도",
  totals: "총계",
  categories: "카테고리",
  regions: "지역 순위",
};

export const ShareCardModal: React.FC<ShareCardModalProps> = ({
  isOpen, onClose, regions, visits, scores, features, selectedRegionId, currentRegionId,
}) => {
  const isPhone = useIsPhone();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [aspectRatio, setAspectRatio] = useState<CardAspectRatio>("9:16");
  const [scopeKind, setScopeKind] = useState<ShareScopeKind>("world");
  const [scopeId, setScopeId] = useState<string>("");
  const [dark, setDark] = useState(false);
  const [showBorders, setShowBorders] = useState(true);
  const [blocks, setBlocks] = useState<Set<ShareBlockId>>(
    () => new Set<ShareBlockId>(SHARE_BLOCKS),
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const regionsById = useMemo(() => {
    const m = new Map<string, Region>();
    for (const r of regions) m.set(padId(r.id), r);
    return m;
  }, [regions]);

  // Open on what the user is looking at, so the card does not have to be
  // aimed twice. See resolveShareSubject for which of the two wins.
  useEffect(() => {
    if (!isOpen) return;
    const subject = resolveShareSubject(selectedRegionId, currentRegionId, regionsById);
    if (subject) {
      setScopeKind(subject.admLevel === 0 ? "country" : "prefecture");
      setScopeId(padId(subject.id));
    } else {
      setScopeKind("world");
      setScopeId("");
    }
  }, [isOpen, selectedRegionId, currentRegionId, regionsById]);

  const choices = useMemo(() => availableScopes(regions, scores), [regions, scores]);

  const scope: ShareScope = useMemo(() => {
    if (scopeKind === "world") return { kind: "world", label: "전 세계" };
    const region = scopeId ? regionsById.get(padId(scopeId)) : null;
    return {
      kind: scopeKind,
      id: scopeId,
      label: region ? region.nameKo || region.name : "전 세계",
    };
  }, [scopeKind, scopeId, regionsById]);

  const scopeLabel = scope.label ?? "전 세계";
  const stats = useMemo(
    () => computeShareStats(scope, regions, visits, scores),
    [scope, regions, visits, scores],
  );

  /**
   * Only the boundaries under the card's subject. The map may be holding a
   * whole country's cities while the card is about one prefecture.
   */
  const scopedFeatures = useMemo(() => {
    if (scope.kind === "world" || !scope.id) return features;
    const target = padId(scope.id);
    const inScope = new Set<string>();
    const walk = (id: string) => {
      for (const r of regions) {
        if (padId(r.parentId) === id && !inScope.has(padId(r.id))) {
          inScope.add(padId(r.id));
          walk(padId(r.id));
        }
      }
    };
    walk(target);
    const matched = features.filter((f) => {
      const id = padId(f.properties?.id || f.properties?.shapeID);
      return id === target || inScope.has(id);
    });
    // A scope whose boundaries are not loaded would draw an empty frame;
    // showing what the map has is better than showing nothing.
    return matched.length > 0 ? matched : features;
  }, [features, regions, scope]);

  /**
   * Everything else the map has, drawn flat underneath.
   *
   * Without it a single region is a shape floating in an empty frame, with
   * nothing to say where on earth it is. The projector frames the subject, so
   * these only fill in around the edges.
   */
  const contextFeatures = useMemo(() => {
    if (scope.kind === "world" || scopedFeatures.length === features.length) return [];
    const inCard = new Set(
      scopedFeatures.map((f) => padId(f.properties?.id || f.properties?.shapeID)),
    );
    return features.filter(
      (f) => !inCard.has(padId(f.properties?.id || f.properties?.shapeID)),
    );
  }, [features, scopedFeatures, scope.kind]);

  const message = useMemo(() => shareMessage(scopeLabel, stats), [scopeLabel, stats]);
  const filename = useMemo(
    () => `Regionevel-${scopeLabel.replace(/[/\\?%*:|"<>]/g, "_")}-${new Date().toISOString().slice(0, 10)}.png`,
    [scopeLabel],
  );

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    drawShareCard(canvasRef.current, {
      aspectRatio,
      theme: dark ? DARK_THEME : LIGHT_THEME,
      blocks,
      scope,
      scopeLabel,
      stats,
      features: scopedFeatures,
      contextFeatures,
      scores,
      showBorders,
      footer: "rgnevel.pplaner.com",
    });
  }, [isOpen, aspectRatio, dark, blocks, scope, scopeLabel, stats, scopedFeatures, contextFeatures, scores, showBorders]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  const toBlob = useCallback(
    () => new Promise<Blob | null>((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) return resolve(null);
      canvas.toBlob(resolve, "image/png");
    }),
    [],
  );

  const deliver = useCallback(async (preferred: Delivery) => {
    setBusy(true);
    setNotice(null);
    try {
      const blob = await toBlob();
      if (!blob) return;
      const file = new File([blob], filename, { type: "image/png" });

      // On a phone this hands the image straight to the share sheet, which is
      // the only route that reaches Instagram or a messaging app at all.
      if (
        preferred === "share" && typeof navigator !== "undefined"
        && navigator.canShare?.({ files: [file] }) && navigator.share
      ) {
        await navigator.share({ files: [file], text: message });
        return;
      }

      if (preferred !== "download" && typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          setNotice("이미지를 복사했어요. 붙여넣기 하세요.");
          if (preferred === "share") {
            window.open(
              `https://x.com/intent/post?text=${encodeURIComponent(message)}`,
              "_blank", "noopener,noreferrer",
            );
          }
          return;
        } catch {
          // Denied or unsupported; fall through to a download.
        }
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      // A dismissed share sheet rejects with AbortError; that is not a failure.
      if ((error as { name?: string })?.name !== "AbortError") {
        console.error("[ShareCard] delivery failed", error);
        setNotice("이미지를 만들지 못했어요.");
      }
    } finally {
      setBusy(false);
    }
  }, [toBlob, filename, message]);

  const toggleBlock = (id: ShareBlockId) => {
    haptic("select");
    setBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const { w: cw, h: ch } = CARD_SIZE[aspectRatio];
  const previewAspect =
    aspectRatio === "1:1" ? "aspect-square max-w-[420px]"
      : aspectRatio === "16:9" ? "aspect-[16/9] max-w-[720px]"
        : "aspect-[9/16] max-w-[300px]";

  const scopeList = scopeKind === "country" ? choices.countries
    : scopeKind === "prefecture" ? choices.prefectures : [];

  const chip = (active: boolean) =>
    `${TAP_TARGET_CLASS} px-3 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 ${
      active
        ? "bg-blue-600 text-white shadow-sm"
        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
    }`;

  return createPortal(
    <div
      className={`fixed inset-0 flex ${isPhone ? "flex-col justify-end" : "items-center justify-center p-4 sm:p-6"}`}
      style={{ zIndex: Z.modal }}
    >
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div
        className={`relative bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col border border-slate-200/80 dark:border-slate-800 ${
          isPhone
            ? "rounded-t-3xl max-h-[92vh] animate-in slide-in-from-bottom duration-300"
            : "w-full max-w-3xl max-h-[92vh] rounded-3xl animate-in zoom-in-95 duration-200"
        }`}
        style={isPhone ? { paddingBottom: SAFE_AREA.bottom } : undefined}
        role="dialog"
        aria-modal="true"
        aria-label="공유 카드"
      >
        {isPhone && (
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
          </div>
        )}

        <div className="px-5 py-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 shrink-0">
          <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
            <Share2 className="w-4 h-4 text-blue-600" />
            공유 카드
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDark((d) => !d)}
              className={`${TAP_TARGET_CLASS} flex items-center justify-center rounded-full text-slate-400 active:bg-slate-100 dark:active:bg-slate-800`}
              aria-label={dark ? "밝은 카드로" : "어두운 카드로"}
              title={dark ? "밝은 카드로" : "어두운 카드로"}
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className={`${TAP_TARGET_CLASS} flex items-center justify-center rounded-full text-slate-400 active:bg-slate-100 dark:active:bg-slate-800`}
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-5">
          <div className="flex justify-center">
            <div className={`rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/5 w-full ${previewAspect}`}>
              <canvas
                ref={canvasRef}
                width={cw}
                height={ch}
                className="w-full h-full object-contain block"
              />
            </div>
          </div>

          {notice && (
            <p className="text-[11px] font-bold text-center text-emerald-600 dark:text-emerald-400">
              {notice}
            </p>
          )}

          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">카드 비율</p>
            <div className="grid grid-cols-3 gap-2">
              {RATIOS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => { haptic("select"); setAspectRatio(r.id); }}
                  className={`${chip(aspectRatio === r.id)} flex-col !gap-0`}
                >
                  <span>{r.label}</span>
                  <span className="text-[9px] font-semibold opacity-70">{r.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">무엇에 대한 카드인가요</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                ["world", "전 세계"],
                ["country", "국가"],
                ["prefecture", "지역"],
              ] as Array<[ShareScopeKind, string]>).map(([kind, label]) => {
                const disabled =
                  (kind === "country" && choices.countries.length === 0) ||
                  (kind === "prefecture" && choices.prefectures.length === 0);
                return (
                  <button
                    key={kind}
                    disabled={disabled}
                    onClick={() => {
                      haptic("select");
                      setScopeKind(kind);
                      if (kind === "world") setScopeId("");
                      else {
                        const list = kind === "country" ? choices.countries : choices.prefectures;
                        setScopeId(list[0] ? padId(list[0].id) : "");
                      }
                    }}
                    className={`${chip(scopeKind === kind)} disabled:opacity-40`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {scopeKind !== "world" && scopeList.length > 0 && (
              <select
                value={scopeId}
                onChange={(e) => setScopeId(e.target.value)}
                /* 16px so iOS does not zoom the page when this opens. */
                className="w-full min-h-[44px] px-3 text-base bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {scopeList.map((r) => (
                  <option key={r.id} value={padId(r.id)}>
                    {r.nameKo || r.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {aspectRatio !== "1:1" && (
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">담을 내용</p>
              <div className="grid grid-cols-4 gap-2">
                {SHARE_BLOCKS.map((id) => (
                  <button key={id} onClick={() => toggleBlock(id)} className={chip(blocks.has(id))}>
                    {BLOCK_LABEL[id]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => { haptic("select"); setShowBorders((b) => !b); }}
            className={`${chip(showBorders)} w-full`}
          >
            {showBorders && <Check className="w-3.5 h-3.5" />}
            경계선 표시
          </button>
        </div>

        <div className="p-4 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 shrink-0 grid grid-cols-3 gap-2">
          <button
            onClick={() => deliver("download")}
            disabled={busy}
            className={`${TAP_TARGET_CLASS} flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold disabled:opacity-50 active:scale-98 transition-transform`}
          >
            <Download className="w-4 h-4" />
            저장
          </button>
          <button
            onClick={() => deliver("copy")}
            disabled={busy}
            className={`${TAP_TARGET_CLASS} flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold disabled:opacity-50 active:scale-98 transition-transform`}
          >
            <Copy className="w-4 h-4" />
            복사
          </button>
          <button
            onClick={() => deliver("share")}
            disabled={busy}
            className={`${TAP_TARGET_CLASS} flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md disabled:opacity-50 active:scale-98 transition-transform`}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
            공유
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
