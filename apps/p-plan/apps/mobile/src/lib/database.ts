import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

/**
 * SQLite DB 초기화 (SDK 51+ 신규 오픈 방식 기준)
 * 웹 환경에서는 Sync API(openDatabaseSync)가 워커와의 동기 통신 중 타임아웃을 유발할 수 있으므로
 * 부팅 안정성을 위해 웹 플랫폼에서는 명시적으로 비활성화(null) 처리합니다.
 */
const isWeb = Platform.OS === 'web';

export const db = isWeb 
    ? null 
    : SQLite.openDatabaseSync('pplaner_offline.db');

export interface RecordedLocation {
    id: number;
    tripId: string;
    latitude: number;
    longitude: number;
    timestamp: number;
    isSynced: number; // 0 or 1
    type: 'location';
}

export interface RecordedPhoto {
    id: number;
    tripId: string;
    uri: string;
    latitude?: number;
    longitude?: number;
    timestamp: number;
    isSynced: number; // 0 or 1
    type: 'photo';
}

export type TripHistoryItem = RecordedLocation | RecordedPhoto;

/**
 * 데이터베이스 초기화 및 테이블 생성
 */
export const initDatabase = () => {
    if (!db) {
        if (isWeb) {
            console.warn('PPLANER: Local SQLite Database is disabled on Web for boot stability.');
        }
        return;
    }
    
    try {
        db.execSync(`
            CREATE TABLE IF NOT EXISTS recorded_locations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tripId TEXT NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                timestamp INTEGER NOT NULL,
                isSynced INTEGER DEFAULT 0
            );
            
            CREATE TABLE IF NOT EXISTS recorded_photos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tripId TEXT NOT NULL,
                uri TEXT NOT NULL,
                latitude REAL,
                longitude REAL,
                timestamp INTEGER NOT NULL,
                isSynced INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS life_logs (
                id TEXT PRIMARY KEY,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                accuracy REAL NOT NULL,
                altitude REAL,
                speed REAL,
                timestamp INTEGER NOT NULL,
                status TEXT DEFAULT 'raw',
                activity TEXT
            );

            -- [NEW] 통합 발자취 테이블
            CREATE TABLE IF NOT EXISTS footprints (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                accuracy REAL,
                timestamp INTEGER NOT NULL,
                activity TEXT,
                isManual INTEGER DEFAULT 0,
                memo TEXT
            );
        `);
        console.log('PPLANER: Local SQLite Database Initialized');
    } catch (e) {
        console.error('PPLANER: Failed to initialize SQLite database', e);
    }
};

/**
 * 위치 기록 저장
 */
export const saveRecordedLocation = (location: Omit<RecordedLocation, 'id' | 'isSynced'>) => {
    if (!db) return;
    return db.runSync(
        'INSERT INTO recorded_locations (tripId, latitude, longitude, timestamp) VALUES (?, ?, ?, ?)',
        [location.tripId, location.latitude, location.longitude, location.timestamp]
    );
};

/**
 * 동기화되지 않은 위치 목록 조회
 */
export const getUnsyncedLocations = (): RecordedLocation[] => {
    if (!db) return [];
    return db.getAllSync<RecordedLocation>('SELECT * FROM recorded_locations WHERE isSynced = 0');
};

/**
 * 위치 동기화 상태 업데이트
 */
export const markLocationAsSynced = (id: number) => {
    if (!db) return;
    db.runSync('UPDATE recorded_locations SET isSynced = 1 WHERE id = ?', [id]);
};

/**
 * 사진 기록 저장
 */
export const saveRecordedPhoto = (photo: Omit<RecordedPhoto, 'id' | 'isSynced'>) => {
    if (!db) return;
    return db.runSync(
        'INSERT INTO recorded_photos (tripId, uri, latitude, longitude, timestamp) VALUES (?, ?, ?, ?, ?)',
        [photo.tripId, photo.uri, photo.latitude || null, photo.longitude || null, photo.timestamp]
    );
};

/**
 * 동기화되지 않은 사진 목록 조회
 */
export const getUnsyncedPhotos = (): RecordedPhoto[] => {
    if (!db) return [];
    return db.getAllSync<RecordedPhoto>('SELECT * FROM recorded_photos WHERE isSynced = 0');
};

