import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import api from '../../services/api';
import { formatDate } from '../../utils/dateUtils';

interface PurchaseOrder {
    id: number;
    workOrderTitle: string;
    materialName: string;
    status: string;
    createdAt: string;
    faultCreatedAt: string;
    faultPriority: string;
}

export function MyPurchaseRequestsScreen({ navigation }: any) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);

    const fetchOrders = async () => {
        try {
            const response = await api.get('/purchaseorders');
            setOrders(response.data);
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Talepler yüklenemedi' });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { fetchOrders(); }, []));

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'Pending': return { color: '#F59E0B', text: 'Onay Bekliyor', bg: '#FEF3C7' };
            case 'ApprovedByAdmin': return { color: '#10B981', text: 'Onaylandı', bg: '#D1FAE5' };
            case 'RejectedByAdmin': return { color: '#EF4444', text: 'Reddedildi', bg: '#FEE2E2' };
            case 'Ordered': return { color: '#3B82F6', text: 'Sipariş Edildi', bg: '#DBEAFE' };
            case 'Completed': return { color: '#6366F1', text: 'Tamamlandı', bg: '#EEF2FF' };
            default: return { color: '#94A3B8', text: status, bg: '#F1F5F9' };
        }
    };

    const getPriorityStyles = (p: string) => {
        switch (p) {
            case 'Low': return { color: '#10B981', label: 'Düşük' };
            case 'Normal': return { color: '#3B82F6', label: 'Normal' };
            case 'High': return { color: '#F59E0B', label: 'Yüksek' };
            case 'Critical': return { color: '#EF4444', label: 'Kritik' };
            default: return { color: '#6366F1', label: p };
        }
    };

    const renderItem = ({ item }: { item: PurchaseOrder }) => {
        const stat = getStatusStyles(item.status);
        const prio = getPriorityStyles(item.faultPriority);

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                        <View style={styles.partIconBox}>
                            <Ionicons name="cart-outline" size={20} color="#6366F1" />
                        </View>
                        <View>
                            <Text style={styles.partName}>{item.materialName || 'İsimsiz Parça'}</Text>
                            <Text style={styles.faultTitle} numberOfLines={1}>{item.workOrderTitle}</Text>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: stat.bg }]}>
                        <Text style={[styles.statusText, { color: stat.color }]}>{stat.text}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailsGrid}>
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Talep Tarihi</Text>
                        <Text style={styles.detailValue}>{formatDate(item.createdAt)}</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Arıza Tarihi</Text>
                        <Text style={styles.detailValue}>{formatDate(item.faultCreatedAt)}</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Öncelik</Text>
                        <View style={styles.prioRow}>
                            <View style={[styles.prioDot, { backgroundColor: prio.color }]} />
                            <Text style={[styles.detailValue, { color: prio.color }]}>{prio.label || item.faultPriority || '---'}</Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.openDrawer()}>
                        <Ionicons name="menu-outline" size={28} color="#fff" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerTitle}>Parça Taleplerim</Text>
                        <Text style={styles.headerSubtitle}>Satın alma ve malzeme takibi</Text>
                    </View>
                </View>
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>{orders.length}</Text>
                </View>
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#6366F1" />
                </View>
            ) : (
                <FlatList
                    data={orders}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="cart-outline" size={64} color="#CBD5E1" />
                            <Text style={styles.emptyText}>Henüz bir parça talebiniz yok</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F1F5F9' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { backgroundColor: '#6366F1', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    menuBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
    headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
    countBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    countText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    list: { padding: 16 },
    card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    partIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
    partName: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
    faultTitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 11, fontWeight: '800' },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
    detailsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
    detailItem: { flex: 1 },
    detailLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 },
    detailValue: { fontSize: 13, fontWeight: '600', color: '#334155' },
    prioRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    prioDot: { width: 6, height: 6, borderRadius: 3 },
    emptyContainer: { alignItems: 'center', marginTop: 80 },
    emptyText: { fontSize: 15, color: '#94A3B8', marginTop: 16 }
});
