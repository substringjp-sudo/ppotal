'use client';

import React, { memo, useMemo } from 'react';
import { MapSubHeader, SubHeaderStatsGroup, SubHeaderBreadcrumb } from '@ppotal/ui';
import type { SubHeaderStatItem, BreadcrumbSegment } from '@ppotal/ui';
import { MapPin, Train, Building2, Route, Layers, Trophy } from 'lucide-react';
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

    // Standard breadcrumb segments
    const breadcrumbSegments = useMemo<BreadcrumbSegment[]>(() => {
        const rootLabel = language === 'ko' ? '일본 철도망' : language === 'ja' ? '日本鉄道網' : 'Japan Rail';
        const hasSelection = Boolean(activeLineName || selectedStation);

        const segments: BreadcrumbSegment[] = [
            {
                label: rootLabel,
                onClick: hasSelection && onResetActive ? onResetActive : undefined,
                isActive: !hasSelection,
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
            segments.push({
                label: `${stationDisplayName}역`,
                isActive: true,
            });
        }

        return segments;
    }, [language, activeCompanyName, activeLineName, stationDisplayName, onResetActive]);

    // Unified stats items
    const statItems = useMemo<SubHeaderStatItem[]>(() => [
        {
            key: 'stations',
            icon: <MapPin className="w-3.5 h-3.5" />,
            label: 'Stations',
            value: stats.stations,
        },
        {
            key: 'lines',
            icon: <Train className="w-3.5 h-3.5" />,
            label: 'Lines',
            value: stats.lines,
        },
        {
            key: 'companies',
            icon: <Building2 className="w-3.5 h-3.5" />,
            label: 'Companies',
            value: stats.companies,
        },
        {
            key: 'distance',
            icon: <Route className="w-3.5 h-3.5" />,
            label: 'Distance',
            value: `${stats.distance} km`,
            highlight: true,
        },
    ], [stats]);

    return (
        <MapSubHeader
            className={className}
            isLeftOpen={isSidebarOpen}
            onToggleLeft={onToggleSidebar}
            leftTooltip={isSidebarOpen ? '노선 목록 접기' : '노선 목록 펼치기'}
            leftIcon={<Layers className="w-4 h-4" />}
            isRightOpen={isMyLinesOpen}
            onToggleRight={onToggleMyLines}
            rightTooltip={isMyLinesOpen ? '여행 기록 접기' : '여행 기록 펼치기'}
            rightIcon={<Trophy className="w-4 h-4" />}
            breadcrumb={
                <SubHeaderBreadcrumb
                    segments={breadcrumbSegments}
                    onBack={(activeLineName || selectedStation) && onResetActive ? onResetActive : undefined}
                    backTooltip="전체 철도망으로 초기화"
                />
            }
            centerContent={
                <div className="flex items-center gap-4 min-w-0">
                    <div className="shrink-0 flex flex-col justify-center">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                            {activeLineName || selectedStation ? 'Active Selection' : 'Network Selection'}
                        </span>
                        <h3 className="text-xs font-black text-slate-800 dark:text-white leading-none truncate max-w-[220px]">
                            {stationDisplayName
                                ? `${stationDisplayName} (${language === 'ko' ? '선택된 역' : 'Station'})`
                                : activeLineName
                                ? activeLineName
                                : selectedLinesCount > 0
                                ? `${selectedLinesCount}개 노선 활성화됨`
                                : '전국 철도망'}
                        </h3>
                    </div>
                </div>
            }
            statsContent={<SubHeaderStatsGroup items={statItems} />}
        />
    );
});

RailMapHeader.displayName = 'RailMapHeader';
