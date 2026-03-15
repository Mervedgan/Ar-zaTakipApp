import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import api from '../../services/api';

interface Asset {
    id: number;
    name: string;
}

interface Department {
    id: number;
    name: string;
}

export function CreateFaultScreen() {
    const { control, handleSubmit, formState: { errors }, watch } = useForm({
        defaultValues: {
            departmentId: '',
            assetId: '',
            title: '',
            description: '',
            priority: 1 // Medium
        }
    });

    const [loading, setLoading] = useState(false);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [fetchingData, setFetchingData] = useState(true);
    const navigation = useNavigation();

    const selectedAssetId = watch('assetId');

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setFetchingData(true);
            const [assetsRes, departmentsRes] = await Promise.all([
                api.get('/assets').catch(() => ({ data: [] })),
                api.get('/departments').catch(() => ({ data: [] }))
            ]);
            setAssets(assetsRes.data);
            setDepartments(departmentsRes.data);
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Veriler yüklenemedi' });
        } finally {
            setFetchingData(false);
        }
    };

    const onSubmit = async (data: any) => {
        if (!data.assetId) {
            Toast.show({ type: 'info', text1: 'Lütfen bir cihaz seçin' });
            return;
        }

        try {
            setLoading(true);
            await api.post('/faultreports', {
                assetId: Number(data.assetId),
                departmentId: data.departmentId ? Number(data.departmentId) : null,
                title: data.title,
                description: data.description,
                priority: Number(data.priority),
                photoUrls: null
            });

            Toast.show({ type: 'success', text1: 'Arıza kaydı oluşturuldu' });
            navigation.goBack();
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: 'Hata Oluştu',
                text2: error.response?.data?.message || 'Bilgileri kontrol ediniz.'
            });
        } finally {
            setLoading(false);
        }
    };

    if (fetchingData) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#6366F1" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Yeni Arıza Bildirimi</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.card}>
                <View style={styles.headerRow}>
                    <Ionicons name="alert-circle" size={32} color="#EF4444" />
                    <View style={styles.headerText}>
                        <Text style={styles.cardTitle}>Yeni Arıza Bildirimi</Text>
                        <Text style={styles.cardSubtitle}>Arızayı detaylı şekilde aşağıda bildirin.</Text>
                    </View>
                </View>

                {/* Asset & Department Selection */}
                <View style={styles.formRow}>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                        <Text style={styles.formLabel}>Cihaz Seçıımı *</Text>
                        <View style={styles.pickerContainer}>
                            <Controller
                                control={control}
                                name="assetId"
                                rules={{ required: 'Cihaz seçimi zorunludur' }}
                                render={({ field: { onChange, value } }) => (
                                    <Picker selectedValue={value} onValueChange={onChange} style={styles.picker}>
                                        <Picker.Item label="Cihaz Seç..." value="" color="#94A3B8" />
                                        {assets.map(asset => (
                                            <Picker.Item key={asset.id} label={asset.name} value={asset.id.toString()} />
                                        ))}
                                    </Picker>
                                )}
                            />
                        </View>
                        {errors.assetId && <Text style={styles.errorText}>Cihaz seçimi zorunludur</Text>}
                    </View>
                </View>

                {/* Title */}
                <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Arıza Başlığı *</Text>
                    <Controller
                        control={control}
                        name="title"
                        rules={{ required: 'Başlık zorunludur' }}
                        render={({ field: { onChange, onBlur, value } }) => (
                            <View style={[styles.inputWrapper, errors.title && styles.inputWrapperError]}>
                                <Ionicons name="create-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Örn: Motor aşırı ısınıyor"
                                    placeholderTextColor="#CBD5E1"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                />
                            </View>
                        )}
                    />
                </View>

                {/* Description */}
                <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Açıklama *</Text>
                    <Controller
                        control={control}
                        name="description"
                        rules={{ required: 'Açıklama zorunludur' }}
                        render={({ field: { onChange, onBlur, value } }) => (
                            <View style={[styles.inputWrapper, styles.textAreaWrapper, errors.description && styles.inputWrapperError]}>
                                <TextInput
                                    style={styles.textArea}
                                    placeholder="Arızanın nasıl oluştuğunu ve detaylarını yazın..."
                                    placeholderTextColor="#CBD5E1"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                    multiline
                                    numberOfLines={4}
                                />
                            </View>
                        )}
                    />
                </View>

                {/* Priority Selection */}
                <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Öncelik Durumu</Text>
                    <Controller
                        control={control}
                        name="priority"
                        render={({ field: { onChange, value } }) => (
                            <View style={styles.priorityRow}>
                                {[
                                    { id: 0, label: 'Düşük', color: '#10B981' },
                                    { id: 1, label: 'Orta', color: '#3B82F6' },
                                    { id: 2, label: 'Yüksek', color: '#F59E0B' },
                                    { id: 3, label: 'Kritik', color: '#EF4444' }
                                ].map(p => (
                                    <TouchableOpacity
                                        key={p.id}
                                        style={[
                                            styles.priorityBtn,
                                            value === p.id && { backgroundColor: p.color, borderColor: p.color }
                                        ]}
                                        onPress={() => onChange(p.id)}
                                    >
                                        <Text style={[styles.priorityBtnText, value === p.id && { color: '#fff' }]}>
                                            {p.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.saveBtn, (loading || assets.length === 0) && styles.saveBtnDisabled]}
                    onPress={handleSubmit(onSubmit)}
                    disabled={loading || assets.length === 0}
                >
                    {loading ? <ActivityIndicator color="#fff" /> : (
                        <>
                            <Ionicons name="paper-plane" size={20} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.saveBtnText}>Arıza Bildirimini Gönder</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F1F5F9' },
    header: { backgroundColor: '#6366F1', paddingTop: 52, paddingBottom: 20, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
    content: { padding: 20, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: { backgroundColor: '#fff', borderRadius: 24, padding: 24, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 28, gap: 12 },
    headerText: { flex: 1 },
    cardTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
    cardSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
    formGroup: { marginBottom: 20 },
    formRow: { flexDirection: 'row', gap: 12 },
    formLabel: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 8 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 16 },
    inputWrapperError: { borderColor: '#EF4444' },
    inputIcon: { marginRight: 12 },
    formInput: { flex: 1, height: 52, fontSize: 16, color: '#1E293B' },
    textAreaWrapper: { alignItems: 'flex-start', paddingVertical: 12 },
    textArea: { flex: 1, height: 100, fontSize: 16, color: '#1E293B', textAlignVertical: 'top' },
    pickerContainer: { backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
    picker: { width: '100%', color: '#1E293B' },
    priorityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    priorityBtn: { flex: 1, minWidth: '45%', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', backgroundColor: '#fff' },
    priorityBtnText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
    saveBtn: { backgroundColor: '#EF4444', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 12, flexDirection: 'row', justifyContent: 'center' },
    saveBtnDisabled: { backgroundColor: '#94A3B8' },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    errorText: { color: '#EF4444', fontSize: 12, marginTop: 4, marginLeft: 4 },
});
