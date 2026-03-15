import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import api from '../../services/api';
import { formatDate } from '../../utils/dateUtils';

interface FaultReport {
    id: number;
    assetName: string;
    title: string;
    priority: string;
    status: string;
    createdAt: string;
}

export function FaultListScreen({ navigation }: any) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [faults, setFaults] = useState<FaultReport[]>([]);
    const [filter, setFilter] = useState('All');
    const [search, setSearch] = useState('');

    const fetchFaults = async () => {
        try {
            const response = await api.get('/faultreports');
            setFaults(response.data);
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Arızalar yüklenemedi' });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { fetchFaults(); }, []));

    const getPriorityStyles = (priority: string) => {
        switch (priority) {
            case 'Critical': return { bg: '#FEE2E2', text: '#EF4444', label: 'KRİTİK' };
            case 'High': return { bg: '#FFF7ED', text: '#F97316', label: 'YÜKSEK' };
            case 'Medium': return { bg: '#EFF6FF', text: '#3B82F6', label: 'ORTA' };
            case 'Low': return { bg: '#F0FDF4', text: '#10B981', label: 'DÜŞÜK' };
            default: return { bg: '#F1F5F9', text: '#64748B', label: priority };
        }
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'Open': return { color: '#EF4444', text: 'Açık' };
            case 'InProgress': return { color: '#3B82F6', text: 'İşlemde' };
            case 'WaitingForPart': return { color: '#F97316', text: 'Parça Bekliyor' };
            case 'Resolved': return { color: '#10B981', text: 'Çözüldü' };
            case 'Closed': return { color: '#94A3B8', text: 'Kapandı' };
            default: return { color: '#94A3B8', text: status };
        }
    };

    const filtered = faults.filter(f => {
        const matchesFilter = filter === 'All' || f.status === filter;
        const matchesSearch = f.title.toLowerCase().includes(search.toLowerCase()) || 
                             f.assetName.toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const renderItem = ({ item }: { item: FaultReport }) => {
        const prio = getPriorityStyles(item.priority);
        const stat = getStatusStyles(item.status);

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('FaultDetail', { faultId: item.id })}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.assetBadge}>
                        <Ionicons name="hardware-chip-outline" size={14} color="#64748B" />
                        <Text style={styles.assetName}>{item.assetName}</Text>
                    </View>
                    <View style={[styles.priorityPill, { backgroundColor: prio.bg }]}>
                        <Text style={[styles.priorityText, { color: prio.text }]}>{prio.label}</Text>
                    </View>
                </View>

                <Text style={styles.faultTitle}>{item.title}</Text>

                <View style={styles.cardFooter}>
                    <View style={styles.statusRow}>
                        <View style={[styles.statusDot, { backgroundColor: stat.color }]} />
                        <Text style={styles.statusLabel}>{stat.text}</Text>
                    </View>
                    <View style={styles.dateRow}>
                        <Ionicons name="calendar-outline" size={12} color="#94A3B8" />
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
                <View style={styles.headerContent}>
                    <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.openDrawer()}>
                        <Ionicons name="menu-outline" size={28} color="#fff" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerTitle}>Arıza Kayıtları</Text>
                        <Text style={styles.headerSubtitle}>Tüm bildirimler ve durumlar</Text>
                    </View>
                </View>
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>{filtered.length}</Text>
                </View>
            </View>

            {/* Search and Filters */}
            <View style={styles.topActions}>
                <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={18} color="#94A3B8" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Arıza veya cihaz ara..."
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>

                <View style={styles.filterRow}>
                    {['All', 'Open', 'InProgress', 'Resolved'].map(f => (
                        <TouchableOpacity
                            key={f}
                            style={[styles.filterChip, filter === f && styles.filterChipActive]}
                            onPress={() => setFilter(f)}
                        >
                            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                                {f === 'All' ? 'Hepsi' : getStatusStyles(f).text}
                            </Text>
                        </TouchableOpacity>
                    ))}
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
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFaults(); }} />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="document-text-outline" size={64} color="#CBD5E1" />
                            <Text style={styles.emptyText}>Arıza kaydı bulunamadı</Text>
                        </View>
                    }
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreateFault')}>
                <Ionicons name="add" size={30} color="#fff" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F1F5F9' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { backgroundColor: '#6366F1', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerContent: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    menuBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
    headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
    countBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    countText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    topActions: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12 },
    searchInput: { flex: 1, height: 44, marginLeft: 8, fontSize: 14, color: '#1E293B' },
    filterRow: { flexDirection: 'row', gap: 8 },
    filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9' },
    filterChipActive: { backgroundColor: '#6366F1' },
    filterText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
    filterTextActive: { color: '#fff' },
    list: { padding: 16, paddingBottom: 100 },
    card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    assetBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    assetName: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },
    priorityPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    priorityText: { fontSize: 11, fontWeight: '800' },
    faultTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 16 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusLabel: { fontSize: 13, fontWeight: '600', color: '#475569' },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    dateText: { fontSize: 12, color: '#94A3B8' },
    emptyContainer: { alignItems: 'center', marginTop: 60 },
    emptyText: { fontSize: 15, color: '#94A3B8', marginTop: 16 },
    fab: { position: 'absolute', right: 24, bottom: 24, backgroundColor: '#6366F1', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
});
