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

