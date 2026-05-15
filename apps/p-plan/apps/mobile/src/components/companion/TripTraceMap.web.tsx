import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@pplaner/shared';

interface TripTraceMapProps {
    history: any[];
}

export const TripTraceMap: React.FC<TripTraceMapProps> = () => {
    return (
        <View style={styles.container}>
            <View style={styles.emptyContainer}>
                <Ionicons name="map-outline" size={48} color={DESIGN_TOKENS.colors.slate[300]} />
                <Text style={styles.emptyText}>웹 환경에서는 지도가 지원되지 않습니다.</Text>
                <Text style={styles.subText}>모바일 앱에서 실시간 발자취를 확인하세요.</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        borderRadius: 20,
        overflow: 'hidden',
        minHeight: 300,
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
        fontSize: 16,
        fontWeight: '600',
        color: DESIGN_TOKENS.colors.slate[600],
    },
    subText: {
        marginTop: 4,
        fontSize: 14,
        color: DESIGN_TOKENS.colors.slate[400],
    },
});
