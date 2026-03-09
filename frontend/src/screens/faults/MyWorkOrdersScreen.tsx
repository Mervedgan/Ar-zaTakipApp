import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import api from '../../services/api';

interface WorkOrder {
    id: number;
    faultReportId: number;
    faultReportTitle: string;
    status: string;
    createdAt: string;
}

export function MyWorkOrdersScreen() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const navigation = useNavigation<any>();

    const fetchWorkOrders = async () => {
        try {
            const response = await api.get('/workorders');
            setWorkOrders(response.data);
        } catch (error) {
            Toast.show({ type: 'error', text1: 'İş emirleriniz yüklenemedi' });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchWorkOrders();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchWorkOrders();
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'Assigned': return { text: 'Atandı', color: '#3B82F6' };
            case 'InProgress': return { text: 'İşlemde', color: '#F59E0B' };
            case 'WaitingForPart': return { text: 'Parça Bekliyor', color: '#EF4444' };
            case 'Completed': return { text: 'Tamamlandı', color: '#10B981' };
            default: return { text: status, color: '#10B981' };
        }
    };

    const renderItem = ({ item }: { item: WorkOrder }) => {
        const sInfo = getStatusInfo(item.status);
        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('FaultDetail', { faultId: item.faultReportId })}
            >
                <View style={styles.cardHeader}>
                    <Text style={styles.faultTitle}>{item.faultReportTitle}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: sInfo.color }]}>
                        <Text style={styles.statusText}>{sInfo.text}</Text>
                    </View>
                </View>
                <View style={styles.cardFooter}>
                    <Text style={styles.dateText}>Atama: {new Date(item.createdAt).toLocaleDateString('tr-TR')}</Text>
                    <Text style={styles.detailLink}>Detaya Git →</Text>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#10B981" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={workOrders}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Üzerinizde aktif bir iş bulunmuyor.</Text>
                    </View>
                }
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 16 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    faultTitle: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
    dateText: { fontSize: 12, color: '#9CA3AF' },
    detailLink: { fontSize: 12, color: '#10B981', fontWeight: 'bold' },
    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { fontSize: 16, color: '#6B7280' }
});
