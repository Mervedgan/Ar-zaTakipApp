import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../../services/api';

interface Stats {
    totalActiveFaults: number;
    thisWeekFaults: number;
    pendingPurchaseOrders: number;
    criticalStockItems: number;
    recentFaults: RecentFault[];
}

interface RecentFault {
    id: number;
    title: string;
    assetName: string;
    status: string;
    priority: string;
    createdAt: string;
}

const PRIORITY_COLORS: Record<string, string> = {
    Critical: '#EF4444',
    High: '#F59E0B',
    Normal: '#3B82F6',
    Low: '#10B981',
};

const STATUS_LABELS: Record<string, string> = {
    Open: 'Açık',
    InProgress: 'İşlemde',
    WaitingForPart: 'Parça Bekliyor',
    Resolved: 'Çözüldü',
    Closed: 'Kapatıldı',
};

const STATUS_COLORS: Record<string, string> = {
    Open: '#EF4444',
    InProgress: '#F59E0B',
    WaitingForPart: '#8B5CF6',
    Resolved: '#10B981',
    Closed: '#6B7280',
};

export function AdminDashboardScreen({ navigation }: any) {
    const [stats, setStats] = useState<Stats>({
        totalActiveFaults: 0,
        thisWeekFaults: 0,
        pendingPurchaseOrders: 0,
        criticalStockItems: 0,
        recentFaults: [],
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStats = async () => {
        try {
            const [faultsRes, purchaseRes, materialsRes] = await Promise.all([
                api.get('/faultreports'),
                api.get('/purchaseorders').catch(() => ({ data: [] })),
                api.get('/materials').catch(() => ({ data: [] })),
            ]);

            const allFaults: RecentFault[] = faultsRes.data;
            const now = new Date();
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            const activeFaults = allFaults.filter(f => f.status !== 'Closed' && f.status !== 'Resolved');
            const weekFaults = allFaults.filter(f => new Date(f.createdAt) >= weekAgo);
            const pendingPO = purchaseRes.data.filter((p: any) => p.status === 'Pending').length;
            const criticalStock = materialsRes.data.filter(
                (m: any) => m.minStockThreshold && m.stockQuantity <= m.minStockThreshold
            ).length;

            setStats({
                totalActiveFaults: activeFaults.length,
                thisWeekFaults: weekFaults.length,
                pendingPurchaseOrders: pendingPO,
                criticalStockItems: criticalStock,
                recentFaults: allFaults.slice(0, 5),
            });
        } catch (e) {
            console.log('Dashboard stats error', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { fetchStats(); }, []));

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#6366F1" />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} />}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
                    <Ionicons name="menu-outline" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Yönetim Paneli</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* KPI Cards */}
            <View style={styles.kpiGrid}>
                <View style={[styles.kpiCard, { backgroundColor: '#EF4444' }]}>
                    <Ionicons name="alert-circle-outline" size={28} color="#fff" />
                    <Text style={styles.kpiValue}>{stats.totalActiveFaults}</Text>
                    <Text style={styles.kpiLabel}>Aktif Arıza</Text>
                </View>
                <View style={[styles.kpiCard, { backgroundColor: '#F59E0B' }]}>
                    <Ionicons name="time-outline" size={28} color="#fff" />
                    <Text style={styles.kpiValue}>{stats.thisWeekFaults}</Text>
                    <Text style={styles.kpiLabel}>Bu Hafta</Text>
                </View>
                <View style={[styles.kpiCard, { backgroundColor: '#8B5CF6' }]}>
                    <Ionicons name="cart-outline" size={28} color="#fff" />
                    <Text style={styles.kpiValue}>{stats.pendingPurchaseOrders}</Text>
                    <Text style={styles.kpiLabel}>Bekl. Sipariş</Text>
                </View>
                <View style={[styles.kpiCard, { backgroundColor: '#10B981' }]}>
                    <Ionicons name="warning-outline" size={28} color="#fff" />
                    <Text style={styles.kpiValue}>{stats.criticalStockItems}</Text>
                    <Text style={styles.kpiLabel}>Kritik Stok</Text>
                </View>
            </View>

            {/* Recent Faults */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Son Arızalar</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Arıza Takip')}>
                        <Text style={styles.seeAll}>Tümünü Gör →</Text>
                    </TouchableOpacity>
                </View>

                {stats.recentFaults.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Ionicons name="checkmark-circle-outline" size={40} color="#D1D5DB" />
                        <Text style={styles.emptyText}>Kayıt bulunamadı</Text>
                    </View>
                ) : (
                    stats.recentFaults.map(fault => (
                        <View key={fault.id} style={styles.faultRow}>
                            <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[fault.status] || '#9CA3AF' }]} />
                            <View style={styles.faultInfo}>
                                <Text style={styles.faultTitle} numberOfLines={1}>{fault.title}</Text>
                                <Text style={styles.faultAsset}>{fault.assetName}</Text>
                            </View>
                            <View style={[styles.priorityPill, { backgroundColor: PRIORITY_COLORS[fault.priority] + '22' }]}>
                                <Text style={[styles.priorityLabel, { color: PRIORITY_COLORS[fault.priority] }]}>
                                    {fault.priority}
                                </Text>
                            </View>
                        </View>
                    ))
                )}
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Hızlı Erişim</Text>
                <View style={styles.quickGrid}>
                    {[
                        { icon: 'analytics-outline', label: 'Analitik', screen: 'Analitik' },
                        { icon: 'cube-outline', label: 'Ekipmanlar', screen: 'Ekipmanlar' },
                        { icon: 'layers-outline', label: 'Stok', screen: 'Stok & Satın Alma' },
                        { icon: 'construct-outline', label: 'Arızalar', screen: 'Arıza Takip' },
                    ].map(item => (
                        <TouchableOpacity
                            key={item.screen}
                            style={styles.quickBtn}
                            onPress={() => navigation.navigate(item.screen)}
                        >
                            <Ionicons name={item.icon} size={26} color="#6366F1" />
                            <Text style={styles.quickLabel}>{item.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={{ height: 32 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F1F5F9' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' },
    header: {
        backgroundColor: '#6366F1',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 52,
        paddingBottom: 20,
        paddingHorizontal: 20,
    },
    menuBtn: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
    kpiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 16,
        gap: 12,
    },
    kpiCard: {
        flex: 1,
        minWidth: '44%',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
    },
    kpiValue: { fontSize: 32, fontWeight: '800', color: '#fff', marginTop: 6 },
    kpiLabel: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4, fontWeight: '600' },
    section: {
        backgroundColor: '#fff',
        borderRadius: 20,
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
    seeAll: { fontSize: 13, color: '#6366F1', fontWeight: '600' },
    faultRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
    faultInfo: { flex: 1 },
    faultTitle: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
    faultAsset: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
    priorityPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    priorityLabel: { fontSize: 11, fontWeight: '700' },
    emptyBox: { alignItems: 'center', paddingVertical: 24 },
    emptyText: { color: '#94A3B8', marginTop: 8, fontSize: 14 },
    quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
    quickBtn: {
        flex: 1,
        minWidth: '44%',
        backgroundColor: '#EEF2FF',
        borderRadius: 14,
        padding: 16,
        alignItems: 'center',
        gap: 8,
    },
    quickLabel: { fontSize: 13, fontWeight: '600', color: '#4338CA' },
});
