import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl, ScrollView, TextInput
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../../services/api';

type FilterType = 'All' | 'Open' | 'InProgress' | 'WaitingForPart' | 'Resolved';

interface FaultReport {
    id: number;
    assetId: number;
    assetName: string;
    title: string;
    description: string;
    priority: string;
    status: string;
    reportedByName: string;
    createdAt: string;
    commentCount: number;
    workOrderCount: number;
    technicianNote?: string;
}

const FILTERS: { key: FilterType; label: string }[] = [
    { key: 'All', label: 'Tümü' },
    { key: 'Open', label: '🔴 Açık' },
    { key: 'InProgress', label: '🔵 İşlemde' },
    { key: 'WaitingForPart', label: '🟠 Parça Bekliyor' },
    { key: 'Resolved', label: '🟢 Çözüldü' },
];

const PRIORITY_META: Record<string, { color: string; label: string }> = {
    Critical: { color: '#EF4444', label: 'KRİTİK' },
    High: { color: '#F59E0B', label: 'YÜKSEK' },
    Normal: { color: '#3B82F6', label: 'ORTA' },
    Medium: { color: '#3B82F6', label: 'ORTA' },
    Low: { color: '#10B981', label: 'DÜŞÜK' },
};

const STATUS_META: Record<string, { color: string; bg: string; label: string }> = {
    Open: { color: '#EF4444', bg: '#FEF2F2', label: 'Açık' },
    InProgress: { color: '#3B82F6', bg: '#EFF6FF', label: 'İşlemde' },
    WaitingForPart: { color: '#F97316', bg: '#FFF7ED', label: 'Parça Bekliyor' },
    Resolved: { color: '#10B981', bg: '#ECFDF5', label: 'Çözüldü' },
    Closed: { color: '#94A3B8', bg: '#F9FAFB', label: 'Kapandı' },
};

export function AdminFaultTrackingScreen({ navigation }: any) {
    const [faults, setFaults] = useState<FaultReport[]>([]);
    const [filter, setFilter] = useState<FilterType>('All');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchFaults = async () => {
        try {
            const res = await api.get('/faultreports');
            setFaults(res.data);
        } catch {
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { fetchFaults(); }, []));

    const filtered = faults.filter(f => {
        const matchFilter = filter === 'All' || f.status === filter;
        const matchSearch = search === '' ||
            f.title.toLowerCase().includes(search.toLowerCase()) ||
            f.assetName.toLowerCase().includes(search.toLowerCase());
        return matchFilter && matchSearch;
    });

    const renderFault = ({ item }: { item: FaultReport }) => {
        const sm = STATUS_META[item.status] ?? { color: '#6B7280', bg: '#F9FAFB', label: item.status };
        const pm = PRIORITY_META[item.priority] ?? { color: '#6B7280', label: item.priority };

        return (
            <View style={styles.card}>
                {/* Card Top Bar */}
                <View style={[styles.cardTopBar, { backgroundColor: sm.color }]} />

                <View style={styles.cardBody}>
                    {/* Title Row */}
                    <View style={styles.cardTitleRow}>
                        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                        <View style={[styles.priorityBadge, { backgroundColor: pm.color }]}>
                            <Text style={styles.priorityBadgeText}>{pm.label}</Text>
                        </View>
                    </View>

                    {/* Asset & ID */}
                    <View style={styles.infoRow}>
                        <Ionicons name="hardware-chip-outline" size={14} color="#94A3B8" />
                        <Text style={styles.infoText}>{item.assetName}</Text>
                        <Text style={styles.idChip}>#{item.id}</Text>
                    </View>

                    {/* Description */}
                    {item.description ? (
                        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
                    ) : null}

                    {/* WaitingForPart note */}
                    {item.status === 'WaitingForPart' && item.technicianNote ? (
                        <View style={styles.noteBox}>
                            <Ionicons name="chatbubble-outline" size={13} color="#7C3AED" />
                            <Text style={styles.noteText}>{item.technicianNote}</Text>
                        </View>
                    ) : null}

                    {/* Footer */}
                    <View style={styles.cardFooter}>
                        <View style={[styles.statusBadge, { backgroundColor: sm.bg }]}>
                            <View style={[styles.statusDot, { backgroundColor: sm.color }]} />
                            <Text style={[styles.statusLabel, { color: sm.color }]}>{sm.label}</Text>
                        </View>
                        <View style={styles.metaRow}>
                            <Ionicons name="chatbubbles-outline" size={13} color="#94A3B8" />
                            <Text style={styles.metaText}>{item.commentCount}</Text>
                            <Ionicons name="person-outline" size={13} color="#94A3B8" style={{ marginLeft: 8 }} />
                            <Text style={styles.metaText}>{item.reportedByName}</Text>
                        </View>
                    </View>

                    <Text style={styles.dateText}>
                        {new Date(item.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
                    <Ionicons name="menu-outline" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Arıza Takip</Text>
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>{filtered.length}</Text>
                </View>
            </View>

            {/* Search and Filters Group */}
            <View style={styles.topActionsGroup}>
                <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={18} color="#94A3B8" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Arıza başlığı veya ekipman ara..."
                        placeholderTextColor="#94A3B8"
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>

                {/* Filter Chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingRight: 32 }}>
                    {FILTERS.map(f => (
                        <TouchableOpacity
                            key={f.key}
                            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
                            onPress={() => setFilter(f.key)}
                        >
                            <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#6366F1" />
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderFault}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFaults(); }} />}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Ionicons name="checkmark-done-circle-outline" size={56} color="#D1D5DB" />
                            <Text style={styles.emptyText}>Bu kategoride arıza yok</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F1F5F9' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
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
    countBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
    countText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    topActionsGroup: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        paddingVertical: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        zIndex: 10,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, height: 44, fontSize: 14, color: '#1E293B' },
    filterRow: { flexGrow: 0 },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    filterChipActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
    filterChipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
    filterChipTextActive: { color: '#fff' },
    list: { padding: 16, gap: 12, paddingBottom: 80 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
    },
    cardTopBar: { height: 4 },
    cardBody: { padding: 16 },
    cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', flex: 1, marginRight: 8 },
    priorityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    priorityBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
    infoText: { fontSize: 13, color: '#64748B', flex: 1 },
    idChip: { backgroundColor: '#F1F5F9', color: '#94A3B8', fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    description: { fontSize: 13, color: '#64748B', lineHeight: 19, marginBottom: 10 },
    noteBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#F5F3FF',
        borderRadius: 10,
        padding: 10,
        marginBottom: 10,
        gap: 6,
        borderLeftWidth: 3,
        borderLeftColor: '#7C3AED',
    },
    noteText: { fontSize: 12, color: '#5B21B6', flex: 1, lineHeight: 18 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, gap: 5 },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    statusLabel: { fontSize: 12, fontWeight: '700' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    metaText: { fontSize: 12, color: '#94A3B8', marginLeft: 2 },
    emptyText: { color: '#94A3B8', fontSize: 15, marginTop: 12 },
    dateText: { fontSize: 11, color: '#CBD5E1', marginTop: 8, textAlign: 'right' },
});
