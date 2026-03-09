import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl, TextInput, Modal,
    ScrollView, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import api from '../../services/api';

interface Asset {
    id: number;
    name: string;
    description?: string;
    location?: string;
    serialNumber?: string;
    isActive: boolean;
    createdAt: string;
    faultCount?: number;
}

export function AdminAssetsScreen({ navigation }: any) {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    const [form, setForm] = useState({ name: '', description: '', location: '', serialNumber: '' });

    const fetchAssets = async () => {
        try {
            const [assetsRes, faultsRes] = await Promise.all([
                api.get('/assets'),
                api.get('/faultreports').catch(() => ({ data: [] })),
            ]);

            const assets: Asset[] = assetsRes.data;
            const faults: any[] = faultsRes.data;

            // Her asset için arıza sayısını hesapla
            const withCount = assets.map(a => ({
                ...a,
                faultCount: faults.filter(f => f.assetId === a.id).length,
            }));
            setAssets(withCount);
        } catch (error: any) {
            Toast.show({ type: 'error', text1: 'Bağlantı Hatası', text2: error.message || 'Ekipmanlar yüklenemedi' });
            console.log('Fetch Assets Error:', error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { fetchAssets(); }, []));

    const filtered = assets.filter(a =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        (a.location || '').toLowerCase().includes(search.toLowerCase())
    );

    const handleCreate = async () => {
        if (!form.name.trim()) {
            Alert.alert('Uyarı', 'Ekipman adı zorunludur.');
            return;
        }
        setSaving(true);
        try {
            await api.post('/assets', {
                name: form.name.trim(),
                description: form.description.trim() || null,
                location: form.location.trim() || null,
                serialNumber: form.serialNumber.trim() || null,
            });
            Toast.show({ type: 'success', text1: 'Ekipman eklendi!' });
            setModalVisible(false);
            setForm({ name: '', description: '', location: '', serialNumber: '' });
            setLoading(true);
            fetchAssets();
        } catch (e: any) {
            console.log('Asset create error:', e.response?.data || e.message);
            const errData = e.response?.data;
            let errMsg = 'Bir hata oluştu.';
            if (errData) {
                if (errData.message) errMsg = errData.message;
                else if (errData.errors) errMsg = Object.values(errData.errors).flat().join('\n');
                else if (typeof errData === 'string') errMsg = errData;
            }
            Toast.show({ type: 'error', text1: 'Hata', text2: errMsg });
        } finally {
            setSaving(false);
        }
    };

    const renderAsset = ({ item }: { item: Asset }) => (
        <View style={[styles.card, !item.isActive && styles.cardInactive]}>
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
            </View>
            <View style={styles.cardRight}>
                <Text style={[styles.faultCount, { color: (item.faultCount ?? 0) > 0 ? '#EF4444' : '#10B981' }]}>
                    {item.faultCount ?? 0}
                </Text>
                <Text style={styles.faultLabel}>arıza</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
                    <Ionicons name="menu-outline" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Ekipmanlar</Text>
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>{filtered.length}</Text>
                </View>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={18} color="#94A3B8" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Ekipman adı veya konum ara..."
                    placeholderTextColor="#94A3B8"
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            {loading ? (
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
                            <Text style={styles.emptyText}>Ekipman bulunamadı</Text>
                        </View>
                    }
                />
            )}

            {/* FAB */}
            <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                <Ionicons name="add" size={30} color="#fff" />
            </TouchableOpacity>

            {/* Add Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Yeni Ekipman Ekle</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close-circle-outline" size={28} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            {[
                                { key: 'name', label: 'Ekipman Adı *', placeholder: 'ör: CNC Tezgahı #3', icon: 'hardware-chip-outline' },
                                { key: 'location', label: 'Konum', placeholder: 'ör: B Hol, 2. Kat', icon: 'location-outline' },
                                { key: 'serialNumber', label: 'Seri No', placeholder: 'ör: SN-2024-001', icon: 'barcode-outline' },
                                { key: 'description', label: 'Açıklama', placeholder: 'İsteğe bağlı...', icon: 'document-text-outline' },
                            ].map(field => (
                                <View key={field.key} style={styles.formGroup}>
                                    <Text style={styles.formLabel}>{field.label}</Text>
                                    <View style={styles.inputWrapper}>
                                        <Ionicons name={field.icon} size={18} color="#94A3B8" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.formInput}
                                            placeholder={field.placeholder}
                                            placeholderTextColor="#CBD5E1"
                                            value={(form as any)[field.key]}
                                            onChangeText={val => setForm(prev => ({ ...prev, [field.key]: val }))}
                                            multiline={field.key === 'description'}
                                        />
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                        <TouchableOpacity
                            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                            onPress={handleCreate}
                            disabled={saving}
                        >
                            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Ekipmanı Kaydet</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
    searchContainer: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
        margin: 16, borderRadius: 12, paddingHorizontal: 12,
        elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, height: 44, fontSize: 14, color: '#1E293B' },
    list: { paddingHorizontal: 16, paddingBottom: 100, gap: 10 },
    card: {
        backgroundColor: '#fff', borderRadius: 14, padding: 14,
        flexDirection: 'row', alignItems: 'center',
        elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4,
    },
    cardInactive: { opacity: 0.6 },
    cardLeft: { marginRight: 12 },
    iconCircle: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
    cardContent: { flex: 1 },
    cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    assetName: { fontSize: 15, fontWeight: '700', color: '#1E293B', flex: 1 },
    inactiveBadge: { backgroundColor: '#F1F5F9', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
    inactiveBadgeText: { fontSize: 10, color: '#94A3B8', fontWeight: '700' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
    metaText: { fontSize: 12, color: '#94A3B8' },
    metaDivider: { color: '#CBD5E1', fontWeight: '700' },
    assetDesc: { fontSize: 12, color: '#CBD5E1', marginTop: 4 },
    cardRight: { alignItems: 'center', marginLeft: 8 },
    faultCount: { fontSize: 20, fontWeight: '800' },
    faultLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },
    fab: {
        position: 'absolute', right: 24, bottom: 28,
        backgroundColor: '#6366F1', width: 58, height: 58, borderRadius: 29,
        justifyContent: 'center', alignItems: 'center',
        elevation: 6, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
    },
    emptyText: { color: '#94A3B8', fontSize: 15, marginTop: 12 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
    formGroup: { marginBottom: 16 },
    formLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12 },
    inputIcon: { marginRight: 8 },
    formInput: { flex: 1, height: 44, fontSize: 14, color: '#1E293B' },
    saveBtn: { backgroundColor: '#6366F1', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
