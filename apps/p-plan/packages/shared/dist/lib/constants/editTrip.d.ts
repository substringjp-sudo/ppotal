import { TransportationMethod } from '../../types/trip';
export declare const SOURCE_TO_SECTION_MAP: Record<string, SectionId>;
export type SectionId = 'basics' | 'timeline' | 'transport' | 'accommodation' | 'reservations';
export declare const SECTIONS: {
    id: SectionId;
    label: string;
    icon: string;
    description: string;
}[];
export declare const TRANSPORT_ICONS: Record<TransportationMethod, string>;
export declare const TRANSPORT_LABELS: Record<TransportationMethod, string>;
