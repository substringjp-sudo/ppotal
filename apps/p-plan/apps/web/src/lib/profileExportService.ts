/**
 * profileExportService.ts
 * 프로필 대시보드를 이미지(PNG) 또는 데이터(JSON)로 내보내는 유틸리티.
 */

import { toPng } from 'html-to-image';
import { TravelStats } from '@pplaner/shared';

/** 요소를 이미지로 캡처하여 다운로드 */
export async function exportComponentToImage(elementId: string, filename: string): Promise<void> {
  if (typeof document === 'undefined') return;
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found.`);
    return;
  }

  try {
    const dataUrl = await toPng(element, {
      cacheBust: true,
      backgroundColor: '#020617', // slate-950
      style: {
        borderRadius: '0',
      }
    });

    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Error exporting image:', error);
    throw error;
  }
}

/** 프로필 통계 데이터를 JSON으로 내보내기 */
export function exportProfileToJSON(stats: TravelStats, userName: string): void {
  if (typeof document === 'undefined') return;
  const exportData = {
    _pplaner_profile_version: '1.0',
    _exported_at: new Date().toISOString(),
    user: userName,
    stats: {
      level: stats.level,
      title: stats.title,
      fantasyClass: stats.fantasyClass,
      totalXP: stats.totalXP,
      breakdown: stats.breakdown,
      achievements: stats.badges.map((b: any) => ({
        id: b.id,
        title: b.title,
        unlockedAt: b.unlockedAt,
        isUnlocked: b.isUnlocked
      }))
    }
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pplaner-stats-${userName.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
