import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import api from '../../services/api';

export function CreateAssetScreen() {
    const { control, handleSubmit, formState: { errors } } = useForm({
        defaultValues: {
            name: '',
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

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.label}>Cihaz / Ekipman Adı</Text>
            <Controller
                control={control}
                name="name"
                rules={{ required: 'Cihaz adı zorunludur' }}
                render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                        style={[styles.input, errors.name && styles.inputError]}
                        placeholder="Örn: CNC Tezgahı 01"
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
            {errors.name && <Text style={styles.errorText}>{errors.name.message as string}</Text>}

            <Text style={styles.label}>Açıklama</Text>
            <Controller
                control={control}
                name="description"
                render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                        style={styles.input}
                        placeholder="Cihaz hakkında kısa bilgi..."
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

            <Text style={styles.label}>Konum / Bölüm</Text>
            <Controller
                control={control}
                name="location"
                render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                        style={styles.input}
                        placeholder="Örn: A Blok, 2. Kat"
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

            <Text style={styles.label}>Seri Numarası</Text>
            <Controller
                control={control}
                name="serialNumber"
                render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                        style={styles.input}
                        placeholder="Varsa seri numarası..."
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

            <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSubmit(onSubmit)}
                disabled={loading}
            >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Cihazı Kaydet</Text>}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 20, backgroundColor: '#F9FAFB' },
    label: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 12 },
    input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 16 },
    inputError: { borderColor: '#EF4444' },
    errorText: { color: '#EF4444', fontSize: 12, marginTop: 4, marginLeft: 4 },
    button: { backgroundColor: '#3B82F6', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 32 },
    buttonDisabled: { backgroundColor: '#9CA3AF' },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
