import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Text, Image } from 'react-native';
import MapView, { Polyline, Marker, Callout } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@pplaner/shared';
import { TripHistoryItem } from '../../lib/database';

interface TripTraceMapProps {
    history: TripHistoryItem[];
}

export const TripTraceMap: React.FC<TripTraceMapProps> = ({ history }) => {
    const mapRef = useRef<MapView>(null);

    // 경로 데이터 추출 (위치와 사진 위치 모두 포함)
    const coordinates = history
        .map(item => ({
            latitude: item.latitude!,
            longitude: item.longitude!,
        }))
        .filter(coord => coord.latitude !== null && coord.longitude !== null);

    // 컴포넌트 마운트 시 또는 데이터 변경 시 지도 범위를 모든 마커가 보이도록 조정
    useEffect(() => {
        if (coordinates.length > 0 && mapRef.current) {
            mapRef.current.fitToCoordinates(coordinates, {
                edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
                animated: true,
            });
        }
    }, [coordinates]);

    if (history.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="map-outline" size={48} color={DESIGN_TOKENS.colors.slate[300]} />
                <Text style={styles.emptyText}>아직 기록된 발자취가 없습니다.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                    latitude: coordinates[0]?.latitude || 37.5665,
                    longitude: coordinates[0]?.longitude || 126.9780,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
            >
                {/* 1. 시간 순서대로 모든 지점 연결 */}
                <Polyline
                    coordinates={coordinates}
                    strokeColor={DESIGN_TOKENS.colors.primary.DEFAULT}
                    strokeWidth={4}
                    lineDashPattern={[1]}
                />

                {/* 2. 각 기록 지점에 마커 표시 */}
                {history.map((item, index) => {
                    if (item.latitude === null || item.longitude === null) return null;

                    const isPhoto = item.type === 'photo';

                    return (
                        <Marker
                            key={`${item.type}-${item.timestamp}-${index}`}
                            coordinate={{ latitude: item.latitude, longitude: item.longitude }}
                            tracksViewChanges={false} // 성능 최적화
                        >
                            {isPhoto ? (
                                <View style={styles.photoMarker}>
                                    <View style={styles.photoIconBg}>
                                        <Ionicons name="camera" size={12} color="#fff" />
                                    </View>
                                    <View style={styles.markerArrow} />
                                </View>
                            ) : (
                                <View style={styles.footprintMarker}>
                                    <View style={styles.dot} />
                                </View>
                            )}

                            {isPhoto && (
                                <Callout tooltip>
                                    <View style={styles.calloutContainer}>
                                        <Image 
                                            source={{ uri: item.uri }} 
                                            style={styles.calloutImage} 
                                            resizeMode="cover"
                                        />
                                        <Text style={styles.calloutTime}>
                                            {new Date(item.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </View>
                                </Callout>
                            )}
                        </Marker>
                    );
                })}
            </MapView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        borderRadius: 20,
        overflow: 'hidden',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: DESIGN_TOKENS.colors.slate[50],
        padding: 40,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 15,
        color: DESIGN_TOKENS.colors.slate[400],
    },
    // 마커 스타일
    footprintMarker: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: 'rgba(56, 189, 248, 0.2)', // primary light with opacity
        justifyContent: 'center',
        alignItems: 'center',
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: DESIGN_TOKENS.colors.primary.DEFAULT,
    },
    photoMarker: {
        alignItems: 'center',
    },
    photoIconBg: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#F59E0B', // Orange/Amber for photos
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    markerArrow: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 4,
        borderRightWidth: 4,
        borderTopWidth: 6,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#fff',
        marginTop: -1,
    },
    // Callout 스타일
    calloutContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 4,
        width: 120,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: DESIGN_TOKENS.colors.slate[200],
    },
    calloutImage: {
        width: 110,
        height: 80,
        borderRadius: 8,
    },
    calloutTime: {
        fontSize: 10,
        color: DESIGN_TOKENS.colors.slate[500],
        marginTop: 4,
        marginBottom: 2,
    }
});
