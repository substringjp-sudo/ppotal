/**
 * Photo Metadata Extraction Utility (Simplified Manual EXIF Parser)
 *
 * 외부 라이브러리 없이 JPG 파일의 바이너리에서 핵심 EXIF 태그(DateTimeOriginal, GPS)를 추출합니다.
 */
export interface PhotoExifData {
    timestamp?: number;
    latitude?: number;
    longitude?: number;
}
export declare const extractPhotoMetadata: (file: File) => Promise<PhotoExifData>;
/**
 * 촬영 시간 기반 일정 제안 로직
 */
export declare const suggestTimelineEvent: (metadata: PhotoExifData, timeline: any[]) => null;
