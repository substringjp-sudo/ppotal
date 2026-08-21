import { SectionId, Trip } from '@pplaner/shared';

export type SectionStatus = 'empty-required' | 'empty-optional' | 'issues' | 'complete';

export interface StatusConfig {
    status: SectionStatus;
    icon?: string;
    iconClass?: string;
    dotClass?: string;
    tooltip: string;
}

export function getSectionStatus(
    sectionId: SectionId,
    currentTrip: Trip,
    sectionWarnings: Record<string, { critical: number; warning: number; info: number }>
): StatusConfig {
    const holds = sectionWarnings[sectionId] || { critical: 0, warning: 0, info: 0 };
    const hasWarnings = holds.critical > 0 || holds.warning > 0;

    let hasData = false;
    let isRequired = false;

    switch (sectionId) {
        case 'basics':
            hasData = !!currentTrip.title && !!currentTrip.dates?.startDate;
            isRequired = true;
            break;
        case 'transport':
            hasData = (currentTrip.flights?.length > 0) || (currentTrip.driving?.length > 0) || (currentTrip.publicTransport?.length > 0);
            isRequired = true;
            break;
        case 'accommodation':
            hasData = (currentTrip.accommodation?.length > 0);
            isRequired = true;
            break;
        case 'timeline':
            hasData = currentTrip.dailyTimeline?.some((day) => day.events?.length > 0) || false;
            isRequired = true;
            break;
        case 'budget':
            hasData = (currentTrip.budget?.expenses?.length > 0) || (currentTrip.budget?.exchanges?.length > 0);
            isRequired = false;
            break;
        case 'reservations':
            hasData = (currentTrip.reservations?.length > 0);
            isRequired = false;
            break;
        case 'checklist':
            hasData = currentTrip.checklist?.some((item) => item.isDone) || false;
            isRequired = false;
            break;
        default:
            break;
    }

    let status: SectionStatus;

    if (!hasData) {
        status = isRequired ? 'empty-required' : 'empty-optional';
    } else if (hasWarnings) {
        status = 'issues';
    } else {
        status = 'complete';
    }

    // Configure visuals based on status
    switch (status) {
        case 'empty-required':
            return {
                status,
                dotClass: 'bg-red-400',
                tooltip: '입력 필요',
            };
        case 'empty-optional':
            return {
                status,
                dotClass: 'bg-slate-300 dark:bg-slate-600',
                tooltip: '입력 선택',
            };
        case 'issues':
            return {
                status,
                icon: 'error',
                iconClass: 'text-amber-500',
                tooltip: '확인 필요',
            };
        case 'complete':
            return {
                status,
                icon: 'check_circle',
                iconClass: 'text-emerald-500',
                tooltip: '완료',
            };
    }
}
