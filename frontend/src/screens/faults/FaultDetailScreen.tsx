import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Modal, FlatList } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import Toast from 'react-native-toast-message';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface WorkOrder {
    id: number;
    status: string;
    technicianNote: string | null;
    assignedToUserId: number;
    assignedToUserName: string;
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

    useEffect(() => {
        fetchData();
    }, [faultId]);

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

            if (wo) {
                setSelectedStatus(wo.status);
            } else {
                setSelectedStatus(faultRes.data.status);
            }
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
        } catch (error) {
            console.log('Malzemeler yüklenemedi');
        }
    };

    const openStatusUpdate = () => {
        if (workOrder) {
            setSelectedStatus(workOrder.status);
            setNewNote(workOrder.technicianNote || '');
            setShowStatusModal(true);
        }
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
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Güncelleme başarısız' });
        } finally {
            setUpdating(false);
        }
    };

    const handleClaimTask = async () => {
        try {
            setUpdating(true);
            await api.post('/workorders', {
                faultReportId: faultId,
                assignedToUserId: user?.id
            });
            Toast.show({ type: 'success', text1: 'İş üzerinize alındı' });
            fetchData();
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Hata oluştu' });
        } finally {
            setUpdating(false);
        }
    };

    const createPurchaseOrder = async () => {
        if (!workOrder) return;
        if (!selectedMaterial && !manualMaterialName.trim()) {
            Toast.show({ type: 'error', text1: 'Lütfen bir malzeme seçin veya isim yazın' });
            return;
        }

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
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Talep oluşturulamadı' });
        } finally {
            setUpdating(false);
        }
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'Open': return { text: 'Açık', color: '#3B82F6' };
            case 'InProgress': return { text: 'İşlemde', color: '#F59E0B' };
            case 'WaitingForPart': return { text: 'Parça Bekliyor', color: '#EF4444' };
            case 'Resolved': return { text: 'Çözüldü', color: '#10B981' };
            case 'Closed': return { text: 'Kapalı', color: '#6B7280' };
            default: return { text: status, color: '#10B981' };
        }
    };

    const getPriorityInfo = (p: string) => {
        switch (p) {
            case 'Low': return { text: 'Düşük', color: '#10B981' };
            case 'Normal': return { text: 'Normal', color: '#3B82F6' };
            case 'High': return { text: 'Yüksek', color: '#F59E0B' };
            case 'Critical': return { text: 'Kritik', color: '#EF4444' };
            default: return { text: p, color: '#10B981' };
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#10B981" />
            </View>
        );
    }

    if (!fault) return null;

    const isTechnician = user?.role === 'Technician';
    const isAssignedToMe = workOrder?.assignedToUserId === user?.id;

    const sInfo = getStatusInfo(fault.status);
    const pInfo = getPriorityInfo(fault.priority);

    return (
        <ScrollView style={styles.container}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{fault.assetName}</Text>
                <Text style={styles.faultTitle}>{fault.title}</Text>
                <View style={styles.badgeContainer}>
                    <View style={[styles.badge, { backgroundColor: pInfo.color }]}>
                        <Text style={styles.badgeText}>{pInfo.text}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: sInfo.color }]}>
                        <Text style={styles.badgeText}>{sInfo.text}</Text>
                    </View>
                </View>
                <Text style={styles.description}>{fault.description}</Text>
                {fault.departmentName && (
                    <Text style={styles.infoText}>Departman: {fault.departmentName}</Text>
                )}
                <Text style={styles.dateText}>Tarih: {new Date(fault.createdAt).toLocaleString('tr-TR')}</Text>
            </View>

            {workOrder ? (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>İş Emri Bilgileri</Text>
                    <Text style={styles.infoText}>Atanan: {workOrder.assignedToUserName}</Text>
                    <Text style={styles.infoText}>İş Emri Durumu: {getStatusInfo(workOrder.status).text}</Text>
                    {workOrder.technicianNote && (
                        <View style={styles.noteBox}>
                            <Text style={styles.noteLabel}>Teknisyen Notu:</Text>
                            <Text style={styles.noteText}>{workOrder.technicianNote}</Text>
                        </View>
                    )}

                    {isAssignedToMe && (
                        <View style={styles.actionContainer}>
                            <TouchableOpacity style={[styles.mainActionBtn, { backgroundColor: '#3B82F6' }]} onPress={openStatusUpdate}>
                                <Text style={styles.mainActionBtnText}>Durumu ve Notu Güncelle</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.mainActionBtn, { backgroundColor: '#8B5CF6', marginTop: 10 }]} onPress={() => { fetchMaterials(); setShowPurchaseModal(true); }}>
                                <Text style={styles.mainActionBtnText}>Parça Talep Et</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            ) : (
                <View style={[styles.section, styles.noWO]}>
                    <Text style={[styles.infoText, { marginBottom: 15 }]}>Henüz bir iş emri atanmamış.</Text>
                    {isTechnician && (
                        <TouchableOpacity style={styles.assignBtn} onPress={handleClaimTask}>
                            {updating ? <ActivityIndicator color="#fff" /> : <Text style={styles.assignBtnText}>İşi Üzerime Al</Text>}
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Modal: Status & Note Update */}
            <Modal visible={showStatusModal} transparent animationType="fade">
                <View style={styles.modalBg}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Durum ve Not Güncelle</Text>
                        <Text style={styles.label}>Yeni Durum Seçin:</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={selectedStatus}
                                onValueChange={(val) => setSelectedStatus(val)}
                            >
                                <Picker.Item label="Açık" value="Open" />
                                <Picker.Item label="İşlem Sürüyor" value="InProgress" />
                                <Picker.Item label="Parça Bekliyor" value="WaitingForPart" />
                                <Picker.Item label="Çözüldü" value="Resolved" />
                            </Picker>
                        </View>

                        <Text style={styles.label}>İlgili Not:</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Açıklama yazın..."
                            multiline
                            numberOfLines={4}
                            value={newNote}
                            onChangeText={setNewNote}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setShowStatusModal(false)}>
                                <Text style={styles.modalBtnText}>Vazgeç</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleUpdateStatus}>
                                {updating ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnText}>Kaydet</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal: Purchase Request */}
            <Modal visible={showPurchaseModal} transparent animationType="slide">
                <View style={styles.modalBg}>
                    <View style={[styles.modalContent, { maxHeight: '85%' }]}>
                        <Text style={styles.modalTitle}>Satın Alma Talebi Oluştur</Text>
                        {materials.length > 0 ? (
                            <>
                                <Text style={styles.label}>Listeden Seçin:</Text>
                                <FlatList
                                    data={materials}
                                    keyExtractor={(item) => item.id.toString()}
                                    style={{ maxHeight: 150, marginBottom: 15 }}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[styles.listItem, selectedMaterial?.id === item.id && styles.selectedItem]}
                                            onPress={() => { setSelectedMaterial(item); setManualMaterialName(''); }}
                                        >
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text style={styles.listItemName}>{item.name}</Text>
                                                <Text style={styles.listItemSub}>Stok: {item.stockQuantity} {item.unit}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    )}
                                />
                                <Text style={styles.orText}>— VEYA —</Text>
                            </>
                        ) : (
                            <Text style={styles.infoText}>Kayıtlı malzeme bulunamadı. Lütfen manuel girin:</Text>
                        )}

                        <Text style={styles.label}>Malzeme Adı (Manuel):</Text>
                        <TextInput
                            style={[styles.modalInput, { height: 50, marginBottom: 15 }]}
                            placeholder="Örn: Rulman, Sigorta vb."
                            value={manualMaterialName}
                            onChangeText={(val) => { setManualMaterialName(val); setSelectedMaterial(null); }}
                        />
                        <Text style={styles.label}>Miktar:</Text>
                        <TextInput style={[styles.modalInput, { height: 50 }]} keyboardType="numeric" value={quantity} onChangeText={setQuantity} />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setShowPurchaseModal(false)}>
                                <Text style={styles.modalBtnText}>Vazgeç</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.saveBtn]}
                                onPress={createPurchaseOrder}
                                disabled={updating || (!selectedMaterial && !manualMaterialName.trim())}
                            >
                                {updating ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnText}>Talep Et</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    section: { backgroundColor: '#fff', padding: 20, marginBottom: 12 },
    sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#6B7280', textTransform: 'uppercase', marginBottom: 8 },
    faultTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 12 },
    badgeContainer: { flexDirection: 'row', marginBottom: 16 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginRight: 8 },
    badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    description: { fontSize: 16, color: '#4B5563', lineHeight: 24, marginBottom: 16 },
    infoText: { fontSize: 14, color: '#374151', marginBottom: 4 },
    dateText: { fontSize: 12, color: '#9CA3AF', marginTop: 12 },
    noteBox: { backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8, marginTop: 12, borderWidth: 1, borderColor: '#E5E7EB' },
    noteLabel: { fontSize: 12, fontWeight: 'bold', color: '#6B7280', marginBottom: 4 },
    noteText: { fontSize: 14, color: '#111827' },
    actionContainer: { marginTop: 20 },
    mainActionBtn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
    mainActionBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
    noWO: { alignItems: 'center', paddingVertical: 30 },
    assignBtn: { backgroundColor: '#10B981', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
    assignBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
    label: { fontSize: 14, color: '#4B5563', marginBottom: 8, fontWeight: '500' },
    pickerContainer: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, marginBottom: 20, overflow: 'hidden' },
    modalInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, textAlignVertical: 'top', marginBottom: 20 },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end' },
    modalBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginLeft: 10 },
    cancelBtn: { backgroundColor: '#9CA3AF' },
    saveBtn: { backgroundColor: '#F59E0B' },
    modalBtnText: { color: '#fff', fontWeight: 'bold' },
    listItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    selectedItem: { backgroundColor: '#EEF2FF', borderColor: '#6366F1', borderWidth: 1, borderRadius: 8 },
    listItemName: { fontSize: 14, color: '#111827', fontWeight: '500' },
    listItemSub: { fontSize: 12, color: '#6B7280' },
    orText: { textAlign: 'center', color: '#9CA3AF', fontSize: 11, fontWeight: 'bold', marginVertical: 10 }
});
