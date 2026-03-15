import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Modal, FlatList, Platform } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import api from '../../services/api';
import { formatDate } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';

interface WorkOrder {
    id: number;
    status: string;
    technicianNote: string | null;
    assignedToUserId: number;
    assignedToUserName: string;
    pendingMaterialName?: string | null;
}

interface FaultDetail {
    id: number;
    assetName: string;
    title: string;
    description: string;
    priority: string;
    status: string;
    departmentName: string | null;
    createdAt: string;
}

export function FaultDetailScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { user } = useAuth();
    const { faultId } = route.params;

    const [loading, setLoading] = useState(true);
    const [fault, setFault] = useState<FaultDetail | null>(null);
    const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);

    // Modals
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);

    // Status & Notes
    const [selectedStatus, setSelectedStatus] = useState('');
    const [newNote, setNewNote] = useState('');
    const [updating, setUpdating] = useState(false);

    // Selection Data
    const [materials, setMaterials] = useState<any[]>([]);
    const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
    const [manualMaterialName, setManualMaterialName] = useState('');
    const [quantity, setQuantity] = useState('1');

    useEffect(() => { fetchData(); }, [faultId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [faultRes, woRes] = await Promise.all([
                api.get(`/faultreports/${faultId}`),
                api.get(`/workorders?faultId=${faultId}`)
            ]);
            setFault(faultRes.data);
            const wo = woRes.data.length > 0 ? woRes.data[0] : null;
            setWorkOrder(wo);
            setSelectedStatus(wo ? wo.status : faultRes.data.status);
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Bilgiler yüklenemedi' });
        } finally {
            setLoading(false);
        }
    };

    const fetchMaterials = async () => {
        try {
            const res = await api.get('/materials');
            setMaterials(res.data);
        } catch (error) { console.log('Materials error'); }
    };

    const handleUpdateStatus = async () => {
        if (!workOrder) return;
        try {
            setUpdating(true);
            await api.put(`/workorders/${workOrder.id}/status`, {
                status: selectedStatus,
                technicianNote: newNote
            });
            Toast.show({ type: 'success', text1: 'Durum güncellendi' });
            setShowStatusModal(false);
            setNewNote('');
            fetchData();
        } catch (error) { Toast.show({ type: 'error', text1: 'Güncelleme başarısız' }); }
        finally { setUpdating(false); }
    };

    const handleClaimTask = async () => {
        try {
            setUpdating(true);
            await api.post('/workorders', { faultReportId: faultId, assignedToUserId: user?.id });
            Toast.show({ type: 'success', text1: 'İş üzerinize alındı' });
            fetchData();
        } catch (error) { Toast.show({ type: 'error', text1: 'Hata oluştu' }); }
        finally { setUpdating(false); }
    };

    const createPurchaseOrder = async () => {
        if (!workOrder) return;
        try {
            setUpdating(true);
            await api.post('/purchaseorders', {
                workOrderId: workOrder.id,
                materialId: selectedMaterial?.id || null,
                manualMaterialName: manualMaterialName.trim() || null,
                quantity: parseInt(quantity),
                note: `Arıza #${faultId} için talep.`
            });
            Toast.show({ type: 'success', text1: 'Satın alma talebi oluşturuldu' });
            setShowPurchaseModal(false);
            setManualMaterialName('');
            setSelectedMaterial(null);
            fetchData();
        } catch (error) { Toast.show({ type: 'error', text1: 'Talep oluşturulamadı' }); }
        finally { setUpdating(false); }
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'Open': return { bg: '#FEE2E2', text: '#EF4444', label: 'Açık' };
            case 'InProgress': return { bg: '#EFF6FF', text: '#3B82F6', label: 'İşlemde' };
            case 'WaitingForPart': return { bg: '#FFF7ED', text: '#F97316', label: 'Parça Bekliyor' };
            case 'Resolved': return { bg: '#ECFDF5', text: '#10B981', label: 'Çözüldü' };
            case 'Closed': return { bg: '#F1F5F9', text: '#64748B', label: 'Kapalı' };
            default: return { bg: '#F1F5F9', text: '#64748B', label: status };
        }
    };

    const getPriorityStyles = (p: string) => {
        switch (p) {
            case 'Low': return { color: '#10B981', label: 'Düşük' };
            case 'Normal':
            case 'Medium': return { color: '#3B82F6', label: 'Orta' };
            case 'High': return { color: '#F59E0B', label: 'Yüksek' };
            case 'Critical': return { color: '#EF4444', label: 'Kritik' };
            default: return { color: '#6366F1', label: p };
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#6366F1" /></View>;
    if (!fault) return null;

    const isAssignedToMe = workOrder?.assignedToUserId === user?.id;
    const sStyles = getStatusStyles(fault.status);
    const pStyles = getPriorityStyles(fault.priority);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Arıza Detayı</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
            {/* Fault Info Card */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.iconBox}>
                        <Ionicons name="alert-circle" size={28} color="#EF4444" />
                    </View>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.assetName}>{fault.assetName}</Text>
                        <Text style={styles.faultTitle}>{fault.title}</Text>
                    </View>
                </View>

                <View style={styles.pillContainer}>
                    <View style={[styles.statusPill, { backgroundColor: sStyles.bg }]}>
                        <Text style={[styles.statusPillText, { color: sStyles.text }]}>{sStyles.label}</Text>
                    </View>
                    <View style={styles.priorityBox}>
                        <View style={[styles.prioDot, { backgroundColor: pStyles.color }]} />
                        <Text style={styles.prioText}>{pStyles.label} Öncelik</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <Text style={styles.descriptionLabel}>Açıklama</Text>
                <Text style={styles.descriptionText}>{fault.description}</Text>

                <View style={styles.metaRow}>
                    <View style={styles.metaCol}>
                        <Text style={styles.infoLabel}>Tarih:</Text>
                        <Text style={styles.infoValue}>{formatDate(fault.createdAt)}</Text>
                    </View>
                    {fault.departmentName && (
                        <View style={styles.metaCol}>
                            <Text style={styles.metaLabel}>Departman</Text>
                            <Text style={styles.metaValue}>{fault.departmentName}</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Work Order Section */}
            <View style={[styles.card, { marginTop: 16 }]}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="construct-outline" size={20} color="#6366F1" />
                    <Text style={styles.sectionTitle}>İş Emri Detayları</Text>
                </View>

                {workOrder ? (
                    <>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Teknisyen:</Text>
                            <Text style={styles.infoValue}>{workOrder.assignedToUserName}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>İş Durumu:</Text>
                            <View style={[styles.subPill, { backgroundColor: getStatusStyles(workOrder.status!).bg }]}>
                                <Text style={[styles.subPillText, { color: getStatusStyles(workOrder.status!).text }]}>
                                    {getStatusStyles(workOrder.status!).label}
                                </Text>
                            </View>
                        </View>

                        {workOrder.status === 'WaitingForPart' && (
                            <View style={styles.pendingPartBox}>
                                <Ionicons name="time-outline" size={16} color="#F97316" />
                                <Text style={styles.pendingPartText}>
                                    Beklenen Parça: <Text style={{ fontWeight: '800' }}>{workOrder.pendingMaterialName || 'Parça Adı Alınamadı'}</Text>
                                </Text>
                            </View>
                        )}

                        {workOrder.technicianNote && (
                            <View style={styles.noteBox}>
                                <Text style={styles.noteTitle}>Teknisyen Notu</Text>
                                <Text style={styles.noteContent}>{workOrder.technicianNote}</Text>
                            </View>
                        )}

                        {isAssignedToMe && (
                            <View style={styles.actionGrid}>
                                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#6366F1' }]} onPress={() => { setSelectedStatus(workOrder.status); setNewNote(workOrder.technicianNote || ''); setShowStatusModal(true); }}>
                                    <Ionicons name="refresh-circle-outline" size={20} color="#fff" />
                                    <Text style={styles.actionBtnText}>Durum Güncelle</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#8B5CF6' }]} onPress={() => { fetchMaterials(); setShowPurchaseModal(true); }}>
                                    <Ionicons name="cart-outline" size={20} color="#fff" />
                                    <Text style={styles.actionBtnText}>Parça Talebi</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </>
                ) : (
                    <View style={styles.emptyWo}>
                        <Ionicons name="help-circle-outline" size={40} color="#CBD5E1" />
                        <Text style={styles.emptyWoText}>Henüz bir teknisyen atanmamış.</Text>
                        {user?.role === 'Technician' && (
                            <TouchableOpacity style={styles.claimBtn} onPress={handleClaimTask}>
                                {updating ? <ActivityIndicator color="#fff" /> : <Text style={styles.claimBtnText}>Görevi Üzerine Al</Text>}
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>

            {/* Status Integration Modal */}
            <Modal visible={showStatusModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>İş Durumunu Güncelle</Text>
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Yeni Durum</Text>
                            <View style={styles.pickerWrapper}>
                                <Picker selectedValue={selectedStatus} onValueChange={setSelectedStatus}>
                                    <Picker.Item label="Açık" value="Open" />
                                    <Picker.Item label="İşlemde" value="InProgress" />
                                    <Picker.Item label="Parça Bekliyor" value="WaitingForPart" />
                                    <Picker.Item label="Çözüldü" value="Resolved" />
                                </Picker>
                            </View>
                        </View>
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Not Ekle</Text>
                            <TextInput style={styles.modalInput} multiline numberOfLines={4} value={newNote} onChangeText={setNewNote} placeholder="Yapılan işlemler hakkında not..." />
                        </View>
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowStatusModal(false)}><Text style={styles.modalCancelText}>Kapat</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.modalSave} onPress={handleUpdateStatus}>
                                {updating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalSaveText}>Güncelle</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Purchase Integration Modal (Abbreviated) */}
            <Modal visible={showPurchaseModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { maxHeight: '80%' }]}>
                        <Text style={styles.modalTitle}>Satın Alma Talebi</Text>
                        <FlatList
                            data={materials}
                            keyExtractor={it => it.id.toString()}
                            style={{ maxHeight: 200 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    style={[styles.materialItem, selectedMaterial?.id === item.id && styles.materialSelected]}
                                    onPress={() => { setSelectedMaterial(item); setManualMaterialName(''); }}
                                >
                                    <Text style={[styles.materialName, selectedMaterial?.id === item.id && { color: '#6366F1' }]}>{item.name}</Text>
                                    <Text style={styles.materialStock}>{item.stockQuantity} {item.unit}</Text>
                                </TouchableOpacity>
                            )}
                        />
                        <TextInput style={[styles.modalInput, { marginTop: 12 }]} placeholder="Veya manuel malzeme adı..." value={manualMaterialName} onChangeText={val => { setManualMaterialName(val); setSelectedMaterial(null); }} />
                        <TextInput style={[styles.modalInput, { marginTop: 8 }]} placeholder="Miktar" keyboardType="numeric" value={quantity} onChangeText={setQuantity} />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowPurchaseModal(false)}><Text style={styles.modalCancelText}>İptal</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.modalSave} onPress={createPurchaseOrder} disabled={updating || (!selectedMaterial && !manualMaterialName.trim())}>
                                <Text style={styles.modalSaveText}>Talep Et</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F1F5F9' },
    header: { backgroundColor: '#6366F1', paddingTop: 52, paddingBottom: 20, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
    content: { padding: 16, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: { backgroundColor: '#fff', borderRadius: 24, padding: 24, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
    cardHeader: { flexDirection: 'row', gap: 16, marginBottom: 16 },
    iconBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' },
    headerTitleContainer: { flex: 1 },
    assetName: { fontSize: 13, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },
    faultTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B', marginTop: 4 },
    pillContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    statusPillText: { fontSize: 12, fontWeight: '800' },
    priorityBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    prioDot: { width: 8, height: 8, borderRadius: 4 },
    prioText: { fontSize: 13, color: '#475569', fontWeight: '600' },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 20 },
    descriptionLabel: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 8 },
    descriptionText: { fontSize: 15, color: '#64748B', lineHeight: 22 },
    metaRow: { flexDirection: 'row', marginTop: 20, gap: 24 },
    metaCol: { flex: 1 },
    metaLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 },
    metaValue: { fontSize: 14, fontWeight: '600', color: '#334155' },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    infoLabel: { fontSize: 14, color: '#64748B' },
    infoValue: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
    subPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    subPillText: { fontSize: 11, fontWeight: '800' },
    noteBox: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, marginTop: 12, borderLeftWidth: 4, borderLeftColor: '#6366F1' },
    noteTitle: { fontSize: 11, fontWeight: '800', color: '#6366F1', textTransform: 'uppercase', marginBottom: 4 },
    noteContent: { fontSize: 14, color: '#475569', lineHeight: 20 },
    pendingPartBox: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 8, 
        backgroundColor: '#FFF7ED', 
        padding: 12, 
        borderRadius: 12, 
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#FFEDD5'
    },
    pendingPartText: { fontSize: 13, color: '#C2410C', fontWeight: '600' },
    actionGrid: { flexDirection: 'row', gap: 10, marginTop: 24 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
    actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
    emptyWo: { alignItems: 'center', paddingVertical: 32 },
    emptyWoText: { fontSize: 14, color: '#94A3B8', marginTop: 12, marginBottom: 20 },
    claimBtn: { backgroundColor: '#10B981', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
    claimBtnText: { color: '#fff', fontWeight: '800' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', padding: 20 },
    modalCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 20 },
    formGroup: { marginBottom: 16 },
    formLabel: { fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 8 },
    pickerWrapper: { backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
    modalInput: { backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B', textAlignVertical: 'top' },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 },
    modalCancel: { paddingHorizontal: 16, paddingVertical: 12 },
    modalCancelText: { fontWeight: '700', color: '#64748B' },
    modalSave: { backgroundColor: '#6366F1', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
    modalSaveText: { fontWeight: '800', color: '#fff' },
    materialItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    materialSelected: { backgroundColor: '#EEF2FF', borderRadius: 8 },
    materialName: { fontSize: 14, fontWeight: '600', color: '#334155' },
    materialStock: { fontSize: 12, color: '#94A3B8' }
});
