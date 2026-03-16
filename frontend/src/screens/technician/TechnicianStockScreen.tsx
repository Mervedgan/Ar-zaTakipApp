import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl, ScrollView, Modal, TextInput, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../../services/api';
import { formatDate } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';

type TabType = 'stock' | 'purchase';

interface Material {
    id: number;
    name: string;
    description?: string;
    unit?: string;
    type: string;
    stockQuantity: number;
    minStockThreshold?: number;
}

interface PurchaseOrder {
    id: number;
    materialName?: string;
    manualMaterialName?: string;
    quantity: number;
    status: string;
    note?: string;
    requestedByName?: string;
    createdAt: string;
}

interface WorkOrder {
    id: number;
    faultReportTitle: string;
    status: string;
}

const PO_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
    Pending: { label: 'Beklemede', color: '#F97316', bg: '#FFF7ED' },
    ApprovedByAdmin: { label: 'Onaylandı', color: '#10B981', bg: '#ECFDF5' },
    RejectedByAdmin: { label: 'Reddedildi', color: '#EF4444', bg: '#FEF2F2' },
    Completed: { label: 'Tamamlandı', color: '#6366F1', bg: '#EEF2FF' },
};

export function TechnicianStockScreen({ navigation }: any) {
    const { user } = useAuth();
    const [tab, setTab] = useState<TabType>('stock');
    const [materials, setMaterials] = useState<Material[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Accordion states
    const [sparePartsExpanded, setSparePartsExpanded] = useState(true);
    const [consumablesExpanded, setConsumablesExpanded] = useState(true);

    // Modals & Forms
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [requestForm, setRequestForm] = useState({ 
        workOrderId: null as number | null,
        quantity: '', 
        note: '' 
    });

    const fetchData = useCallback(async () => {
        try {
            const [matRes, poRes, woRes] = await Promise.all([
                api.get('/materials').catch(() => ({ data: [] })),
                api.get('/purchaseorders').catch(() => ({ data: [] })),
                api.get('/workorders').catch(() => ({ data: [] })),
            ]);
            
            setMaterials(matRes.data || []);
            setPurchaseOrders(poRes.data || []);
            
            // Filtreleme: Sadece aktif iş emirleri
            const activeWos = (woRes.data || []).filter((w: any) => 
                w.status === 'Assigned' || w.status === 'InProgress' || w.status === 'WaitingForPart'
            );
            setWorkOrders(activeWos);
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const handleCreateRequest = async () => {
        if (!selectedMaterial) return;
        if (!requestForm.workOrderId) return Alert.alert('Hata', 'Lütfen bir iş emri seçin.');

        const qty = parseInt(requestForm.quantity);
        if (!qty || isNaN(qty) || qty <= 0) return Alert.alert('Hata', 'Geçerli bir miktar girin.');

        setSubmitting(true);
        try {
            await api.post('/purchaseorders', {
                workOrderId: requestForm.workOrderId,
                materialId: selectedMaterial.id,
                quantity: qty,
                note: requestForm.note
            });
            setShowRequestModal(false);
            setRequestForm({ workOrderId: null, quantity: '', note: '' });
            fetchData();
            Alert.alert('Başarılı', 'Parça talebi oluşturuldu.');
        } catch (e: any) {
            const msg = e.response?.data || 'Talep oluşturulurken bir hata oluştu.';
            Alert.alert('Hata', typeof msg === 'string' ? msg : 'Talep oluşturulamadı.');
        } finally {
            setSubmitting(false);
        }
    };

    useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

    const criticalCount = materials.filter(m => m.minStockThreshold && m.stockQuantity <= m.minStockThreshold).length;
    const spareParts = materials.filter(m => m.type === 'SparePart');
    const consumables = materials.filter(m => m.type === 'Consumable');

    const renderMaterial = (item: Material) => {
        const isCritical = item.minStockThreshold !== undefined && item.stockQuantity <= item.minStockThreshold;
        const isLow = item.minStockThreshold !== undefined && item.stockQuantity <= item.minStockThreshold * 1.5;

        return (
            <View key={item.id} style={[styles.card, isCritical && styles.cardCritical]}>
                <View style={styles.stockLeft}>
                    <View style={[styles.typeChip, { backgroundColor: item.type === 'SparePart' ? '#EEF2FF' : '#ECFDF5' }]}>
                        <Text style={[styles.typeText, { color: item.type === 'SparePart' ? '#6366F1' : '#059669' }]}>
                            {item.type === 'SparePart' ? 'Yedek' : 'Sarf'}
                        </Text>
                    </View>
                    <View style={styles.stockInfo}>
                        <Text style={styles.materialName}>{item.name}</Text>
                        {item.description ? <Text style={styles.materialDesc} numberOfLines={1}>{item.description}</Text> : null}
                        {item.minStockThreshold ? (
                            <Text style={styles.thresholdText}>Min. Stok: {item.minStockThreshold} {item.unit ?? 'adet'}</Text>
                        ) : null}
                    </View>
                </View>
                <View style={styles.stockRight}>
                    <Text style={[
                        styles.stockQty,
                        isCritical ? { color: '#EF4444' } : isLow ? { color: '#F59E0B' } : { color: '#10B981' }
                    ]}>
                        {item.stockQuantity}
                    </Text>
                    <Text style={styles.stockUnit}>{item.unit ?? 'adet'}</Text>
                    {isCritical && (
                        <View style={styles.criticalAlert}>
                            <Ionicons name="warning" size={12} color="#EF4444" />
                            <Text style={styles.criticalAlertText}>KRİTİK</Text>
                        </View>
                    )}
                    {(user?.role !== 'Technician') && (
                        <TouchableOpacity
                            style={styles.addStockBtn}
                            onPress={() => {
                                setSelectedMaterial(item);
                                setShowRequestModal(true);
                            }}
                        >
                            <Ionicons name="cart-outline" size={16} color="#6366F1" />
                            <Text style={styles.addStockBtnText}>Talep Oluştur</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    const renderPurchase = ({ item }: { item: PurchaseOrder }) => {
        const meta = PO_STATUS_META[item.status] ?? { label: item.status, color: '#6B7280', bg: '#F9FAFB' };
        const name = item.materialName || item.manualMaterialName || 'Belirtilmemiş';

        return (
            <View key={item.id} style={styles.card}>
                <View style={styles.poLeft}>
                    <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                        <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                    <View style={styles.poInfo}>
                        <Text style={styles.poName}>{name}</Text>
                        <Text style={styles.poQty}>Miktar: <Text style={{ fontWeight: '700' }}>{item.quantity}</Text></Text>
                        {item.note ? <Text style={styles.poNote} numberOfLines={1}>Not: {item.note}</Text> : null}
                    </View>
                </View>
                <Text style={styles.poDate}>
                    {formatDate(item.createdAt)}
                </Text>
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
                <Text style={styles.headerTitle}>Stok & Satın Alma</Text>
                {criticalCount > 0 && (
                    <View style={styles.alertBadge}>
                        <Ionicons name="warning" size={14} color="#fff" />
                        <Text style={styles.alertCount}>{criticalCount}</Text>
                    </View>
                )}
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                <TouchableOpacity style={[styles.tab, tab === 'stock' && styles.tabActive]} onPress={() => setTab('stock')}>
                    <Ionicons name="layers-outline" size={16} color={tab === 'stock' ? '#6366F1' : '#94A3B8'} />
                    <Text style={[styles.tabText, tab === 'stock' && styles.tabTextActive]}>
                        Stok Durumu ({materials.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, tab === 'purchase' && styles.tabActive]} onPress={() => setTab('purchase')}>
                    <Ionicons name="cart-outline" size={16} color={tab === 'purchase' ? '#6366F1' : '#94A3B8'} />
                    <Text style={[styles.tabText, tab === 'purchase' && styles.tabTextActive]}>
                        Taleplerim ({purchaseOrders.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Critical Alert Banner */}
            {tab === 'stock' && criticalCount > 0 && (
                <View style={styles.criticalBanner}>
                    <Ionicons name="warning-outline" size={18} color="#EF4444" />
                    <Text style={styles.criticalBannerText}>
                        {criticalCount} kalem kritik stok seviyesinin altında!
                    </Text>
                </View>
            )}

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#6366F1" />
                </View>
            ) : tab === 'stock' ? (
                <ScrollView
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
                >
                    {materials.length === 0 ? (
                        <View style={styles.center}>
                            <Ionicons name="layers-outline" size={56} color="#D1D5DB" />
                            <Text style={styles.emptyText}>Henüz stok kaydı yok</Text>
                        </View>
                    ) : (
                        <>
                            {/* Spare Parts Section */}
                            <TouchableOpacity
                                style={styles.sectionHeader}
                                onPress={() => setSparePartsExpanded(!sparePartsExpanded)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.sectionHeaderLeft}>
                                    <View style={[styles.sectionIconBg, { backgroundColor: '#EEF2FF' }]}>
                                        <Ionicons name="build-outline" size={18} color="#6366F1" />
                                    </View>
                                    <Text style={styles.sectionTitle}>Yedek Parçalar</Text>
                                    <View style={styles.sectionBadge}>
                                        <Text style={styles.sectionBadgeText}>{spareParts.length}</Text>
                                    </View>
                                </View>
                                <Ionicons name={sparePartsExpanded ? "chevron-up" : "chevron-down"} size={20} color="#64748B" />
                            </TouchableOpacity>

                            {sparePartsExpanded && (
                                <View style={styles.sectionContent}>
                                    {spareParts.length === 0 ? (
                                        <Text style={styles.emptySectionText}>Kayıtlı yedek parça yok.</Text>
                                    ) : (
                                        spareParts.map((item: Material) => renderMaterial(item))
                                    )}
                                </View>
                            )}

                            {/* Consumables Section */}
                            <TouchableOpacity
                                style={[styles.sectionHeader, { marginTop: 16 }]}
                                onPress={() => setConsumablesExpanded(!consumablesExpanded)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.sectionHeaderLeft}>
                                    <View style={[styles.sectionIconBg, { backgroundColor: '#ECFDF5' }]}>
                                        <Ionicons name="color-fill-outline" size={18} color="#059669" />
                                    </View>
                                    <Text style={styles.sectionTitle}>Sarf Malzemeler</Text>
                                    <View style={styles.sectionBadge}>
                                        <Text style={styles.sectionBadgeText}>{consumables.length}</Text>
                                    </View>
                                </View>
                                <Ionicons name={consumablesExpanded ? "chevron-up" : "chevron-down"} size={20} color="#64748B" />
                            </TouchableOpacity>

                            {consumablesExpanded && (
                                <View style={styles.sectionContent}>
                                    {consumables.length === 0 ? (
                                        <Text style={styles.emptySectionText}>Kayıtlı sarf malzeme yok.</Text>
                                    ) : (
                                        consumables.map((item: Material) => renderMaterial(item))
                                    )}
                                </View>
                            )}
                        </>
                    )}
                </ScrollView>
            ) : (
                <FlatList
                    data={purchaseOrders}
                    keyExtractor={(item: any) => item.id.toString()}
                    renderItem={renderPurchase}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Ionicons name="cart-outline" size={56} color="#D1D5DB" />
                            <Text style={styles.emptyText}>Talebiniz bulunmuyor</Text>
                        </View>
                    }
                />
            )}

            {/* Parça Talebi Modal */}
            <Modal visible={showRequestModal} transparent animationType="slide" onRequestClose={() => setShowRequestModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Parça Talebi Oluştur</Text>
                            <TouchableOpacity onPress={() => setShowRequestModal(false)}>
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.modalBody}>
                            <Text style={styles.selectedMaterialName}>{selectedMaterial?.name || 'Malzeme'}</Text>
                            <Text style={styles.currentStockInfo}>
                                Mevcut Stok: {selectedMaterial?.stockQuantity ?? 0} {selectedMaterial?.unit || 'birim'}
                            </Text>

                            <Text style={styles.inputLabel}>İstenen Miktar *</Text>
                            <TextInput 
                                style={styles.input} 
                                value={requestForm.quantity} 
                                onChangeText={(t) => setRequestForm({ ...requestForm, quantity: t })} 
                                keyboardType="number-pad" 
                                placeholder={`Örn: 2 ${selectedMaterial?.unit || 'adet'}`} 
                            />

                            <Text style={styles.inputLabel}>İlgili İş Emri Seçin *</Text>
                            {workOrders.length === 0 ? (
                                <View style={styles.noWoBox}>
                                    <Text style={styles.noWoText}>Üzerinize atanmış aktif iş emri bulunamadı.</Text>
                                </View>
                            ) : (
                                <View style={styles.woGrid}>
                                    {workOrders.map((wo) => (
                                        <TouchableOpacity
                                            key={wo.id}
                                            style={[styles.woItem, requestForm.workOrderId === wo.id && styles.woItemActive]}
                                            onPress={() => setRequestForm({ ...requestForm, workOrderId: wo.id })}
                                        >
                                            <Text style={[styles.woId, requestForm.workOrderId === wo.id && styles.woIdActive]}>
                                                #{wo.id}
                                            </Text>
                                            <Text style={[styles.woTitle, requestForm.workOrderId === wo.id && styles.woTitleActive]} numberOfLines={2}>
                                                {wo.faultReportTitle}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            <Text style={styles.inputLabel}>Gerekçe / Not (Opsiyonel)</Text>
                            <TextInput 
                                style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
                                value={requestForm.note} 
                                onChangeText={(t) => setRequestForm({ ...requestForm, note: t })} 
                                multiline 
                                placeholder="Talebinizle ilgili not düşebilirsiniz..." 
                            />

                            <TouchableOpacity 
                                style={[
                                    styles.submitBtn, 
                                    (!requestForm.quantity || !requestForm.workOrderId || submitting) && { opacity: 0.6 }
                                ]} 
                                onPress={handleCreateRequest}
                                disabled={!requestForm.quantity || !requestForm.workOrderId || submitting}
                            >
                                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Talebi Gönder</Text>}
                            </TouchableOpacity>
                        </ScrollView>
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
        backgroundColor: '#6366F1', flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20,
    },
    menuBtn: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff', flex: 1, textAlign: 'center' },
    alertBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EF4444', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, gap: 4 },
    alertCount: { color: '#fff', fontWeight: '800', fontSize: 13 },
    tabs: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16, borderRadius: 14, padding: 4 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
    tabActive: { backgroundColor: '#EEF2FF' },
    tabText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
    tabTextActive: { color: '#6366F1' },
    criticalBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', marginHorizontal: 16, marginTop: 10, borderRadius: 10, padding: 12, gap: 8, borderLeftWidth: 3, borderLeftColor: '#EF4444' },
    criticalBannerText: { color: '#EF4444', fontWeight: '600', fontSize: 13, flex: 1 },
    list: { padding: 16, gap: 10, paddingBottom: 40 },
    card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4 },
    cardCritical: { borderWidth: 1.5, borderColor: '#FCA5A5' },
    stockLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    typeChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
    typeText: { fontSize: 11, fontWeight: '800' },
    stockInfo: { flex: 1 },
    materialName: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
    materialDesc: { fontSize: 12, color: '#94A3B8' },
    thresholdText: { fontSize: 11, color: '#CBD5E1', marginTop: 4 },
    stockRight: { alignItems: 'flex-end', justifyContent: 'center', gap: 2 },
    stockQty: { fontSize: 22, fontWeight: '800' },
    stockUnit: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
    criticalAlert: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#FEF2F2', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 2 },
    criticalAlertText: { fontSize: 9, fontWeight: '800', color: '#EF4444' },
    statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start', marginBottom: 6 },
    statusText: { fontSize: 11, fontWeight: '800' },
    poLeft: { flex: 1 },
    poInfo: {},
    poName: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
    poQty: { fontSize: 12, color: '#64748B' },
    poNote: { fontSize: 12, color: '#94A3B8', marginTop: 2, fontStyle: 'italic' },
    poDate: { fontSize: 11, color: '#CBD5E1', textAlign: 'right', marginTop: 4 },
    emptyText: { color: '#94A3B8', fontSize: 15, marginTop: 12 },
    addStockBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    addStockBtnText: { color: '#6366F1', fontSize: 11, fontWeight: '700' },

    // Accordion Styles
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        padding: 14,
        borderRadius: 14,
        elevation: 2,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
        marginBottom: 8,
    },
    sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    sectionIconBg: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
    sectionBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    sectionBadgeText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
    sectionContent: { gap: 10, paddingBottom: 10 },
    emptySectionText: { color: '#94A3B8', fontSize: 13, textAlign: 'center', paddingVertical: 20, fontStyle: 'italic' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingBottom: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
    modalBody: { padding: 20 },
    selectedMaterialName: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
    currentStockInfo: { fontSize: 14, color: '#64748B', marginBottom: 12 },
    inputLabel: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 6, marginTop: 12 },
    input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#1E293B' },
    submitBtn: { backgroundColor: '#6366F1', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    noWoBox: { padding: 12, backgroundColor: '#FEF2F2', borderRadius: 10, marginTop: 8 },
    noWoText: { fontSize: 12, color: '#EF4444', textAlign: 'center' },
    woGrid: { gap: 8, marginTop: 8 },
    woItem: { padding: 12, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10 },
    woItemActive: { backgroundColor: '#EEF2FF', borderColor: '#6366F1' },
    woId: { fontSize: 12, fontWeight: '700', color: '#64748B' },
    woIdActive: { color: '#6366F1' },
    woTitle: { fontSize: 14, color: '#1E293B' },
    woTitleActive: { fontWeight: '600' },
});
