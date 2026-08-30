'use client';

import React, { memo, useMemo } from 'react';
import { MapSubHeader, SubHeaderStatsGroup, SubHeaderBreadcrumb } from '@ppotal/ui';
import type { SubHeaderStatItem, BreadcrumbSegment } from '@ppotal/ui';
import { MapPin, Train, Building2, Route, Layers, History } from 'lucide-react';
import { useI18n } from '../lib/i18n-context';
import { getLocalizedName } from '../lib/i18n-utils';
import type { Station } from '../types/railData';

export interface RailStats {
    lines: number;
    stations: number;
    distance: number;
    companies: number;
}

export interface RailMapHeaderProps {
    isSidebarOpen: boolean;
    onToggleSidebar: () => void;
    isMyLinesOpen: boolean;
    onToggleMyLines: () => void;
    stats: RailStats;
    selectedLinesCount: number;
    activeLineName?: string | null;
    activeCompanyName?: string | null;
    selectedStation?: Station | null;
    onResetActive?: () => void;
    className?: string;
}

export const RailMapHeader: React.FC<RailMapHeaderProps> = memo(({
    isSidebarOpen,
    onToggleSidebar,
    isMyLinesOpen,
    onToggleMyLines,
    stats,
    selectedLinesCount,
    activeLineName,
    activeCompanyName,
    selectedStation,
    onResetActive,
    className = '',
}) => {
    const { language } = useI18n();

    const stationDisplayName = selectedStation ? getLocalizedName(selectedStation, language) : null;
    const hasSelection = Boolean(activeLineName || selectedStation);

    // Standard breadcrumb segments
    const breadcrumbSegments = useMemo<BreadcrumbSegment[]>(() => {
        if (!hasSelection) return [];

        const rootLabel = language === 'ko' ? '일본 철도망' : language === 'ja' ? '日本鉄道網' : 'Japan Rail';

        const segments: BreadcrumbSegment[] = [
            {
                label: rootLabel,
                onClick: onResetActive ? onResetActive : undefined,
                isActive: false,
            }
        ];

        if (activeCompanyName) {
            segments.push({
                label: activeCompanyName,
                isActive: false,
            });
        }

        if (activeLineName) {
            segments.push({
                label: activeLineName,
                isActive: !stationDisplayName,
            });
        }

        if (stationDisplayName) {
            const stationSuffix = language === 'ja' ? '駅' : language === 'ko' ? '역' : ' Stn';
            segments.push({
                label: `${stationDisplayName}${stationSuffix}`,
                isActive: true,
            });
        }

        return segments;
    }, [language, activeCompanyName, activeLineName, stationDisplayName, onResetActive, hasSelection]);

    // Unified stats items
    const statItems = useMemo<SubHeaderStatItem[]>(() => [
        {
            key: 'stations',
            icon: <MapPin className="w-3.5 h-3.5" />,
            label: language === 'ko' ? '역' : language === 'ja' ? '駅' : 'Stations',
            value: stats.stations,
        },
        {
            key: 'lines',
            icon: <Train className="w-3.5 h-3.5" />,
            label: language === 'ko' ? '노선' : language === 'ja' ? '路線' : 'Lines',
            value: stats.lines,
        },
        {
            key: 'companies',
            icon: <Building2 className="w-3.5 h-3.5" />,
            label: language === 'ko' ? '회사' : language === 'ja' ? '会社' : 'Companies',
            value: stats.companies,
        },
        {
            key: 'distance',
            icon: <Route className="w-3.5 h-3.5" />,
            label: language === 'ko' ? '거리' : language === 'ja' ? '距離' : 'Distance',
            value: `${stats.distance} km`,
            highlight: true,
        },
    ], [stats, language]);

    const leftTooltipText = isSidebarOpen
        ? (language === 'ko' ? '노선 목록 접기' : language === 'ja' ? '路線一覧を閉じる' : 'Collapse Lines')
        : (language === 'ko' ? '노선 목록 펼치기' : language === 'ja' ? '路線一覧を開く' : 'Expand Lines');

    const rightTooltipText = isMyLinesOpen
        ? (language === 'ko' ? '여행 기록 접기' : language === 'ja' ? '旅行記録を閉じる' : 'Collapse Trips')
        : (language === 'ko' ? '여행 기록 펼치기' : language === 'ja' ? '旅行記録を開く' : 'Expand Trips');

    const backTooltipText = language === 'ko'
        ? '전체 철도망으로 초기화'
        : language === 'ja'
            ? '全体鉄道網にリセット'
            : 'Reset to Full Network';

    return (
        <MapSubHeader
            className={className}
            isLeftOpen={isSidebarOpen}
            onToggleLeft={onToggleSidebar}
            leftTooltip={leftTooltipText}
            leftIcon={<Layers className="w-4 h-4" />}
            isRightOpen={isMyLinesOpen}
            onToggleRight={onToggleMyLines}
            rightTooltip={rightTooltipText}
            rightIcon={<History className="w-4 h-4" />}
            breadcrumb={
                breadcrumbSegments.length > 0 ? (
                    <SubHeaderBreadcrumb
                        segments={breadcrumbSegments}
                        onBack={onResetActive ? onResetActive : undefined}
                        backTooltip={backTooltipText}
                    />
                ) : null
            }
            centerContent={
                hasSelection ? (
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="shrink-0 flex flex-col justify-center">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                                Active Selection
                            </span>
                            <h3 className="text-xs font-black text-slate-800 dark:text-white leading-none truncate max-w-[220px]">
                                {stationDisplayName
                                    ? `${stationDisplayName} (${language === 'ko' ? '선택된 역' : language === 'ja' ? '選択された駅' : 'Station'})`
                                    : activeLineName}
                            </h3>
                        </div>
                    </div>
                ) : null
            }
            statsContent={<SubHeaderStatsGroup items={statItems} />}
        />
    );
});

RailMapHeader.displayName = 'RailMapHeader';
