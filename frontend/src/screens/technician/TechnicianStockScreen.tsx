import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Pressable,
    ActivityIndicator, RefreshControl, ScrollView, Modal, TextInput, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../../services/api';

interface Material {
    id: number;
    name: string;
    description?: string;
    unit?: string;
    type: string;
    stockQuantity: number;
    minStockThreshold?: number;
}

interface WorkOrder {
    id: number;
    faultReportTitle: string;
    status: string;
}

export function TechnicianStockScreen({ navigation }: any) {
    const [materials, setMaterials] = useState<Material[]>([]);
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
            console.log('Fetching technician stock data...');
            const [matRes, woRes] = await Promise.all([
                api.get('/materials'),
                api.get('/workorders')
            ]);
            setMaterials(matRes.data || []);
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
        if (!requestForm.workOrderId) {
            Alert.alert('Hata', 'Lütfen bir iş emri seçin.');
            return;
        }

        const qty = parseInt(requestForm.quantity);
        if (!qty || isNaN(qty) || qty <= 0) {
            Alert.alert('Hata', 'Geçerli bir miktar girin.');
            return;
        }

        setSubmitting(true);
        try {
            console.log('Sending purchase order:', { 
                workOrderId: requestForm.workOrderId,
                materialId: selectedMaterial.id, 
                quantity: qty 
            });
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
            console.error('Submit error:', e);
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
                    <Pressable
                        style={({ pressed }) => [styles.requestBtn, pressed && { opacity: 0.7 }]}
                        hitSlop={15}
                        onPress={() => {
                            setSelectedMaterial(item);
                            setShowRequestModal(true);
                        }}
                    >
                        <Ionicons name="cart-outline" size={16} color="#6366F1" />
                        <Text style={styles.requestBtnText}>Talep Oluştur</Text>
                    </Pressable>
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
                <Text style={styles.headerTitle}>Stok Durumu</Text>
                {criticalCount > 0 && (
                    <View style={styles.alertBadge}>
                        <Ionicons name="warning" size={14} color="#fff" />
                        <Text style={styles.alertCount}>{criticalCount}</Text>
                    </View>
                )}
            </View>

            {/* Critical Alert Banner */}
            {criticalCount > 0 && (
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
            ) : (
                <ScrollView
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
                >
                    {materials.length === 0 ? (
                        <View style={styles.emptyContainer}>
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
            )}
            {/* Parça Talebi Overlay (Pop-up) */}
            {showRequestModal && (
                <View style={[StyleSheet.absoluteFill, { zIndex: 999 }]}>
                    <Pressable style={styles.modalOverlay} onPress={() => setShowRequestModal(false)}>
                        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
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

                                <Pressable 
                                    style={({ pressed }) => [
                                        styles.submitBtn, 
                                        (!requestForm.quantity || !requestForm.workOrderId || submitting || pressed) && { opacity: 0.6 }
                                    ]} 
                                    onPress={handleCreateRequest}
                                    disabled={!requestForm.quantity || !requestForm.workOrderId || submitting}
                                    hitSlop={10}
                                >
                                    {submitting ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.submitBtnText}>Talebi Gönder</Text>
                                    )}
                                </Pressable>
                            </ScrollView>
                        </Pressable>
                    </Pressable>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F1F5F9' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        backgroundColor: '#6366F1', flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20,
    },
    menuBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff', flex: 1, textAlign: 'center' },
    alertBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EF4444', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, gap: 4 },
    alertCount: { color: '#fff', fontWeight: '800', fontSize: 13 },
    criticalBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', marginHorizontal: 16, marginTop: 10, borderRadius: 10, padding: 12, gap: 8, borderLeftWidth: 3, borderLeftColor: '#EF4444' },
    criticalBannerText: { color: '#EF4444', fontWeight: '600', fontSize: 13, flex: 1 },
    list: { padding: 16, gap: 10, paddingBottom: 40 },
    card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, flexDirection: 'row', justifyContent: 'space-between' },
    cardCritical: { borderWidth: 1.5, borderColor: '#FCA5A5' },
    stockLeft: { flex: 1, gap: 10 },
    typeChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
    typeText: { fontSize: 11, fontWeight: '800' },
    stockInfo: { flex: 1 },
    materialName: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
    materialDesc: { fontSize: 12, color: '#94A3B8' },
    thresholdText: { fontSize: 11, color: '#CBD5E1', marginTop: 4 },
    stockRight: { alignItems: 'flex-end', justifyContent: 'center', gap: 2, minWidth: 100 },
    stockQty: { fontSize: 24, fontWeight: '800' },
    stockUnit: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
    criticalAlert: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#FEF2F2', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 2 },
    criticalAlertText: { fontSize: 9, fontWeight: '800', color: '#EF4444' },
    requestBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    requestBtnText: { color: '#6366F1', fontSize: 11, fontWeight: '700' },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: 16, borderRadius: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
    sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    sectionIconBg: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
    sectionBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    sectionBadgeText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
    sectionContent: { gap: 10, paddingBottom: 10, marginTop: 8 },
    emptySectionText: { color: '#94A3B8', fontSize: 13, textAlign: 'center', paddingVertical: 20, fontStyle: 'italic' },
    emptyContainer: { alignItems: 'center', marginTop: 80 },
    emptyText: { fontSize: 15, color: '#94A3B8', marginTop: 16 },
    modalOverlay: { 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.6)', 
        justifyContent: 'center', 
        alignItems: 'center',
        padding: 20
    },
    modalContent: { 
        backgroundColor: '#fff', 
        borderRadius: 20, 
        width: '100%',
        maxHeight: '80%', 
        paddingBottom: 20,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
    modalBody: { padding: 20 },
    selectedMaterialName: { fontSize: 18, fontWeight: '700', color: '#6366F1', marginBottom: 4 },
    currentStockInfo: { fontSize: 13, color: '#64748B', marginBottom: 20 },
    inputLabel: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 8, marginTop: 12 },
    input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#1E293B' },
    submitBtn: { backgroundColor: '#6366F1', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 30 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    noWoBox: { padding: 16, backgroundColor: '#FFF7ED', borderRadius: 12, borderWidth: 1, borderColor: '#FFEDD5', marginTop: 8 },
    noWoText: { color: '#9A3412', fontSize: 13, textAlign: 'center' },
    woGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    woItem: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', width: '48%' },
    woItemActive: { backgroundColor: '#EEF2FF', borderColor: '#6366F1' },
    woId: { fontSize: 12, fontWeight: '800', color: '#64748B', marginBottom: 2 },
    woIdActive: { color: '#6366F1' },
    woTitle: { fontSize: 11, color: '#1E293B', fontWeight: '600' },
    woTitleActive: { color: '#1E293B' },
});
