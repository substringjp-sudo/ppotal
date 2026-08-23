"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Feature } from "geojson";
import {
  ShareIcon, DownloadIcon, CopyIcon, CloseIcon, CheckIcon, SunIcon, MoonIcon
} from "@ppotal/ui";
import { Share2, Download, Copy, X, Check, ChevronDown, Sparkles, MapPin, Globe, Building2, Map as MapIcon, Loader2 } from "lucide-react";
import type { Region, RegionScore, RegionVisit } from "@regionevel/types";
import { padId } from "@regionevel/utils";
import { Z } from "@/lib/layers";
import { SAFE_AREA, TAP_TARGET_CLASS, haptic } from "@/lib/mobile";
import { useIsPhone } from "@/lib/useIsPhone";
import {
  SHARE_BLOCKS, computeShareStats, resolveShareSubject, shareMessage,
  type ShareBlockId, type ShareScope, type ShareScopeKind,
} from "@/lib/shareCard";
import {
  CARD_SIZE, DARK_THEME, LIGHT_THEME, drawShareCard, type CardAspectRatio,
} from "@/lib/shareCardRender";
import { fetchCountryGeometries } from "@/lib/regions";

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
  isOpen,
  onClose,
  regions,
  visits,
  scores,
  features: initialFeatures,
  selectedRegionId,
  currentRegionId,
}) => {
  const isPhone = useIsPhone();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [aspectRatio, setAspectRatio] = useState<CardAspectRatio>("9:16");
  const [scopeMode, setScopeMode] = useState<"world" | "country">("world");
  const [selectedCountryId, setSelectedCountryId] = useState<string>("JPN");
  const [selectedSubRegionId, setSelectedSubRegionId] = useState<string>("ALL");
  const [detailLevel, setDetailLevel] = useState<"prefecture" | "city">("prefecture");

  const [dark, setDark] = useState(false);
  const [showBorders, setShowBorders] = useState(true);
  const [blocks, setBlocks] = useState<Set<ShareBlockId>>(
    () => new Set<ShareBlockId>(SHARE_BLOCKS),
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingGeometries, setLoadingGeometries] = useState(false);
  const [dynamicFeatures, setDynamicFeatures] = useState<Feature[] | null>(null);

  const regionsById = useMemo(() => {
    const m = new Map<string, Region>();
    for (const r of regions) m.set(padId(r.id), r);
    return m;
  }, [regions]);

  // Available countries (admLevel === 0)
  const countryList = useMemo(() => {
    const list = regions.filter((r) => r.admLevel === 0);
    return list.sort((a, b) => {
      const aScore = scores[padId(a.id)]?.totalScore ?? 0;
      const bScore = scores[padId(b.id)]?.totalScore ?? 0;
      if (bScore !== aScore) return bScore - aScore;
      const aName = a.nameKo || a.name || a.id;
      const bName = b.nameKo || b.name || b.id;
      return aName.localeCompare(bName);
    });
  }, [regions, scores]);

  // Initial subject resolution on open
  useEffect(() => {
    if (!isOpen) return;
    const subject = resolveShareSubject(selectedRegionId, currentRegionId, regionsById);
    if (subject) {
      if (subject.admLevel === 0) {
        setScopeMode("country");
        setSelectedCountryId(padId(subject.id));
        setSelectedSubRegionId("ALL");
      } else {
        setScopeMode("country");
        // Find ancestor country
        let curr: Region | null = subject;
        while (curr && curr.admLevel > 0) {
          curr = curr.parentId ? regionsById.get(padId(curr.parentId)) ?? null : null;
        }
        if (curr) {
          setSelectedCountryId(padId(curr.id));
          setSelectedSubRegionId(padId(subject.id));
        } else {
          setSelectedCountryId(padId(subject.id));
          setSelectedSubRegionId("ALL");
        }
      }
    } else {
      setScopeMode("world");
    }
  }, [isOpen, selectedRegionId, currentRegionId, regionsById]);

  // Sub-regions under the selected country (prefectures)
  const currentCountry = useMemo(() => {
    return regionsById.get(padId(selectedCountryId)) ?? null;
  }, [selectedCountryId, regionsById]);

  const subRegionList = useMemo(() => {
    if (scopeMode !== "country" || !selectedCountryId) return [];
    const countryPadded = padId(selectedCountryId);
    return regions.filter((r) => r.admLevel === 1 && padId(r.parentId) === countryPadded)
      .sort((a, b) => {
        const aScore = scores[padId(a.id)]?.totalScore ?? 0;
        const bScore = scores[padId(b.id)]?.totalScore ?? 0;
        if (bScore !== aScore) return bScore - aScore;
        const aName = a.nameKo || a.name || a.id;
        const bName = b.nameKo || b.name || b.id;
        return aName.localeCompare(bName);
      });
  }, [scopeMode, selectedCountryId, regions, scores]);

  // Fetch detail geometries when country / subRegion / detailLevel change
  useEffect(() => {
    if (!isOpen) return;
    if (scopeMode === "world") {
      setDynamicFeatures(null);
      return;
    }

    const iso3 = currentCountry?.iso3;
    if (!iso3) {
      setDynamicFeatures(null);
      return;
    }

    let active = true;
    setLoadingGeometries(true);

    // If specific prefecture is selected, always fetch level 2 (city level) geometries so internal cities render clearly!
    const levelNum = selectedSubRegionId !== "ALL" ? 2 : (detailLevel === "city" ? 2 : 1);
    fetchCountryGeometries(iso3, levelNum)
      .then((feats) => {
        if (!active) return;
        if (feats && feats.length > 0) {
          setDynamicFeatures(feats);
        } else {
          setDynamicFeatures(null);
        }
      })
      .catch((err) => {
        console.warn("[ShareCardModal] fetchCountryGeometries failed", err);
        if (active) setDynamicFeatures(null);
      })
      .finally(() => {
        if (active) setLoadingGeometries(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, scopeMode, currentCountry, selectedSubRegionId, detailLevel]);

  const activeFeatures = dynamicFeatures && dynamicFeatures.length > 0 ? dynamicFeatures : initialFeatures;

  // Active ShareScope computation
  const scope: ShareScope = useMemo(() => {
    if (scopeMode === "world") {
      return { kind: "world", label: "전 세계" };
    }

    if (selectedSubRegionId !== "ALL") {
      const sub = regionsById.get(padId(selectedSubRegionId));
      return {
        kind: "prefecture",
        id: selectedSubRegionId,
        label: sub ? sub.nameKo || sub.name : currentCountry?.nameKo || currentCountry?.name || "선택된 지역",
      };
    }

    return {
      kind: "country",
      id: selectedCountryId,
      label: currentCountry ? currentCountry.nameKo || currentCountry.name : "선택된 국가",
    };
  }, [scopeMode, selectedCountryId, selectedSubRegionId, currentCountry, regionsById]);

  const scopeLabel = scope.label ?? "전 세계";
  const stats = useMemo(
    () => computeShareStats(scope, regions, visits, scores),
    [scope, regions, visits, scores],
  );

  /**
   * Only the boundaries under the card's subject.
   */
  const scopedFeatures = useMemo(() => {
    if (scope.kind === "world" || !scope.id) return activeFeatures;
    const target = padId(scope.id);
    const inScope = new Set<string>();
    inScope.add(target);

    const walk = (id: string) => {
      for (const r of regions) {
        if (padId(r.parentId) === id && !inScope.has(padId(r.id))) {
          inScope.add(padId(r.id));
          walk(padId(r.id));
        }
      }
    };
    walk(target);

    const matched = activeFeatures.filter((f) => {
      const id = padId(f.properties?.id || f.properties?.shapeID);
      const parentId = padId(f.properties?.parentId || f.properties?.adm1_id || f.properties?.prefecture_id);
      return inScope.has(id) || (parentId && inScope.has(parentId));
    });
    return matched.length > 0 ? matched : activeFeatures;
  }, [activeFeatures, regions, scope]);

  const contextFeatures = useMemo(() => {
    if (scope.kind === "world" || scopedFeatures.length === activeFeatures.length) return [];
    const inCard = new Set(
      scopedFeatures.map((f) => padId(f.properties?.id || f.properties?.shapeID)),
    );
    return activeFeatures.filter(
      (f) => !inCard.has(padId(f.properties?.id || f.properties?.shapeID)),
    );
  }, [activeFeatures, scopedFeatures, scope.kind]);

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
      if (!canvasRef.current) return resolve(null);
      canvasRef.current.toBlob(resolve, "image/png");
    }),
    [],
  );

  const deliver = useCallback(async (preferred: Delivery) => {
    setBusy(true);
    setNotice(null);
    try {
      const blob = await toBlob();
      if (!blob) throw new Error("Canvas toBlob failed");

      const file = new File([blob], filename, { type: "image/png" });

      if (
        preferred === "share"
        && typeof navigator !== "undefined"
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
          // Fall through to download
        }
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      if ((error as { name?: string })?.name !== "AbortError") {
        console.error("[ShareCard] delivery failed", error);
        setNotice("이미지를 만들지 못했어요.");
      }
    } finally {
      setBusy(false);
    }
  }, [toBlob, filename, message]);

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
      : aspectRatio === "16:9" ? "aspect-[16/9] max-w-[560px]"
        : "aspect-[9/16] max-w-[280px]";

  const isSpecificPrefectureSelected = selectedSubRegionId !== "ALL";

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
      style={{ zIndex: Z.modal }}
    >
      {/* Dim Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-md"
        onClick={onClose}
      />

      {/* 2-Column Unified Layout Modal Container */}
      <div
        className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200/80 dark:border-slate-800 animate-in zoom-in-95 duration-200 max-h-[92vh] h-[850px]"
        role="dialog"
        aria-modal="true"
        aria-label="공유 카드 만들기"
      >
        {/* Modal Top Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                공유 카드 만들기
              </h3>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                SHARE FOOTPRINT CARD
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDark((d) => !d)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label={dark ? "밝은 테마" : "어두운 테마"}
              title={dark ? "밝은 테마" : "어두운 테마"}
            >
              {dark ? <SunIcon className="w-4 h-4 text-amber-400" /> : <MoonIcon className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2-Column Split Workspace Body */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Left Column: Fixed Card Preview & Quick Delivery Actions */}
          <div className="md:col-span-7 bg-slate-100/70 dark:bg-slate-950/60 p-6 flex flex-col items-center justify-between overflow-hidden border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800">
            {/* Card Preview Container */}
            <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-center p-2 relative">
              {loadingGeometries && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/40 dark:bg-slate-900/40 backdrop-blur-xs rounded-2xl z-10 animate-in fade-in">
                  <div className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">지오메트리 로딩 중…</span>
                  </div>
                </div>
              )}

              <div className={`rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/10 w-full transition-all duration-300 ${previewAspect}`}>
                <canvas
                  ref={canvasRef}
                  width={cw}
                  height={ch}
                  className="w-full h-full object-contain block"
                />
              </div>

              {notice && (
                <div className="absolute bottom-2 px-3 py-1.5 rounded-full bg-slate-900/90 text-white text-xs font-bold shadow-lg animate-in fade-in slide-in-from-bottom-2">
                  {notice}
                </div>
              )}
            </div>

            {/* Quick Delivery Actions Bar */}
            <div className="w-full pt-4 shrink-0 flex items-center gap-2 max-w-lg">
              <button
                onClick={() => deliver("download")}
                disabled={busy}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-extrabold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>이미지 저장</span>
              </button>

              <button
                onClick={() => deliver("copy")}
                disabled={busy}
                className="flex-1 py-3 px-4 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-extrabold text-xs border border-slate-200 dark:border-slate-700 shadow-xs transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Copy className="w-4 h-4" />
                <span>이미지 복사</span>
              </button>

              <button
                onClick={() => deliver("share")}
                disabled={busy}
                className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                title="공유 / X에 포스팅"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Column: Scrollable Settings Panel */}
          <div className="md:col-span-5 flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-white dark:bg-slate-900">
            {/* 1. Card Ratio Selector */}
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">카드 비율 (RATIO)</p>
              <div className="grid grid-cols-3 gap-2">
                {RATIOS.map((r) => {
                  const isSelected = aspectRatio === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setAspectRatio(r.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-black shadow-xs ring-1 ring-blue-600/30"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-bold"
                      }`}
                    >
                      <div className="text-xs">{r.label}</div>
                      <div className="text-[10px] opacity-70 mt-0.5">{r.hint}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Hierarchical Region Selection (1차 국가 -> 2차 세부 지역 -> 3차 세부 표시 단위) */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                공유 대상 지역 (REGION SELECTION)
              </p>

              {/* 1st Level: World vs Country Mode Switch */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScopeMode("world")}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    scopeMode === "world"
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-500 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>전 세계 (World)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScopeMode("country")}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    scopeMode === "country"
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-500 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>특정 국가 (Country)</span>
                </button>
              </div>

              {/* Country Selection Options */}
              {scopeMode === "country" && (
                <div className="space-y-3.5 pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  {/* 1차 국가 선택 */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      1차 국가 선택
                    </label>
                    <select
                      value={selectedCountryId}
                      onChange={(e) => {
                        setSelectedCountryId(e.target.value);
                        setSelectedSubRegionId("ALL");
                      }}
                      className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary shadow-xs cursor-pointer"
                    >
                      {countryList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nameKo || c.name || c.id} ({c.iso3 || c.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2차 세부 지역 선택 (국가 바로 아래 배치) */}
                  {subRegionList.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        2차 세부 지역 선택
                      </label>
                      <select
                        value={selectedSubRegionId}
                        onChange={(e) => setSelectedSubRegionId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary shadow-xs cursor-pointer"
                      >
                        <option value="ALL">국가 전체 ({currentCountry?.nameKo || currentCountry?.name || "전체"})</option>
                        {subRegionList.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nameKo || s.name || s.id}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* 3차 세부 표시 단위 (도도부현 vs 시정촌) */}
                  <div className="space-y-1.5 pt-0.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      <span>지도 세부 표시 단위 (DETAIL LEVEL)</span>
                      {isSpecificPrefectureSelected && (
                        <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400">시정촌 단위 자동 적용됨</span>
                      )}
                    </label>

                    <div className={`grid grid-cols-2 gap-2 transition-opacity duration-200 ${isSpecificPrefectureSelected ? "opacity-50 pointer-events-none" : ""}`}>
                      <button
                        type="button"
                        disabled={isSpecificPrefectureSelected}
                        onClick={() => setDetailLevel("prefecture")}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          detailLevel === "prefecture" && !isSpecificPrefectureSelected
                            ? "bg-blue-600 text-white shadow-xs font-black"
                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <MapIcon className="w-3.5 h-3.5" />
                        <span>도도부현 / 주</span>
                      </button>

                      <button
                        type="button"
                        disabled={isSpecificPrefectureSelected}
                        onClick={() => setDetailLevel("city")}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          detailLevel === "city" || isSpecificPrefectureSelected
                            ? "bg-blue-600 text-white shadow-xs font-black"
                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        <span>시정촌 / 기초지자체</span>
                      </button>
                    </div>

                    {isSpecificPrefectureSelected && (
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium pt-0.5">
                        💡 특정 도도부현 선택 시 해당 도도부현 내 시정촌 단위로 자동 표시됩니다.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Included Information Blocks */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  포함할 정보 (BLOCKS)
                </p>
                {aspectRatio === "1:1" && (
                  <span className="text-[10px] font-bold text-primary">1:1 모드는 지도 중심 뷰</span>
                )}
              </div>

              {aspectRatio !== "1:1" && (
                <div className="grid grid-cols-2 gap-2">
                  {SHARE_BLOCKS.filter((b) => b !== "map").map((id) => {
                    const isChecked = blocks.has(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setBlocks((prev) => {
                            const next = new Set(prev);
                            if (next.has(id)) next.delete(id);
                            else next.add(id);
                            return next;
                          });
                        }}
                        className={`flex items-center justify-between p-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          isChecked
                            ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 shadow-xs"
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span>{BLOCK_LABEL[id]}</span>
                        <Check className={`w-4 h-4 transition-transform ${isChecked ? "scale-100" : "scale-0"}`} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. Display Options */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                기타 표시 설정
              </p>
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 cursor-pointer group">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">
                  지역 경계선 표시
                </span>
                <span
                  className={`relative w-8 h-4.5 rounded-full transition-colors duration-300 ${
                    showBorders ? "bg-primary" : "bg-slate-300 dark:bg-slate-600"
                  }`}
                  style={{ height: "18px", width: "32px" }}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={showBorders}
                    onChange={(e) => setShowBorders(e.target.checked)}
                  />
                  <span
                    className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-xs transition-transform duration-300 ${
                      showBorders ? "translate-x-3.5" : ""
                    }`}
                  />
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
