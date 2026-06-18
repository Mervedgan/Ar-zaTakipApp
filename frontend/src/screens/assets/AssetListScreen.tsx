import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl, TextInput, ScrollView
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface Asset {
    id: number;
    name: string;
    description?: string;
    location?: string;
    serialNumber?: string;
    isActive: boolean;
    category: string;
    createdAt: string;
}

export function AssetListScreen({ navigation }: any) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('All');

    const CATEGORIES = [
        { key: 'All', label: 'Tümü' },
        { key: 'Makine', label: 'Makine' },
        { key: 'Araç', label: 'Araç' },
        { key: 'Ofis Eşyası', label: 'Ofis Eşyası' },
        { key: 'Diğer', label: 'Diğer' },
    ];

    const fetchAssets = async () => {
        try {
            const response = await api.get('/assets');
            setAssets(response.data);
        } catch (error: any) {
            Toast.show({ type: 'error', text1: 'Hata', text2: 'Cihazlar yüklenemedi' });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { fetchAssets(); }, []));

    const filtered = assets.filter(a => {
        const matchesFilter = filter === 'All' || a.category === filter;
        const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase()) ||
            (a.location || '').toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const getCategoryStyles = (category: string) => {
        switch (category) {
            case 'Makine': return { bg: '#EEF2FF', text: '#6366F1' };
            case 'Araç': return { bg: '#F5F3FF', text: '#7C3AED' };
            case 'Ofis Eşyası': return { bg: '#FFF7ED', text: '#F97316' };
            default: return { bg: '#F1F5F9', text: '#64748B' };
        }
    };

    const renderAsset = ({ item }: { item: Asset }) => (
        <TouchableOpacity 
            style={[styles.card, !item.isActive && styles.cardInactive]}
            activeOpacity={0.7}
        >
            <View style={styles.cardLeft}>
                <View style={[styles.iconCircle, { backgroundColor: item.isActive ? '#EEF2FF' : '#F1F5F9' }]}>
                    <Ionicons
                        name="hardware-chip-outline"
                        size={22}
                        color={item.isActive ? '#6366F1' : '#94A3B8'}
                    />
                </View>
            </View>
            <View style={styles.cardContent}>
                <View style={styles.cardTopRow}>
                    <Text style={styles.assetName}>{item.name}</Text>
                    {!item.isActive && (
                        <View style={styles.inactiveBadge}>
                            <Text style={styles.inactiveBadgeText}>Pasif</Text>
                        </View>
                    )}
                </View>
                <View style={styles.metaRow}>
                    {item.location ? (
                        <>
                            <Ionicons name="location-outline" size={12} color="#94A3B8" />
                            <Text style={styles.metaText}>{item.location}</Text>
                        </>
                    ) : null}
                    {item.serialNumber ? (
                        <>
                            <Text style={styles.metaDivider}>·</Text>
                            <Ionicons name="barcode-outline" size={12} color="#94A3B8" />
                            <Text style={styles.metaText}>{item.serialNumber}</Text>
                        </>
                    ) : null}
                </View>
                {item.description ? (
                    <Text style={styles.assetDesc} numberOfLines={1}>{item.description}</Text>
                ) : null}
                <View style={[styles.categoryBadge, { backgroundColor: getCategoryStyles(item.category).bg }]}>
                    <Text style={[styles.categoryBadgeText, { color: getCategoryStyles(item.category).text }]}>
                        {item.category}
                    </Text>
                </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Indigo Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.openDrawer()}>
                        <Ionicons name="menu-outline" size={28} color="#fff" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerTitle}>Cihaz Listesi</Text>
                        <Text style={styles.headerSubtitle}>Tüm varlıklar ve konumlar</Text>
                    </View>
                </View>
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>{filtered.length}</Text>
                </View>
            </View>

            <View style={styles.topActions}>
                <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={18} color="#94A3B8" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Cihaz adı veya konum ara..."
                        placeholderTextColor="#94A3B8"
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
                    {CATEGORIES.map(cat => (
                        <TouchableOpacity
                            key={cat.key}
                            style={[styles.filterChip, filter === cat.key && styles.filterChipActive]}
                            onPress={() => setFilter(cat.key)}
                        >
                            <Text style={[styles.filterText, filter === cat.key && styles.filterTextActive]}>
                                {cat.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#6366F1" />
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderAsset}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAssets(); }} />}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Ionicons name="cube-outline" size={56} color="#D1D5DB" />
                            <Text style={styles.emptyText}>Cihaz bulunamadı</Text>
                        </View>
                    }
                />
            )}

            {/* Themed FAB - Only for Technicians/Admins */}
            {user?.role !== 'Employee' && (
                <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreateAsset')}>
                    <Ionicons name="add" size={30} color="#fff" />
                </TouchableOpacity>
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
        paddingBottom: 24,
        paddingHorizontal: 20,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    menuBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
    headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
    countBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
    countText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    topActions: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    searchContainer: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
        margin: 16, marginBottom: 12, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E2E8F0',
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, height: 44, fontSize: 14, color: '#1E293B' },
    filterRow: { marginBottom: 16 },
    filterContent: { paddingHorizontal: 16, gap: 8 },
    filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
    filterChipActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
    filterText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
    filterTextActive: { color: '#fff' },
    list: { paddingHorizontal: 16, paddingBottom: 100, paddingTop: 4 },
    card: {
        backgroundColor: '#fff', borderRadius: 16, padding: 16,
        flexDirection: 'row', alignItems: 'center', marginBottom: 12,
        elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8,
    },
    cardInactive: { opacity: 0.6 },
    cardLeft: { marginRight: 12 },
    iconCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
    cardContent: { flex: 1 },
    cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    assetName: { fontSize: 16, fontWeight: '700', color: '#1E293B', flex: 1 },
    assetDesc: { fontSize: 13, color: '#64748B', marginTop: 2, marginBottom: 4 },
    inactiveBadge: { backgroundColor: '#F1F5F9', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
    inactiveBadgeText: { fontSize: 10, color: '#94A3B8', fontWeight: '700' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
    metaText: { fontSize: 13, color: '#94A3B8' },
    metaDivider: { color: '#CBD5E1', paddingHorizontal: 2 },
    categoryBadge: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
    categoryBadgeText: { fontSize: 11, fontWeight: '700' },
    fab: {
        position: 'absolute', right: 24, bottom: 24,
        backgroundColor: '#6366F1', width: 60, height: 60, borderRadius: 30,
        justifyContent: 'center', alignItems: 'center',
        elevation: 6, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    },
    emptyText: { color: '#94A3B8', fontSize: 15, marginTop: 12 },
});
