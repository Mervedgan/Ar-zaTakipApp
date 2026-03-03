import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
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
    const { control, handleSubmit, formState: { errors }, watch, reset } = useForm({
        defaultValues: {
            departmentId: '',
            assetId: '',
            title: '',
            description: '',
            priority: 0 // Low
        }
    });

    const [loading, setLoading] = useState(false);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [fetchingData, setFetchingData] = useState(true);
    const navigation = useNavigation();

    // Watch selected assetId to display Asset ID
    const selectedAssetId = watch('assetId');

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setFetchingData(true);
            const [assetsRes, departmentsRes] = await Promise.all([
                api.get('/assets'),
                api.get('/departments')
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
                <ActivityIndicator size="large" color="#10B981" />
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.label}>Departman Seçin</Text>
            <Controller
                control={control}
                name="departmentId"
                render={({ field: { onChange, value } }) => (
                    <View style={styles.pickerContainer}>
                        <Picker selectedValue={value} onValueChange={onChange}>
                            <Picker.Item label="Departman Seçiniz (Opsiyonel)..." value="" />
                            {departments.map(dept => (
                                <Picker.Item key={dept.id} label={dept.name} value={dept.id.toString()} />
                            ))}
                        </Picker>
                    </View>
                )}
            />

            <Text style={styles.label}>Cihaz / Ekipman Seçin</Text>
            <Controller
                control={control}
                name="assetId"
                rules={{ required: 'Cihaz seçimi zorunludur' }}
                render={({ field: { onChange, value } }) => (
                    <View style={styles.pickerContainer}>
                        <Picker selectedValue={value} onValueChange={onChange}>
                            <Picker.Item label="Cihaz Seçiniz..." value="" />
                            {assets.map(asset => (
                                <Picker.Item key={asset.id} label={asset.name} value={asset.id.toString()} />
                            ))}
                        </Picker>
                    </View>
                )}
            />
            {errors.assetId && <Text style={styles.errorText}>{errors.assetId.message as string}</Text>}

            {selectedAssetId ? (
                <View style={styles.idContainer}>
                    <Text style={styles.idLabel}>Eşya ID:</Text>
                    <Text style={styles.idValue}>{selectedAssetId}</Text>
                </View>
            ) : null}

            {assets.length === 0 && (
                <Text style={styles.infoText}>Henüz kayıtlı cihaz yok. Önce cihaz eklenmelidir.</Text>
            )}

            <Text style={styles.label}>Arıza Başlığı</Text>
            <Controller
                control={control}
                name="title"
                rules={{ required: 'Başlık zorunludur' }}
                render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                        style={[styles.input, errors.title && styles.inputError]}
                        placeholder="Örn: CNC Motoru Durdu"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        autoCorrect={false}
                        spellCheck={false}
                        textContentType="none"
                        importantForAutofill="no"
                        keyboardType="default"
                    />
                )}
            />
            {errors.title && <Text style={styles.errorText}>{errors.title.message as string}</Text>}

            <Text style={styles.label}>Açıklama</Text>
            <Controller
                control={control}
                name="description"
                rules={{ required: 'Açıklama zorunludur' }}
                render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                        style={[styles.input, styles.textArea, errors.description && styles.inputError]}
                        placeholder="Arızayı detaylandırın..."
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        multiline
                        numberOfLines={4}
                        autoCorrect={false}
                        spellCheck={false}
                        textContentType="none"
                        importantForAutofill="no"
                        keyboardType="default"
                    />
                )}
            />
            {errors.description && <Text style={styles.errorText}>{errors.description.message as string}</Text>}

            <Text style={styles.label}>Öncelik</Text>
            <Controller
                control={control}
                name="priority"
                render={({ field: { onChange, value } }) => (
                    <View style={styles.pickerContainer}>
                        <Picker selectedValue={value} onValueChange={onChange}>
                            <Picker.Item label="Düşük" value={0} />
                            <Picker.Item label="Orta" value={1} />
                            <Picker.Item label="Yüksek" value={2} />
                            <Picker.Item label="Kritik" value={3} />
                        </Picker>
                    </View>
                )}
            />

            <TouchableOpacity
                style={[styles.button, (loading || assets.length === 0) && styles.buttonDisabled]}
                onPress={handleSubmit(onSubmit)}
                disabled={loading || assets.length === 0}
            >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Arıza Bildir</Text>}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 20, backgroundColor: '#F9FAFB' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    label: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 12 },
    input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 16 },
    textArea: { height: 100, textAlignVertical: 'top' },
    inputError: { borderColor: '#EF4444' },
    errorText: { color: '#EF4444', fontSize: 12, marginTop: 4, marginLeft: 4 },
    infoText: { color: '#6B7280', fontSize: 14, fontStyle: 'italic', marginBottom: 12 },
    pickerContainer: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8 },
    idContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        padding: 10,
        borderRadius: 8,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed'
    },
    idLabel: { fontSize: 14, fontWeight: '600', color: '#6B7280', marginRight: 8 },
    idValue: { fontSize: 14, fontWeight: 'bold', color: '#111827' },
    button: { backgroundColor: '#10B981', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
    buttonDisabled: { backgroundColor: '#9CA3AF' },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
