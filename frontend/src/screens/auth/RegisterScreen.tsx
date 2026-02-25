import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import { Picker } from '@react-native-picker/picker';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import api from '../../services/api';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

interface Sector {
    id: number;
    name: string;
    isCustom: boolean;
}

export function RegisterScreen() {
    const { control, handleSubmit, watch, formState: { errors }, setValue } = useForm({
        defaultValues: {
            name: '', email: '', password: '', confirmPassword: '', phone: '', role: 'Admin',
            companyName: '', sectorId: 1, customSectorName: ''
        }
    });

    const password = watch('password');

    const [loading, setLoading] = useState(false);
    const [sectors, setSectors] = useState<Sector[]>([]);
    const navigation = useNavigation<NavigationProp>();

    const selectedSectorId = watch('sectorId');
    const selectedSector = sectors.find(s => s.id === Number(selectedSectorId));
    const isCustomSector = selectedSector?.isCustom || false;

    useEffect(() => {
        fetchSectors();
    }, []);

    const fetchSectors = async () => {
        try {
            const response = await api.get('/sectors');
            setSectors(response.data);
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Sektörler yüklenemedi' });
        }
    };

    const formatPhoneNumber = (value: string) => {
        if (!value) return value;
        const nums = value.replace(/[^\d]/g, '');
        let local = nums;
        if (local.startsWith('90')) local = local.slice(2);

        if (local.length === 0) return '';
        if (local.length <= 3) return '+90 (' + local;
        if (local.length <= 6) return '+90 (' + local.slice(0, 3) + ') ' + local.slice(3);
        if (local.length <= 8) return '+90 (' + local.slice(0, 3) + ') ' + local.slice(3, 6) + ' ' + local.slice(6);
        return '+90 (' + local.slice(0, 3) + ') ' + local.slice(3, 6) + ' ' + local.slice(6, 8) + ' ' + local.slice(8, 10);
    };

    const onSubmit = async (data: any) => {
        try {
            setLoading(true);
            await api.post('/auth/register', {
                name: data.name,
                email: data.email,
                password: data.password,
                phone: data.phone,
                role: data.role,
                companyName: data.companyName,
                sectorId: Number(data.sectorId),
                customSectorName: isCustomSector ? data.customSectorName : null
            });

            Toast.show({ type: 'success', text1: 'Kayıt başarılı! Giriş yapabilirsiniz.' });
            navigation.navigate('Login');
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: 'Kayıt Başarısız',
                text2: error.response?.data?.message || 'Bilgileri kontrol ediniz.'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Yeni Kayıt</Text>

            {/* İsim */}
            <Controller control={control} rules={{ required: 'İsim zorunludur' }} name="name"
                render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput style={[styles.input, errors.name && styles.inputError]} placeholder="Ad Soyad"
                        onBlur={onBlur} onChangeText={onChange} value={value} />
                )}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name.message as string}</Text>}

            {/* Email */}
            <Controller control={control} rules={{ required: 'E-posta zorunludur' }} name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput style={[styles.input, errors.email && styles.inputError]} placeholder="E-posta"
                        autoCapitalize="none" keyboardType="email-address"
                        onBlur={onBlur} onChangeText={onChange} value={value} />
                )}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email.message as string}</Text>}

            {/* Şifre */}
            <Controller control={control} rules={{ required: 'Şifre zorunludur', minLength: { value: 6, message: 'En az 6 karakter' } }} name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput style={[styles.input, errors.password && styles.inputError]} placeholder="Şifre" secureTextEntry
                        onBlur={onBlur} onChangeText={onChange} value={value} />
                )}
            />
            {errors.password && <Text style={styles.errorText}>{errors.password.message as string}</Text>}

            {/* Şifre Tekrar */}
            <Controller
                control={control}
                rules={{
                    required: 'Şifre tekrarı zorunludur',
                    validate: value => value === password || 'Şifreler uyuşmuyor'
                }}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                        style={[styles.input, errors.confirmPassword && styles.inputError]}
                        placeholder="Şifre (Tekrar)"
                        secureTextEntry
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                    />
                )}
            />
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword.message as string}</Text>}

            {/* Telefon */}
            <Controller control={control}
                rules={{
                    required: 'Telefon zorunludur',
                    validate: value => value.length === 19 || 'Geçerli bir telefon numarası giriniz'
                }}
                name="phone"
                render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                        style={[styles.input, errors.phone && styles.inputError]}
                        placeholder="+90 (___) ___ __ __"
                        keyboardType="phone-pad"
                        onBlur={onBlur}
                        onChangeText={(text) => {
                            const formatted = formatPhoneNumber(text);
                            onChange(formatted);
                        }}
                        value={value}
                    />
                )}
            />
            {errors.phone && <Text style={styles.errorText}>{errors.phone.message as string}</Text>}

            {/* Rol */}
            <Text style={styles.label}>Rolünüz</Text>
            <Controller control={control} name="role"
                render={({ field: { onChange, value } }) => (
                    <View style={styles.pickerContainer}>
                        <Picker selectedValue={value} onValueChange={onChange}>
                            <Picker.Item label="Yönetici (Admin)" value="Admin" />
                            <Picker.Item label="Çalışan (Sorun Bildiren)" value="Employee" />
                            <Picker.Item label="Teknisyen" value="Technician" />
                            <Picker.Item label="Depo Sorumlusu" value="WarehouseKeeper" />
                            <Picker.Item label="Satın Alma Sorumlusu" value="Purchasing" />
                        </Picker>
                    </View>
                )}
            />

            {/* Şirket Adı */}
            <Controller control={control} rules={{ required: 'Şirket adı zorunludur' }} name="companyName"
                render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput style={[styles.input, errors.companyName && styles.inputError]} placeholder="Şirket / Organizasyon Adı"
                        onBlur={onBlur} onChangeText={onChange} value={value} />
                )}
            />
            {errors.companyName && <Text style={styles.errorText}>{errors.companyName.message as string}</Text>}

            {/* Sektör */}
            <Text style={styles.label}>Sektörünüz</Text>
            <Controller control={control} name="sectorId"
                render={({ field: { onChange, value } }) => (
                    <View style={styles.pickerContainer}>
                        <Picker selectedValue={value} onValueChange={onChange}>
                            {sectors.map(s => <Picker.Item key={s.id} label={s.name} value={s.id} />)}
                        </Picker>
                    </View>
                )}
            />

            {/* Özel Sektör */}
            {isCustomSector && (
                <Controller control={control} rules={{ required: 'Lütfen sektörünüzü belirtin' }} name="customSectorName"
                    render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput style={[styles.input, errors.customSectorName && styles.inputError]} placeholder="Lütfen Sektörünüzü Yazın"
                            onBlur={onBlur} onChangeText={onChange} value={value} />
                    )}
                />
            )}
            {errors.customSectorName && <Text style={styles.errorText}>{errors.customSectorName.message as string}</Text>}

            <TouchableOpacity style={styles.button} onPress={handleSubmit(onSubmit)} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Kayıt Ol</Text>}
            </TouchableOpacity>

            <View style={styles.footer}>
                <Text style={styles.footerText}>Zaten hesabınız var mı? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.link}>Giriş Yap</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, padding: 24, backgroundColor: '#F9FAFB', justifyContent: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 24, textAlign: 'center' },
    label: { fontSize: 14, color: '#374151', marginBottom: 6, fontWeight: '500' },
    input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16 },
    inputError: { borderColor: '#EF4444' },
    errorText: { color: '#EF4444', fontSize: 12, marginTop: -8, marginBottom: 12, marginLeft: 4 },
    pickerContainer: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, marginBottom: 12 },
    button: { backgroundColor: '#10B981', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 12 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24, marginBottom: 40 },
    footerText: { color: '#6B7280', fontSize: 14 },
    link: { color: '#10B981', fontSize: 14, fontWeight: '600' }
});
