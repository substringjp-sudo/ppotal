import { Trip, TripWarning } from '../../types/trip';
import { TravelStyle } from '../../types/user';

export function validateChecklistProgress(trip: Trip, warnings: TripWarning[], style?: TravelStyle) {
    if (!trip.checklist || trip.checklist.length === 0) {
        if (style?.meticulousness === 'meticulous') {
            warnings.push({
                id: 'checklist-empty-nudge',
                type: 'not_booked',
                severity: 'info',
                message: '꼼꼼한 여행 준비를 위해 체크리스트를 활용해 보세요.',
                sourceType: 'checklist'
            });
        }
        return;
    }
    
    const undoneCount = trip.checklist.filter(item => !item.isDone).length;
    if (undoneCount > 0) {
        let severity: TripWarning['severity'] = 'info';
        if (style?.meticulousness === 'forgetful') severity = 'warning';

        warnings.push({
            id: 'checklist-undone',
            type: 'not_booked',
            severity,
            message: `체크리스트에 아직 완료하지 않은 항목이 ${undoneCount}개 있습니다.`,
            sourceType: 'checklist'
        });
    }
}

export function validatePrepTaskProgress(trip: Trip, warnings: TripWarning[], style?: TravelStyle) {
    if (!trip.prepTimeline || trip.prepTimeline.length === 0) return;

    const activeTasks = trip.prepTimeline.filter(task => task.status === 'active');
    if (activeTasks.length > 0) {
        const missedCount = 0; // 'missed' status no longer exists in current schema
        let severity: TripWarning['severity'] = missedCount > 0 ? 'warning' : 'info';
        
        if (style?.meticulousness === 'forgetful') {
            severity = 'warning';
        }

        warnings.push({
            id: 'prep-active',
            type: 'not_booked',
            severity,
            message: missedCount > 0 
                ? `기한이 지난 준비 항목이 ${missedCount}개 있습니다. 잊으신 게 없는지 확인해 보세요!`
                : `진행 중인 준비 항목이 ${activeTasks.length}개 있습니다.`,
            sourceType: 'prep'
        });
    }
}
