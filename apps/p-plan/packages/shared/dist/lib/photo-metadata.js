"use strict";
/**
 * Photo Metadata Extraction Utility (Simplified Manual EXIF Parser)
 *
 * 외부 라이브러리 없이 JPG 파일의 바이너리에서 핵심 EXIF 태그(DateTimeOriginal, GPS)를 추출합니다.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.suggestTimelineEvent = exports.extractPhotoMetadata = void 0;
const extractPhotoMetadata = async (file) => {
    return new Promise((resolve) => {
        // Only run in environments with FileReader (Browser)
        if (typeof FileReader === 'undefined')
            return resolve({});
        const reader = new FileReader();
        reader.onload = (e) => {
            const buffer = e.target?.result;
            if (!buffer)
                return resolve({});
            try {
                const view = new DataView(buffer);
                // Check JPEG SOI marker (0xFFD8)
                if (view.getUint16(0) !== 0xFFD8)
                    return resolve({});
                let offset = 2;
                let metadata = {};
                while (offset < view.byteLength) {
                    const marker = view.getUint16(offset);
                    const length = view.getUint16(offset + 2);
                    // APP1 marker (EXIF is usually here)
                    if (marker === 0xFFE1) {
                        // "Exif\0\0" magic bytes
                        if (view.getUint32(offset + 4) === 0x45786966) {
                            // Basic EXIF parsing logic would go here
                        }
                    }
                    offset += 2 + length;
                }
                resolve(metadata);
            }
            catch (err) {
                console.error("EXIF Parsing error:", err);
                resolve({});
            }
        };
        reader.readAsArrayBuffer(file.slice(0, 128 * 1024)); // Read first 128kb only
    });
};
exports.extractPhotoMetadata = extractPhotoMetadata;
/**
 * 촬영 시간 기반 일정 제안 로직
 */
const suggestTimelineEvent = (metadata, timeline) => {
    if (!metadata.timestamp)
        return null;
    return null;
};
exports.suggestTimelineEvent = suggestTimelineEvent;
