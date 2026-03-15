import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import api from '../../services/api';
import { formatDate } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';

interface ListItem {
    id: number;
    faultReportId?: number;
    faultReportTitle?: string;
    title?: string;
    assetName?: string;
    status: string;
    createdAt: string;
}

export function MyWorkOrdersScreen({ navigation }: any) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [data, setData] = useState<ListItem[]>([]);
    const [search, setSearch] = useState('');

    const fetchData = async () => {
        try {
            if (user?.role === 'Employee') {
                const response = await api.get('/faultreports');
                const myReports = response.data
                    .filter((f: any) => f.reportedByUserId === user.id)
                    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setData(myReports);
            } else {
                const response = await api.get('/workorders');
                const sortedWorkOrders = response.data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setData(sortedWorkOrders);
            }
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Veriler yüklenemedi' });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { fetchData(); }, [user?.id]));

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'Assigned': return { color: '#3B82F6', text: 'Atandı' };
            case 'InProgress': return { color: '#F59E0B', text: 'İşlemde' };
            case 'WaitingForPart': return { color: '#EF4444', text: 'Parça Bekliyor' };
            case 'Completed': return { color: '#10B981', text: 'Tamamlandı' };
            case 'Resolved': return { color: '#10B981', text: 'Çözüldü' };
            default: return { color: '#94A3B8', text: status };
        }
    };

    const filtered = data.filter(item => {
        const title = item.faultReportTitle || item.title || '';
        return title.toLowerCase().includes(search.toLowerCase());
    });

    const renderItem = ({ item }: { item: ListItem }) => {
        const stat = getStatusStyles(item.status);
        const title = item.faultReportTitle || item.title;
        const targetId = item.faultReportId || item.id;

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('FaultDetail', { faultId: targetId })}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.idBadge}>
                        <Text style={styles.idText}>#{item.id}</Text>
                    </View>
                    <View style={[styles.statusDot, { backgroundColor: stat.color }]} />
                </View>

                <Text style={styles.faultTitle}>{title}</Text>

                <View style={styles.cardFooter}>
                    <View style={styles.statusRow}>
                        <Text style={[styles.statusLabel, { color: stat.color }]}>{stat.text}</Text>
                    </View>
                    <View style={styles.dateRow}>
                        <Ionicons name="calendar-outline" size={14} color="#94A3B8" />
                        <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Indigo Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.openDrawer()}>
                        <Ionicons name="menu-outline" size={28} color="#fff" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerTitle}>İşlemlerim</Text>
                        <Text style={styles.headerSubtitle}>
                            {user?.role === 'Technician' ? 'Size atanan aktif görevler' : 'Bildirdiğiniz arıza kayıtları'}
                        </Text>
                    </View>
                </View>
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>{filtered.length}</Text>
                </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchSection}>
                <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={18} color="#94A3B8" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="İş emri ara..."
                        placeholderTextColor="#CBD5E1"
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#6366F1" />
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons 
                                name={user?.role === 'Technician' ? 'briefcase-outline' : 'document-text-outline'} 
                                size={64} 
                                color="#D1D5DB" 
                            />
                            <Text style={styles.emptyText}>
                                {user?.role === 'Technician' ? 'Henüz bir iş atamanız yok' : 'Henüz bir arıza kaydınız yok'}
                            </Text>
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
    searchSection: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E2E8F0' },
    searchInput: { flex: 1, height: 44, marginLeft: 8, fontSize: 14, color: '#1E293B' },
    list: { padding: 16 },
    card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    idBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    idText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    faultTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 16 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 },
    statusRow: { flexDirection: 'row', alignItems: 'center' },
    statusLabel: { fontSize: 13, fontWeight: '700' },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    dateText: { fontSize: 12, color: '#94A3B8' },
    emptyContainer: { alignItems: 'center', marginTop: 80 },
    emptyText: { fontSize: 15, color: '#94A3B8', marginTop: 16 }
});
