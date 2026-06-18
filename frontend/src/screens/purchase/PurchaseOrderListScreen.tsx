import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl, Modal, TextInput, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import api from '../../services/api';
import { formatDate } from '../../utils/dateUtils';

type TabType = 'pending' | 'ordered';

interface PurchaseOrder {
    id: number;
    workOrderTitle: string;
    requestedByName: string;
    materialName?: string;
    manualMaterialName?: string;
    quantity: number;
    note?: string;
    status: string;
    createdAt: string;
    faultPriority: string;
    adminReviewedAt?: string;
}

const PRIORITY_META: Record<string, { label: string; color: string }> = {
    Low:      { label: 'Düşük',  color: '#10B981' },
    Normal:   { label: 'Normal', color: '#3B82F6' },
    High:     { label: 'Yüksek', color: '#F59E0B' },
    Critical: { label: 'Kritik', color: '#EF4444' },
};

export function PurchaseOrderListScreen({ navigation }: any) {
    const [tab, setTab]         = useState<TabType>('pending');
    const [orders, setOrders]   = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Review modal
    const [selected, setSelected]       = useState<PurchaseOrder | null>(null);
    const [reviewNote, setReviewNote]   = useState('');
    const [reviewType, setReviewType]   = useState<'approve' | 'reject' | null>(null);
    const [submitting, setSubmitting]   = useState(false);

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

    // ✅ Güncellendi: Pending (sistem otomatik) + ApprovedByAdmin her ikisi de "bekleyen" sekmesinde
    const pendingOrders = orders.filter(o => o.status === 'Pending' || o.status === 'ApprovedByAdmin');
    const orderedOrders = orders.filter(o => o.status === 'Ordered' || o.status === 'RejectedByPurchasing');
    const displayList   = tab === 'pending' ? pendingOrders : orderedOrders;

    const openReview = (order: PurchaseOrder, type: 'approve' | 'reject') => {
        setSelected(order);
        setReviewType(type);
        setReviewNote('');
    };

    const handleReview = async () => {
        if (!selected || !reviewType) return;
        setSubmitting(true);
        try {
            await api.put(`/purchaseorders/${selected.id}/purchasing-review`, {
                isApproved: reviewType === 'approve',
                note: reviewNote.trim() || null,
            });
            setSelected(null);
            Toast.show({
                type: 'success',
                text1: reviewType === 'approve' ? 'Sipariş verildi!' : 'Talep reddedildi',
                text2: reviewType === 'approve' ? 'Depo sorumlusuna bildirim gönderildi.' : 'Teknisyen bilgilendirilecek.',
            });
            fetchOrders();
        } catch {
            Toast.show({ type: 'error', text1: 'İşlem başarısız', text2: 'Lütfen tekrar deneyin.' });
        } finally {
            setSubmitting(false);
        }
    };

    const getLabel = (o: PurchaseOrder) => o.materialName || o.manualMaterialName || 'Belirtilmemiş';

    const renderItem = useCallback(({ item }: { item: PurchaseOrder }) => {
        const prio = PRIORITY_META[item.faultPriority] ?? { label: item.faultPriority, color: '#6B7280' };
        const isOrdered   = item.status === 'Ordered';
        const isRejected  = item.status === 'RejectedByPurchasing';

        return (
            <View style={[styles.card, tab === 'pending' && styles.cardPending]}>
                {/* ✅ Otomatik sistem rozeti — absolute, touch engellemiyor */}
                {item.status === 'Pending' && (
                    <View style={styles.autoBadge} pointerEvents="none">
                        <Ionicons name="flash" size={9} color="#7C3AED" />
                        <Text style={styles.autoBadgeText}>Otomatik Sistem</Text>
                    </View>
                )}
                <View style={styles.cardHeader}>
                    <View style={styles.iconBox}>
                        <Ionicons
                            name={isOrdered ? 'checkmark-circle-outline' : isRejected ? 'close-circle-outline' : 'time-outline'}
                            size={22}
                            color={isOrdered ? '#10B981' : isRejected ? '#EF4444' : '#F59E0B'}
                        />
                    </View>
                    <View style={styles.cardHeaderInfo}>
                        <Text style={styles.materialName} numberOfLines={1}>{getLabel(item)}</Text>
                        <Text style={styles.workOrderTitle} numberOfLines={1}>{item.workOrderTitle}</Text>
                    </View>
                    <View style={[styles.qtyBadge, { backgroundColor: '#EEF2FF' }]}>
                        <Text style={styles.qtyText}>×{item.quantity}</Text>
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
                        <Text style={styles.detailLabel}>YÖN. ONAY</Text>
                        <Text style={styles.detailValue}>{formatDate(item.adminReviewedAt ?? item.createdAt)}</Text>
                    </View>
                </View>

                {item.note ? (
                    <View style={styles.noteBox}>
                        <Ionicons name="chatbubble-outline" size={12} color="#94A3B8" />
                        <Text style={styles.noteText} numberOfLines={2}>{item.note}</Text>
                    </View>
                ) : null}

                {/* Onayla / Reddet butonları — sadece bekleyen sekmesinde */}
                {tab === 'pending' && (
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={styles.rejectBtn}
                            onPress={() => openReview(item, 'reject')}
                        >
                            <Ionicons name="close-outline" size={16} color="#EF4444" />
                            <Text style={styles.rejectBtnText}>Reddet</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.approveBtn}
                            onPress={() => openReview(item, 'approve')}
                        >
                            <Ionicons name="checkmark-outline" size={16} color="#fff" />
                            <Text style={styles.approveBtnText}>Sipariş Ver</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Sipariş durumu banner */}
                {isOrdered && (
                    <View style={styles.orderedBanner}>
                        <Ionicons name="checkmark-circle" size={14} color="#059669" />
                        <Text style={styles.orderedBannerText}>Sipariş verildi — teslimat bekleniyor</Text>
                    </View>
                )}
                {isRejected && (
                    <View style={styles.rejectedBanner}>
                        <Ionicons name="close-circle" size={14} color="#EF4444" />
                        <Text style={styles.rejectedBannerText}>Reddedildi</Text>
                    </View>
                )}
            </View>
        );
    }, [tab, openReview, getLabel]);

    const EmptyComponent = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
                <Ionicons
                    name={tab === 'pending' ? 'time-outline' : 'cart-outline'}
                    size={52}
                    color={tab === 'pending' ? '#FCD34D' : '#6EE7B7'}
                />
            </View>
            <Text style={styles.emptyTitle}>
                {tab === 'pending' ? 'Onay bekleyen talep yok' : 'Sipariş geçmişi yok'}
            </Text>
            <Text style={styles.emptySubtitle}>
                {tab === 'pending'
                    ? 'Yönetici onaylı talepler burada görünür'
                    : 'Verdiğiniz siparişler burada listelenir'}
            </Text>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.openDrawer()}>
                    <Ionicons name="menu-outline" size={28} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Satın Alma Paneli</Text>
                    <Text style={styles.headerSubtitle}>Muhasebe & Tedarik Takibi</Text>
                </View>
                {pendingOrders.length > 0 && (
                    <View style={styles.urgentBadge}>
                        <Ionicons name="alert-circle" size={13} color="#fff" />
                        <Text style={styles.urgentText}>{pendingOrders.length}</Text>
                    </View>
                )}
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: '#FFFBEB' }]}>
                    <Text style={[styles.statNum, { color: '#D97706' }]}>{pendingOrders.length}</Text>
                    <Text style={styles.statLabel}>Onay Bekliyor</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={[styles.statCard, { backgroundColor: '#F0FDF4' }]}>
                    <Text style={[styles.statNum, { color: '#059669' }]}>
                        {orders.filter(o => o.status === 'Ordered').length}
                    </Text>
                    <Text style={styles.statLabel}>Sipariş Verildi</Text>
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
                    <Ionicons name="time-outline" size={16} color={tab === 'pending' ? '#6366F1' : '#94A3B8'} />
                    <Text style={[styles.tabText, tab === 'pending' && styles.tabTextActive]}>
                        Onay Bekleyen ({pendingOrders.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, tab === 'ordered' && styles.tabActive]}
                    onPress={() => setTab('ordered')}
                >
                    <Ionicons name="cart-outline" size={16} color={tab === 'ordered' ? '#6366F1' : '#94A3B8'} />
                    <Text style={[styles.tabText, tab === 'ordered' && styles.tabTextActive]}>
                        Siparişlerim ({orderedOrders.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {/* List */}
            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#6366F1" />
                </View>
            ) : (
                <FlatList
                    data={displayList}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    extraData={[tab, orders]}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); fetchOrders(); }}
                            colors={['#6366F1']}
                        />
                    }
                    ListEmptyComponent={<EmptyComponent />}
                />
            )}

            {/* Review Modal */}
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
                            <View style={[
                                styles.modalIconBox,
                                { backgroundColor: reviewType === 'approve' ? '#10B981' : '#EF4444' }
                            ]}>
                                <Ionicons
                                    name={reviewType === 'approve' ? 'cart-outline' : 'close-outline'}
                                    size={22}
                                    color="#fff"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>
                                    {reviewType === 'approve' ? 'Sipariş Ver' : 'Talebi Reddet'}
                                </Text>
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
                            <Text style={styles.inputLabel}>
                                {reviewType === 'approve' ? 'Sipariş Notu (Opsiyonel)' : 'Red Gerekçesi (Opsiyonel)'}
                            </Text>
                            <TextInput
                                style={styles.input}
                                value={reviewNote}
                                onChangeText={setReviewNote}
                                placeholder={reviewType === 'approve' ? 'Tedarikçi, fiyat, teslimat tarihi...' : 'Red sebebini belirtebilirsiniz...'}
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
                                style={[
                                    styles.confirmBtn,
                                    { backgroundColor: reviewType === 'approve' ? '#10B981' : '#EF4444' },
                                    submitting && { opacity: 0.7 }
                                ]}
                                onPress={handleReview}
                                disabled={submitting}
                            >
                                {submitting
                                    ? <ActivityIndicator size="small" color="#fff" />
                                    : <>
                                        <Ionicons
                                            name={reviewType === 'approve' ? 'checkmark-done-outline' : 'close-outline'}
                                            size={18}
                                            color="#fff"
                                        />
                                        <Text style={styles.confirmBtnText}>
                                            {reviewType === 'approve' ? 'Onayla' : 'Reddet'}
                                        </Text>
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
        backgroundColor: '#6366F1', flexDirection: 'row', alignItems: 'center',
        paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20, gap: 14,
    },
    menuBtn: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center',
    },
    headerCenter:   { flex: 1 },
    headerTitle:    { fontSize: 20, fontWeight: '800', color: '#fff' },
    headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
    urgentBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#EF4444', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
    },
    urgentText:     { color: '#fff', fontWeight: '800', fontSize: 13 },
    statsRow: {
        flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16,
        borderRadius: 16, overflow: 'hidden', elevation: 2,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8,
    },
    statCard:       { flex: 1, alignItems: 'center', paddingVertical: 14 },
    statNum:        { fontSize: 22, fontWeight: '800' },
    statLabel:      { fontSize: 10, fontWeight: '600', color: '#94A3B8', marginTop: 2 },
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
    tabActive:      { backgroundColor: '#EEF2FF' },
    tabText:        { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
    tabTextActive:  { color: '#6366F1' },
    list:           { padding: 16, paddingBottom: 40, gap: 12 },
    card: {
        backgroundColor: '#fff', borderRadius: 20, padding: 16, elevation: 2,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8,
    },
    autoBadge: {
        position: 'absolute', top: 10, right: 10,
        flexDirection: 'row', alignItems: 'center', gap: 3,
        backgroundColor: '#F3E8FF', paddingHorizontal: 6, paddingVertical: 2,
        borderRadius: 6, zIndex: 1,
    },
    autoBadgeText:  { fontSize: 9, fontWeight: '800', color: '#7C3AED', letterSpacing: 0.3 },
    cardPending:    { borderLeftWidth: 3, borderLeftColor: '#F59E0B' },
    cardHeader:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    iconBox: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center',
    },
    cardHeaderInfo: { flex: 1 },
    materialName:   { fontSize: 15, fontWeight: '700', color: '#1E293B' },
    workOrderTitle: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
    qtyBadge:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    qtyText:        { fontSize: 14, fontWeight: '800', color: '#6366F1' },
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
    actionRow:      { flexDirection: 'row', gap: 10, marginTop: 14 },
    rejectBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, borderWidth: 1.5, borderColor: '#FCA5A5', borderRadius: 12, paddingVertical: 11,
    },
    rejectBtnText:  { color: '#EF4444', fontSize: 14, fontWeight: '700' },
    approveBtn: {
        flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 11,
    },
    approveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    orderedBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10, marginTop: 12,
    },
    orderedBannerText:  { fontSize: 12, color: '#059669', fontWeight: '600' },
    rejectedBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10, marginTop: 12,
    },
    rejectedBannerText: { fontSize: 12, color: '#EF4444', fontWeight: '600' },
    emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
    emptyIconBox: {
        width: 96, height: 96, borderRadius: 48, backgroundColor: '#F8FAFC',
        justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    },
    emptyTitle:     { fontSize: 17, fontWeight: '700', color: '#334155', marginBottom: 8 },
    emptySubtitle:  { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 20 },
    modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent:   { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 32 },
    modalHandle:    { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
    modalHeader:    { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20, paddingBottom: 16 },
    modalIconBox:   { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
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
        flex: 2, borderRadius: 14, paddingVertical: 14,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