/**
 * 사진 동기화 상태 업데이트
 */
export const markPhotoAsSynced = (id: number) => {
    if (!db) return;
    db.runSync('UPDATE recorded_photos SET isSynced = 1 WHERE id = ?', [id]);
};

/**
 * 통합 발자취 저장
 */
export const saveFootprint = (data: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp: number;
    activity?: string;
    isManual?: number;
    memo?: string;
}) => {
    if (!db) return;
    try {
        return db.runSync(
            'INSERT INTO footprints (latitude, longitude, accuracy, timestamp, activity, isManual, memo) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [data.latitude, data.longitude, data.accuracy || null, data.timestamp, data.activity || null, data.isManual || 0, data.memo || null]
        );
    } catch (e) {
        console.error('PPLANER: Failed to save footprint', e);
    }
};

/**
 * 특정 시간 범위의 발자취 조회 (여행 가공용)
 */
export const getFootprintsInRange = (startTime: number, endTime: number) => {
    if (!db) return [];
    try {
        return db.getAllSync<any>(
            'SELECT * FROM footprints WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC',
            [startTime, endTime]
        );
    } catch (e) {
        console.error('PPLANER: Failed to query footprints', e);
        return [];
    }
};

/**
 * 특정 발자취 삭제
 */
export const deleteFootprint = (id: number) => {
    if (!db) return;
    try {
        db.runSync('DELETE FROM footprints WHERE id = ?', [id]);
    } catch (e) {
        console.error('PPLANER: Failed to delete footprint', e);
    }
};

/**
 * 24시간 일상 발자취 저장 (DEPRECATED: saveFootprint 권장)
 */
export const saveLifeLog = (log: any) => {
    if (!db) return;
    try {
        db.runSync(
            'INSERT INTO life_logs (id, latitude, longitude, accuracy, altitude, speed, timestamp, status, activity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                log.id, 
                log.latitude, 
                log.longitude, 
                log.accuracy, 
                log.altitude || null, 
                log.speed || null, 
                log.timestamp, 
                log.status || 'raw', 
                log.activity || null
            ]
        );
    } catch (e) {
        console.error('PPLANER: Failed to save life log', e);
    }
};

/**
 * 특정 시간 범위의 일상 기록 조회 (여행 가공용)
 */
export const getLifeLogsInRange = (startTime: number, endTime: number) => {
    if (!db) return [];
    return db.getAllSync<any>(
        'SELECT * FROM life_logs WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC',
        [startTime, endTime]
    );
};

/**
 * 특정 여행의 모든 기록(위치 + 사진)을 시간순으로 조회
 */
export const getCombinedTripHistory = (tripId: string): TripHistoryItem[] => {
    if (!db) return [];
    const locations = db.getAllSync<RecordedLocation>(
        'SELECT *, "location" as type FROM recorded_locations WHERE tripId = ? ORDER BY timestamp ASC',
        [tripId]
    );
    
    const photos = db.getAllSync<RecordedPhoto>(
        'SELECT *, "photo" as type FROM recorded_photos WHERE tripId = ? ORDER BY timestamp ASC',
        [tripId]
    );

    const combined: TripHistoryItem[] = [...locations, ...photos];
    return combined.sort((a, b) => a.timestamp - b.timestamp);
};

/**
 * [NEW] 모든 발자취 데이터 삭제
 */
export const clearFootprints = () => {
    if (!db) return;
    try {
        db.runSync('DELETE FROM footprints');
    } catch (e) {
        console.error('PPLANER: Failed to clear footprints', e);
    }
};

/**
 * [NEW] 모든 보관된 기록 데이터(위치/사진) 삭제
 */
export const clearRecordedData = () => {
    if (!db) return;
    try {
        db.runSync('DELETE FROM recorded_locations');
        db.runSync('DELETE FROM recorded_photos');
    } catch (e) {
        console.error('PPLANER: Failed to clear recorded data', e);
    }
};

/**
 * [NEW] 모든 라이프로그 데이터 삭제
 */
export const clearLifeLogs = () => {
    if (!db) return;
    try {
        db.runSync('DELETE FROM life_logs');
    } catch (e) {
        console.error('PPLANER: Failed to clear life logs', e);
    }
};
