import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl, ScrollView, Modal, TextInput, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../../services/api';

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

const PO_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
    Pending: { label: 'Bekliyor', color: '#D97706', bg: '#FFFBEB' },
    ApprovedByAdmin: { label: 'Onaylandı', color: '#059669', bg: '#ECFDF5' },
    RejectedByAdmin: { label: 'Reddedildi', color: '#EF4444', bg: '#FEF2F2' },
    Completed: { label: 'Tamamlandı', color: '#6366F1', bg: '#EEF2FF' },
};

export function AdminStockScreen({ navigation }: any) {
    const [tab, setTab] = useState<TabType>('stock');
    const [materials, setMaterials] = useState<Material[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modals & Forms
    const [showAddModal, setShowAddModal] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

    const [addForm, setAddForm] = useState({ name: '', description: '', unit: 'adet', type: 'SparePart', initialStock: '0', minStock: '0' });
    const [updateForm, setUpdateForm] = useState({ quantity: '', type: 'In', reason: 'Manuel Stok Girişi' });

    const fetchData = async () => {
        try {
            const [matRes, poRes] = await Promise.all([
                api.get('/materials').catch(() => ({ data: [] })),
                api.get('/purchaseorders').catch(() => ({ data: [] })),
            ]);
            setMaterials(matRes.data);
            setPurchaseOrders(poRes.data);
        } catch {
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleAddMaterial = async () => {
        if (!addForm.name.trim()) return Alert.alert('Hata', 'Malzeme adı zorunludur.');
        try {
            await api.post('/materials', {
                name: addForm.name,
                description: addForm.description,
                unit: addForm.unit,
                type: addForm.type === 'SparePart' ? 0 : 1, // SparePart=0, Consumable=1
                initialStock: parseInt(addForm.initialStock) || 0,
                minStockThreshold: parseInt(addForm.minStock) || null
            });
            setShowAddModal(false);
            setAddForm({ name: '', description: '', unit: 'adet', type: 'SparePart', initialStock: '0', minStock: '0' });
            fetchData();
        } catch (e: any) {
            Alert.alert('Hata', 'Malzeme eklenirken hata oluştu.');
        }
    };

    const handleUpdateStock = async () => {
        if (!selectedMaterial) return;
        const qty = parseInt(updateForm.quantity);
        if (!qty || isNaN(qty)) return Alert.alert('Hata', 'Geçerli bir miktar girin.');

        try {
            const finalQty = updateForm.type === 'In' ? Math.abs(qty) : -Math.abs(qty);
            await api.post(`/materials/${selectedMaterial.id}/stock`, {
                quantity: finalQty,
                reason: updateForm.reason
            });
            setShowUpdateModal(false);
            setUpdateForm({ quantity: '', type: 'In', reason: 'Manuel Stok Girişi' });
            fetchData();
        } catch (e: any) {
            Alert.alert('Hata', 'Stok güncellenirken hata oluştu.');
        }
    };

    useFocusEffect(useCallback(() => { fetchData(); }, []));

    const criticalCount = materials.filter(m => m.minStockThreshold && m.stockQuantity <= m.minStockThreshold).length;

    const renderMaterial = ({ item }: { item: Material }) => {
        const isCritical = item.minStockThreshold !== undefined && item.stockQuantity <= item.minStockThreshold;
        const isLow = item.minStockThreshold !== undefined && item.stockQuantity <= item.minStockThreshold * 1.5;

        return (
            <View style={[styles.card, isCritical && styles.cardCritical]}>
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
                    <TouchableOpacity
                        style={styles.addStockBtn}
                        onPress={() => {
                            setSelectedMaterial(item);
                            setShowUpdateModal(true);
                        }}
                    >
                        <Ionicons name="add-circle-outline" size={16} color="#6366F1" />
                        <Text style={styles.addStockBtnText}>Stok Gir</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderPurchase = ({ item }: { item: PurchaseOrder }) => {
        const meta = PO_STATUS_META[item.status] ?? { label: item.status, color: '#6B7280', bg: '#F9FAFB' };
        const name = item.materialName || item.manualMaterialName || 'Belirtilmemiş';

        return (
            <View style={styles.card}>
                <View style={styles.poLeft}>
                    <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                        <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                    <View style={styles.poInfo}>
                        <Text style={styles.poName}>{name}</Text>
                        <Text style={styles.poQty}>Miktar: <Text style={{ fontWeight: '700' }}>{item.quantity}</Text></Text>
                        {item.note ? <Text style={styles.poNote} numberOfLines={1}>Not: {item.note}</Text> : null}
                        {item.requestedByName ? (
                            <View style={styles.poRequesterRow}>
                                <Ionicons name="person-outline" size={12} color="#94A3B8" />
                                <Text style={styles.poRequester}>{item.requestedByName}</Text>
                            </View>
                        ) : null}
                    </View>
                </View>
                <Text style={styles.poDate}>
                    {new Date(item.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
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
                        Satın Alma ({purchaseOrders.length})
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

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#6366F1" />
                </View>
            ) : (
                <FlatList<any>
                    data={tab === 'stock' ? materials : purchaseOrders}
                    keyExtractor={(item: any) => item.id.toString()}
                    renderItem={tab === 'stock' ? renderMaterial as any : renderPurchase as any}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Ionicons name={tab === 'stock' ? 'layers-outline' : 'cart-outline'} size={56} color="#D1D5DB" />
                            <Text style={styles.emptyText}>{tab === 'stock' ? 'Stok kaydı yok' : 'Sipariş bulunmuyor'}</Text>
                        </View>
                    }
                />
            )}

            {/* FAB */}
            {tab === 'stock' && (
                <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
                    <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
            )}

            {/* Add Material Modal */}
            <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Yeni Malzeme Ekle</Text>
                            <TouchableOpacity onPress={() => setShowAddModal(false)}>
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.modalBody}>
                            <Text style={styles.inputLabel}>Malzeme Adı *</Text>
                            <TextInput style={styles.input} value={addForm.name} onChangeText={(t) => setAddForm({ ...addForm, name: t })} placeholder="Örn: Rulman 6205" />

                            <Text style={styles.inputLabel}>Açıklama</Text>
                            <TextInput style={styles.input} value={addForm.description} onChangeText={(t) => setAddForm({ ...addForm, description: t })} placeholder="Örn: 20x52x15 mm kapalı rulman" />

                            <Text style={styles.inputLabel}>Tür</Text>
                            <View style={styles.typeRow}>
                                <TouchableOpacity style={[styles.typeBtn, addForm.type === 'SparePart' && styles.typeBtnActive]} onPress={() => setAddForm({ ...addForm, type: 'SparePart' })}>
                                    <Text style={[styles.typeBtnText, addForm.type === 'SparePart' && styles.typeBtnTextActive]}>Yedek Parça</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.typeBtn, addForm.type === 'Consumable' && styles.typeBtnActive]} onPress={() => setAddForm({ ...addForm, type: 'Consumable' })}>
                                    <Text style={[styles.typeBtnText, addForm.type === 'Consumable' && styles.typeBtnTextActive]}>Sarf Malzeme</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.inputLabel}>Birim</Text>
                                    <TextInput style={styles.input} value={addForm.unit} onChangeText={(t) => setAddForm({ ...addForm, unit: t })} placeholder="adet, kg, lt..." />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.inputLabel}>İlk Stok</Text>
                                    <TextInput style={styles.input} value={addForm.initialStock} onChangeText={(t) => setAddForm({ ...addForm, initialStock: t })} keyboardType="number-pad" />
                                </View>
                            </View>

                            <Text style={styles.inputLabel}>Kritik Stok Seviyesi (Uyarı İçin)</Text>
                            <TextInput style={styles.input} value={addForm.minStock} onChangeText={(t) => setAddForm({ ...addForm, minStock: t })} keyboardType="number-pad" placeholder="Örn: 10" />

                            <TouchableOpacity style={styles.submitBtn} onPress={handleAddMaterial}>
                                <Text style={styles.submitBtnText}>Kaydet</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Update Stock Modal */}
            <Modal visible={showUpdateModal} transparent animationType="slide" onRequestClose={() => setShowUpdateModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Stok Güncelle</Text>
                            <TouchableOpacity onPress={() => setShowUpdateModal(false)}>
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.modalBody}>
                            <Text style={styles.selectedMaterialText}>{selectedMaterial?.name}</Text>
                            <Text style={styles.currentStockText}>Mevcut Stok: {selectedMaterial?.stockQuantity} {selectedMaterial?.unit}</Text>

                            <View style={styles.typeRow}>
                                <TouchableOpacity style={[styles.typeBtn, updateForm.type === 'In' && { backgroundColor: '#ECFDF5', borderColor: '#10B981' }]} onPress={() => setUpdateForm({ ...updateForm, type: 'In' })}>
                                    <Text style={[styles.typeBtnText, updateForm.type === 'In' && { color: '#059669' }]}>Stok Gir (+)</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.typeBtn, updateForm.type === 'Out' && { backgroundColor: '#FEF2F2', borderColor: '#EF4444' }]} onPress={() => setUpdateForm({ ...updateForm, type: 'Out' })}>
                                    <Text style={[styles.typeBtnText, updateForm.type === 'Out' && { color: '#DC2626' }]}>Stok Çık (-)</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.inputLabel}>Eklenecek/Düşülecek Miktar</Text>
                            <TextInput style={styles.input} value={updateForm.quantity} onChangeText={(t) => setUpdateForm({ ...updateForm, quantity: t })} keyboardType="number-pad" placeholder="Örn: 50" />

                            <Text style={styles.inputLabel}>İşlem Sebebi</Text>
                            <TextInput style={styles.input} value={updateForm.reason} onChangeText={(t) => setUpdateForm({ ...updateForm, reason: t })} placeholder="Manuel işlem, sayım farkı vs." />

                            <TouchableOpacity style={styles.submitBtn} onPress={handleUpdateStock}>
                                <Text style={styles.submitBtnText}>Onayla</Text>
                            </TouchableOpacity>
                        </View>
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
    poRequesterRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    poRequester: { fontSize: 11, color: '#94A3B8' },
    poDate: { fontSize: 11, color: '#CBD5E1', textAlign: 'right', marginTop: 4 },
    emptyText: { color: '#94A3B8', fontSize: 15, marginTop: 12 },
    addStockBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    addStockBtnText: { color: '#6366F1', fontSize: 11, fontWeight: '700' },
    fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingBottom: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
    modalBody: { padding: 20 },
    inputLabel: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 6, marginTop: 12 },
    input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#1E293B' },
    typeRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
    typeBtn: { flex: 1, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
    typeBtnActive: { backgroundColor: '#EEF2FF', borderColor: '#6366F1' },
    typeBtnText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
    typeBtnTextActive: { color: '#6366F1' },
    submitBtn: { backgroundColor: '#6366F1', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    selectedMaterialText: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
    currentStockText: { fontSize: 14, color: '#64748B', marginBottom: 12 },
});
