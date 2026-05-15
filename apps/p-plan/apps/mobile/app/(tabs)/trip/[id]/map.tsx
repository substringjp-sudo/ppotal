import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@pplaner/shared';
import { TripTraceMap } from '../../../../src/components/companion/TripTraceMap';
import { useTripTrace } from '../../../../src/hooks/useTripTrace';

export default function TripMapScreen() {
    const { id } = useLocalSearchParams();
    const { history, isLoading, error } = useTripTrace(id as string);

    return (
        <View style={styles.container}>
            <Stack.Screen 
                options={{
                    headerTitle: '여행 발자취 지도',
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <Ionicons name="chevron-back" size={24} color={DESIGN_TOKENS.colors.slate[800]} />
                        </TouchableOpacity>
                    ),
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: '#fff' },
                }} 
            />

            {isLoading && history.length === 0 ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={DESIGN_TOKENS.colors.primary.DEFAULT} />
                    <Text style={styles.loadingText}>기록을 불러오는 중...</Text>
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <Ionicons name="alert-circle-outline" size={48} color={DESIGN_TOKENS.colors.danger.DEFAULT} />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
                        <Text style={styles.retryText}>뒤로 가기</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    <View style={styles.mapWrapper}>
                        <TripTraceMap history={history} />
                    </View>
                    
                    {/* 상단 오버레이: 요약 정보 */}
                    <View style={styles.summaryOverlay}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>이동 포인트</Text>
                            <Text style={styles.summaryValue}>{history.filter(h => h.type === 'location').length}개</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>기록된 사진</Text>
                            <Text style={styles.summaryValue}>{history.filter(h => h.type === 'photo').length}장</Text>
                        </View>
                    </View>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    backButton: {
        marginLeft: -8,
        padding: 8,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    loadingText: {
        marginTop: 16,
        color: DESIGN_TOKENS.colors.slate[500],
        fontSize: 15,
    },
    errorText: {
        marginTop: 12,
        color: DESIGN_TOKENS.colors.slate[500],
        fontSize: 15,
        textAlign: 'center',
    },
    retryButton: {
        marginTop: 24,
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: DESIGN_TOKENS.colors.slate[100],
        borderRadius: 10,
    },
    retryText: {
        color: DESIGN_TOKENS.colors.slate[700],
        fontWeight: 'bold',
    },
    mapWrapper: {
        flex: 1,
    },
    summaryOverlay: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        borderRadius: 24,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.1,
                shadowRadius: 20,
            },
            android: {
                elevation: 5,
            },
        }),
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: 12,
        color: DESIGN_TOKENS.colors.slate[400],
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: DESIGN_TOKENS.colors.slate[800],
    },
    divider: {
        width: 1,
        height: 30,
        backgroundColor: DESIGN_TOKENS.colors.slate[100],
    }
});
