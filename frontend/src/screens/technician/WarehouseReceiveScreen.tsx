import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl, Modal, TextInput
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import api from '../../services/api';
import { formatDate } from '../../utils/dateUtils';

type TabType = 'pending' | 'completed';

interface PurchaseOrder {
    id: number;
    workOrderTitle: string;
    requestedByName: string;
    assignedToUserName?: string;
    materialName?: string;
    manualMaterialName?: string;
    quantity: number;
    note?: string;
    status: string;
    createdAt: string;
    faultPriority: string;
    completedAt?: string;
}

const PRIORITY_META: Record<string, { label: string; color: string }> = {
    Low:      { label: 'Düşük',  color: '#10B981' },
    Normal:   { label: 'Normal', color: '#3B82F6' },
    High:     { label: 'Yüksek', color: '#F59E0B' },
    Critical: { label: 'Kritik', color: '#EF4444' },
};

export function WarehouseReceiveScreen({ navigation }: any) {
    const [tab, setTab]         = useState<TabType>('pending');
    const [orders, setOrders]   = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Teslim Al modal
    const [selected, setSelected]     = useState<PurchaseOrder | null>(null);
    const [receiveNote, setReceiveNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchOrders = async () => {
        try {
            const res = await api.get('/purchaseorders');
            setOrders(res.data);
        } catch {
            Toast.show({ type: 'error', text1: 'Siparişler yüklenemedi' });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { fetchOrders(); }, []));

    const pendingOrders   = orders.filter(o => o.status === 'Ordered');
    const completedOrders = orders.filter(o => o.status === 'Completed');
    const displayList     = tab === 'pending' ? pendingOrders : completedOrders;

    const handleReceive = async () => {
        if (!selected) return;
        setSubmitting(true);
        try {
            await api.put(`/purchaseorders/${selected.id}/complete`, {
                note: receiveNote.trim() || null,
            });
            setSelected(null);
            Toast.show({
                type: 'success',
                text1: 'Teslim alındı!',
                text2: 'Stok otomatik güncellendi.',
            });
            fetchOrders();
        } catch {
            Toast.show({ type: 'error', text1: 'İşlem başarısız' });
        } finally {
            setSubmitting(false);
        }
    };

    const getLabel = (o: PurchaseOrder) => o.materialName || o.manualMaterialName || 'Belirtilmemiş';

    const renderItem = ({ item }: { item: PurchaseOrder }) => {
        const prio      = PRIORITY_META[item.faultPriority] ?? { label: item.faultPriority, color: '#6B7280' };
        const isPending = item.status === 'Ordered';

        return (
            <View style={[styles.card, isPending && styles.cardOrdered]}>
                <View style={styles.cardHeader}>
                    <View style={[styles.iconBox, { backgroundColor: isPending ? '#FEF3C7' : '#F0FDF4' }]}>
                        <Ionicons
                            name={isPending ? 'cube-outline' : 'checkmark-circle-outline'}
                            size={22}
                            color={isPending ? '#D97706' : '#059669'}
                        />
                    </View>
                    <View style={styles.cardHeaderInfo}>
                        <Text style={styles.materialName} numberOfLines={1}>{getLabel(item)}</Text>
                        <Text style={styles.workOrderTitle} numberOfLines={1}>{item.workOrderTitle}</Text>
                    </View>
                    <View style={[styles.qtyBadge, { backgroundColor: isPending ? '#FEF3C7' : '#ECFDF5' }]}>
                        <Text style={[styles.qtyText, { color: isPending ? '#D97706' : '#059669' }]}>
                            ×{item.quantity}
                        </Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>TALEP EDEN</Text>
                        <View style={styles.detailRow}>
                            <Ionicons name="person-outline" size={12} color="#6366F1" />
                            <Text style={styles.detailValue}>{item.requestedByName}</Text>
                        </View>
                    </View>
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>ÖNCELİK</Text>
                        <View style={styles.detailRow}>
                            <View style={[styles.prioDot, { backgroundColor: prio.color }]} />
                            <Text style={[styles.detailValue, { color: prio.color }]}>{prio.label}</Text>
                        </View>
                    </View>
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>{isPending ? 'SİPARİŞ TARİHİ' : 'TESLİM TARİHİ'}</Text>
                        <Text style={styles.detailValue}>
                            {formatDate(isPending ? item.createdAt : (item.completedAt ?? item.createdAt))}
                        </Text>
                    </View>
                </View>

                {item.note ? (
                    <View style={styles.noteBox}>
                        <Ionicons name="chatbubble-outline" size={12} color="#94A3B8" />
                        <Text style={styles.noteText} numberOfLines={2}>{item.note}</Text>
                    </View>
                ) : null}

                {/* Teslim Al butonu — sadece bekleyen */}
                {isPending && (
                    <TouchableOpacity
                        style={styles.receiveBtn}
                        onPress={() => { setSelected(item); setReceiveNote(''); }}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="checkmark-done-outline" size={18} color="#fff" />
                        <Text style={styles.receiveBtnText}>Teslim Alındı</Text>
                    </TouchableOpacity>
                )}

                {/* Tamamlandı banner */}
                {!isPending && item.assignedToUserName && (
                    <View style={styles.completedBanner}>
                        <Ionicons name="checkmark-circle" size={14} color="#059669" />
                        <Text style={styles.completedBannerText}>
                            {item.assignedToUserName} teslim aldı
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.openDrawer()}>
                    <Ionicons name="menu-outline" size={28} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Teslimat Takibi</Text>
                    <Text style={styles.headerSubtitle}>Bekleyen & tamamlanan siparişler</Text>
                </View>
                {pendingOrders.length > 0 && (
                    <View style={styles.urgentBadge}>
                        <Ionicons name="cube" size={13} color="#fff" />
                        <Text style={styles.urgentText}>{pendingOrders.length}</Text>
                    </View>
                )}
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: '#FFFBEB' }]}>
                    <Text style={[styles.statNum, { color: '#D97706' }]}>{pendingOrders.length}</Text>
                    <Text style={styles.statLabel}>Bekleyen</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={[styles.statCard, { backgroundColor: '#F0FDF4' }]}>
                    <Text style={[styles.statNum, { color: '#059669' }]}>{completedOrders.length}</Text>
                    <Text style={styles.statLabel}>Tamamlanan</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={[styles.statCard, { backgroundColor: '#EEF2FF' }]}>
                    <Text style={[styles.statNum, { color: '#6366F1' }]}>{orders.length}</Text>
                    <Text style={styles.statLabel}>Toplam</Text>
                </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, tab === 'pending' && styles.tabActive]}
                    onPress={() => setTab('pending')}
                >
                    <Ionicons name="cube-outline" size={16} color={tab === 'pending' ? '#6366F1' : '#94A3B8'} />
                    <Text style={[styles.tabText, tab === 'pending' && styles.tabTextActive]}>
                        Bekleyen ({pendingOrders.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, tab === 'completed' && styles.tabActive]}
                    onPress={() => setTab('completed')}
                >
                    <Ionicons name="checkmark-circle-outline" size={16} color={tab === 'completed' ? '#6366F1' : '#94A3B8'} />
                    <Text style={[styles.tabText, tab === 'completed' && styles.tabTextActive]}>
                        Tamamlanan ({completedOrders.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#6366F1" />
                </View>
            ) : (
                <FlatList
                    data={displayList}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); fetchOrders(); }}
                            colors={['#6366F1']}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons
                                name={tab === 'pending' ? 'cube-outline' : 'checkmark-done-circle-outline'}
                                size={52}
                                color="#CBD5E1"
                            />
                            <Text style={styles.emptyTitle}>
                                {tab === 'pending' ? 'Bekleyen teslimat yok' : 'Tamamlanan teslimat yok'}
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                {tab === 'pending'
                                    ? 'Muhasebe sipariş verdiğinde burada görünür'
                                    : 'Teslim aldığınız siparişler burada listelenir'}
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Teslim Al Modal */}
            <Modal
                visible={!!selected}
                transparent
                animationType="slide"
                onRequestClose={() => setSelected(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHandle} />
                        <View style={styles.modalHeader}>
                            <View style={styles.modalIconBox}>
                                <Ionicons name="checkmark-done-outline" size={24} color="#fff" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>Teslim Alındı Olarak İşaretle</Text>
                                <Text style={styles.modalSubtitle} numberOfLines={1}>
                                    {selected ? getLabel(selected) : ''}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setSelected(null)}>
                                <Ionicons name="close" size={24} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>

                        {selected && (
                            <View style={styles.orderSummary}>
                                <View style={styles.summaryRow}>
                                    <Ionicons name="cube-outline" size={14} color="#6366F1" />
                                    <Text style={styles.summaryText}>
                                        <Text style={styles.summaryBold}>{getLabel(selected)}</Text>
                                        {' — '}×{selected.quantity}
                                    </Text>
                                </View>
                                <View style={styles.summaryRow}>
                                    <Ionicons name="person-outline" size={14} color="#6366F1" />
                                    <Text style={styles.summaryText}>
                                        Talep eden: <Text style={styles.summaryBold}>{selected.requestedByName}</Text>
                                    </Text>
                                </View>
                            </View>
                        )}

                        <View style={styles.modalBody}>
                            <Text style={styles.inputLabel}>Teslim Notu (Opsiyonel)</Text>
                            <TextInput
                                style={styles.input}
                                value={receiveNote}
                                onChangeText={setReceiveNote}
                                placeholder="Fatura no, tedarikçi adı, hasar durumu..."
                                placeholderTextColor="#CBD5E1"
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                            />
                        </View>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelected(null)}>
                                <Text style={styles.cancelBtnText}>Vazgeç</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmBtn, submitting && { opacity: 0.7 }]}
                                onPress={handleReceive}
                                disabled={submitting}
                            >
                                {submitting
                                    ? <ActivityIndicator size="small" color="#fff" />
                                    : <>
                                        <Ionicons name="checkmark-done-outline" size={18} color="#fff" />
                                        <Text style={styles.confirmBtnText}>Onayla</Text>
                                      </>
                                }
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container:      { flex: 1, backgroundColor: '#F8FAFC' },
    center:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        backgroundColor: '#059669', flexDirection: 'row', alignItems: 'center',
        paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20, gap: 14,
    },
    menuBtn: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center',
    },
    headerCenter:   { flex: 1 },
    headerTitle:    { fontSize: 20, fontWeight: '800', color: '#fff' },
    headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
    urgentBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#D97706', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
    },
    urgentText:     { color: '#fff', fontWeight: '800', fontSize: 13 },
    statsRow: {
        flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16,
        borderRadius: 16, overflow: 'hidden', elevation: 2,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8,
    },
    statCard:       { flex: 1, alignItems: 'center', paddingVertical: 14 },
    statNum:        { fontSize: 22, fontWeight: '800' },
    statLabel:      { fontSize: 11, fontWeight: '600', color: '#94A3B8', marginTop: 2 },
    statDivider:    { width: 1, backgroundColor: '#F1F5F9', alignSelf: 'stretch' },
    tabContainer: {
        flexDirection: 'row', marginHorizontal: 16, marginTop: 16, backgroundColor: '#fff',
        borderRadius: 14, padding: 4, elevation: 1,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4,
    },
    tab: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 10, borderRadius: 10, gap: 6,
    },
    tabActive:      { backgroundColor: '#ECFDF5' },
    tabText:        { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
    tabTextActive:  { color: '#059669' },
    list:           { padding: 16, paddingBottom: 40, gap: 12 },
    card: {
        backgroundColor: '#fff', borderRadius: 20, padding: 16, elevation: 2,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8,
    },
    cardOrdered:    { borderLeftWidth: 3, borderLeftColor: '#D97706' },
    cardHeader:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    iconBox:        { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    cardHeaderInfo: { flex: 1 },
    materialName:   { fontSize: 15, fontWeight: '700', color: '#1E293B' },
    workOrderTitle: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
    qtyBadge:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    qtyText:        { fontSize: 14, fontWeight: '800' },
    divider:        { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
    detailsRow:     { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    detailItem:     { flex: 1 },
    detailLabel:    { fontSize: 9, fontWeight: '800', color: '#CBD5E1', letterSpacing: 0.5, marginBottom: 4 },
    detailRow:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
    detailValue:    { fontSize: 12, fontWeight: '600', color: '#334155' },
    prioDot:        { width: 6, height: 6, borderRadius: 3 },
    noteBox: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 6,
        backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, marginTop: 12,
    },
    noteText:       { fontSize: 12, color: '#64748B', flex: 1 },
    receiveBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, backgroundColor: '#059669', borderRadius: 12, paddingVertical: 12, marginTop: 14,
    },
    receiveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    completedBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10, marginTop: 12,
    },
    completedBannerText: { fontSize: 12, color: '#059669', fontWeight: '600' },
    emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
    emptyTitle:     { fontSize: 17, fontWeight: '700', color: '#334155', marginTop: 16, marginBottom: 8 },
    emptySubtitle:  { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 20 },
    modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent:   { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 32 },
    modalHandle:    { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
    modalHeader:    { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20, paddingBottom: 16 },
    modalIconBox:   { width: 44, height: 44, borderRadius: 12, backgroundColor: '#059669', justifyContent: 'center', alignItems: 'center' },
    modalTitle:     { fontSize: 16, fontWeight: '700', color: '#1E293B' },
    modalSubtitle:  { fontSize: 13, color: '#94A3B8', marginTop: 2 },
    orderSummary: {
        backgroundColor: '#F8FAFC', marginHorizontal: 20, borderRadius: 14, padding: 14, gap: 8,
        borderWidth: 1, borderColor: '#E2E8F0',
    },
    summaryRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
    summaryText:    { fontSize: 13, color: '#64748B', flex: 1 },
    summaryBold:    { fontWeight: '700', color: '#1E293B' },
    modalBody:      { paddingHorizontal: 20, marginTop: 16 },
    inputLabel:     { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 8 },
    input: {
        backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
        borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
        fontSize: 14, color: '#1E293B', minHeight: 80,
    },
    modalFooter:    { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 20 },
    cancelBtn:      { flex: 1, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    cancelBtnText:  { fontSize: 15, fontWeight: '600', color: '#64748B' },
    confirmBtn: {
        flex: 2, backgroundColor: '#059669', borderRadius: 14, paddingVertical: 14,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
