import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import api from '../../services/api';

interface FaultReport {
    id: number;
    assetName: string;
    title: string;
    priority: string;
    status: string;
    createdAt: string;
}

export function FaultListScreen() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [faults, setFaults] = useState<FaultReport[]>([]);
    const navigation = useNavigation<any>();

    const fetchFaults = async () => {
        try {
            const response = await api.get('/faultreports?unassignedOnly=true');
            setFaults(response.data);
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Arızalar yüklenemedi' });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchFaults();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchFaults();
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'Critical': return '#EF4444';
            case 'High': return '#F59E0B';
            case 'Medium': return '#3B82F6';
            default: return '#10B981';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'Open': return 'Açık';
            case 'InProcess': return 'İşlemde';
            case 'Resolved': return 'Çözüldü';
            case 'Closed': return 'Kapandı';
            default: return status;
        }
    };

    const renderItem = ({ item }: { item: FaultReport }) => (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('FaultDetail', { faultId: item.id })}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.assetName}>{item.assetName}</Text>
                <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
                    <Text style={styles.priorityText}>{item.priority}</Text>
                </View>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <View style={styles.cardFooter}>
                <Text style={styles.statusText}>Durum: {getStatusText(item.status)}</Text>
                <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString('tr-TR')}</Text>
            </View>
        </TouchableOpacity>
    );

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
                data={faults}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Henüz arıza kaydı bulunmuyor.</Text>
                    </View>
                }
                contentContainerStyle={styles.listContent}
            />

            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('CreateFault')}
            >
                <Text style={styles.fabIcon}>+</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 16, paddingBottom: 100 },
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
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    assetName: { fontSize: 13, fontWeight: 'bold', color: '#6B7280', textTransform: 'uppercase' },
    priorityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    priorityText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
    title: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
    statusText: { fontSize: 14, color: '#4B5563', fontWeight: '500' },
    dateText: { fontSize: 12, color: '#9CA3AF' },
    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { fontSize: 16, color: '#6B7280' },
    fab: {
        position: 'absolute',
        right: 24,
        bottom: 24,
        backgroundColor: '#10B981',
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4
    },
    fabIcon: { color: '#fff', fontSize: 32, fontWeight: 'bold' }
});
