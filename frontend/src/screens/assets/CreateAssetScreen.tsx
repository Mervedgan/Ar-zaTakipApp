import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import api from '../../services/api';

export function CreateAssetScreen() {
    const { control, handleSubmit, formState: { errors } } = useForm({
        defaultValues: {
            name: '',
            category: 'Makine',
            description: '',
            location: '',
            serialNumber: ''
        }
    });

    const [loading, setLoading] = useState(false);
    const navigation = useNavigation();

    const onSubmit = async (data: any) => {
        try {
            setLoading(true);
            await api.post('/assets', data);
            Toast.show({ type: 'success', text1: 'Cihaz başarıyla eklendi' });
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

    const renderInput = (name: string, label: string, placeholder: string, icon: string, rules?: any) => (
        <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{label}</Text>
            <Controller
                control={control}
                name={name as any}
                rules={rules}
                render={({ field: { onChange, onBlur, value } }) => (
                    <View style={[styles.inputWrapper, (errors as any)[name] && styles.inputWrapperError]}>
                        <Ionicons name={icon} size={20} color="#94A3B8" style={styles.inputIcon} />
                        <TextInput
                            style={[styles.formInput, name === 'description' && { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
                            placeholder={placeholder}
                            placeholderTextColor="#CBD5E1"
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value}
                            multiline={name === 'description'}
                        />
                    </View>
                )}
            />
            {(errors as any)[name] && <Text style={styles.errorText}>{(errors as any)[name]?.message}</Text>}
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Yeni Cihaz Kaydı</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.card}>
                <View style={styles.headerRow}>
                    <Ionicons name="add-circle" size={32} color="#6366F1" />
                    <View style={styles.headerText}>
                        <Text style={styles.cardTitle}>Yeni Cihaz Kaydı</Text>
                        <Text style={styles.cardSubtitle}>Lütfen teknik detayları eksiksiz girin.</Text>
                    </View>
                </View>

                {renderInput('name', 'Cihaz / Ekipman Adı *', 'Örn: CNC Tezgahı 01', 'hardware-chip-outline', { required: 'Cihaz adı zorunludur' })}
                
                <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Kategori *</Text>
                    <View style={styles.pickerContainer}>
                        <Controller
                            control={control}
                            name="category"
                            render={({ field: { onChange, value } }) => (
                                <View style={styles.pickerWrapper}>
                                    <Picker
                                        selectedValue={value}
                                        onValueChange={onChange}
                                        style={styles.picker}
                                    >
                                        <Picker.Item label="Makine" value="Makine" />
                                        <Picker.Item label="Araç" value="Araç" />
                                        <Picker.Item label="Ofis Eşyası" value="Ofis Eşyası" />
                                        <Picker.Item label="Diğer" value="Diğer" />
                                    </Picker>
                                </View>
                            )}
                        />
                    </View>
                </View>

                {renderInput('location', 'Konum / Bölüm', 'Örn: A Blok, 2. Kat', 'location-outline')}
                {renderInput('serialNumber', 'Seri Numarası', 'Varsa seri numarası...', 'barcode-outline')}
                {renderInput('description', 'Açıklama', 'Cihaz hakkında ek notlar...', 'document-text-outline')}

                <TouchableOpacity
                    style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
                    onPress={handleSubmit(onSubmit)}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="#fff" /> : (
                        <>
                            <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.saveBtnText}>Cihazı Sisteme Kaydet</Text>
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
    card: { backgroundColor: '#fff', borderRadius: 24, padding: 24, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 28, gap: 12 },
    headerText: { flex: 1 },
    cardTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
    cardSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
    formGroup: { marginBottom: 20 },
    formLabel: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 8 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 16 },
    inputWrapperError: { borderColor: '#EF4444' },
    inputIcon: { marginRight: 12 },
    formInput: { flex: 1, height: 52, fontSize: 16, color: '#1E293B' },
    pickerContainer: { backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
    pickerWrapper: { height: 52, justifyContent: 'center' },
    picker: { width: '100%', color: '#1E293B' },
    saveBtn: { backgroundColor: '#6366F1', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 12, flexDirection: 'row', justifyContent: 'center' },
    saveBtnDisabled: { backgroundColor: '#94A3B8' },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    errorText: { color: '#EF4444', fontSize: 12, marginTop: 4, marginLeft: 4 },
});
