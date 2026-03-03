import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Modal } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useForm, Controller } from 'react-hook-form';
import api from '../services/api';
import Toast from 'react-native-toast-message';

export function DashboardScreen() {
    const { user, logout, login, token } = useAuth();
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ activeJobs: 0 });
    const { control, handleSubmit, formState: { errors } } = useForm({
        defaultValues: { name: user?.companyName || '', year: '' }
    });

    React.useEffect(() => {
        if (user?.role === 'Technician') {
            fetchStats();
        }
    }, [user]);

    const fetchStats = async () => {
        try {
            const res = await api.get('/workorders');
            const active = res.data.filter((w: any) => w.status !== 'Completed').length;
            setStats({ activeJobs: active });
        } catch (error) {
            console.log('Stats error');
        }
    };

    const isUnapprovedAdmin = user?.role === 'Admin' && !user?.isCompanyApproved;

    const onSetupCompany = async (data: any) => {
        try {
            setLoading(true);
            const response = await api.put('/companies/setup', {
                name: data.name,
                establishmentYear: Number(data.year)
            });

            const { companyCode, companyName } = response.data;

            // Context'i güncelle
            if (user && token) {
                const updatedUser = {
                    ...user,
                    companyName,
                    companyCode,
                    isCompanyApproved: true
                };
                await login(token, updatedUser);
            }

            Toast.show({ type: 'success', text1: 'Şirket Kurulumu Tamamlandı!', text2: `Kodunuz: ${companyCode}` });
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: 'Kurulum Başarısız',
                text2: error.response?.data?.message || 'Bir hata oluştu.'
            });
        } finally {
            setLoading(false);
        }
    };

    if (isUnapprovedAdmin) {
        return (
            <ScrollView contentContainerStyle={styles.setupContainer}>
                <View style={styles.card}>
                    <Text style={styles.setupTitle}>Şirket Kurulumunu Tamamla</Text>
                    <Text style={styles.setupSubtitle}>
                        Tebrikler! Sistemin yöneticisi olarak ilk adımı attınız. Diğer çalışanların ekibinize katılabilmesi için şirket bilgilerinizi girin.
                    </Text>

                    <Text style={styles.label}>Şirket Adı</Text>
                    <Controller control={control} rules={{ required: 'Şirket adı zorunludur' }} name="name"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput style={[styles.input, errors.name && styles.inputError]} placeholder="Şirket Tam Adı"
                                onBlur={onBlur} onChangeText={onChange} value={value}
                                autoCorrect={false} spellCheck={false}
                                textContentType="none" importantForAutofill="no"
                                keyboardType="default" />
                        )}
                    />
                    {errors.name && <Text style={styles.errorText}>{errors.name.message as string}</Text>}

                    <Text style={styles.label}>Kuruluş Yılı</Text>
                    <Controller control={control} rules={{ required: 'Kuruluş yılı zorunludur', minLength: { value: 4, message: 'Geçersiz yıl' } }} name="year"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput style={[styles.input, errors.year && styles.inputError]} placeholder="Örn: 2024"
                                keyboardType="numeric" maxLength={4} onBlur={onBlur} onChangeText={onChange} value={value}
                                autoCorrect={false} spellCheck={false}
                                textContentType="none" importantForAutofill="no" />
                        )}
                    />
                    {errors.year && <Text style={styles.errorText}>{errors.year.message as string}</Text>}

                    <TouchableOpacity style={styles.setupButton} onPress={handleSubmit(onSetupCompany)} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Şirketi Kaydet ve Kod Al</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.logoutLink} onPress={logout}>
                        <Text style={styles.logoutLinkText}>Çıkış Yap</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.headerCard}>
                <Text style={styles.welcomeText}>Hoşgeldiniz,</Text>
                <Text style={styles.userName}>{user?.name}</Text>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{user?.role}</Text>
                </View>
            </View>

            {user?.role === 'Technician' && (
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{stats.activeJobs}</Text>
                        <Text style={styles.statLabel}>Aktif İşlerim</Text>
                    </View>
                </View>
            )}

            {user?.role === 'Admin' && user?.companyCode && (
                <View style={styles.infoCard}>
                    <Text style={styles.infoLabel}>Şirketiniz: {user.companyName}</Text>
                    <View style={styles.codeContainer}>
                        <Text style={styles.codeLabel}>Davet Kodunuz:</Text>
                        <Text style={styles.codeValue}>{user.companyCode}</Text>
                    </View>
                    <Text style={styles.infoHelp}>Bu kodu çalışanlarınıza vererek sisteme dahil edebilirsiniz.</Text>
                </View>
            )}

            <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                <Text style={styles.logoutButtonText}>Güvenli Çıkış</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6', padding: 20, justifyContent: 'center' },
    setupContainer: { flexGrow: 1, backgroundColor: '#F3F4F6', padding: 20, justifyContent: 'center' },
    card: { backgroundColor: '#fff', padding: 24, borderRadius: 16, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
    setupTitle: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 8, textAlign: 'center' },
    setupSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 24, textAlign: 'center', lineHeight: 20 },
    headerCard: { backgroundColor: '#fff', padding: 24, borderRadius: 16, marginBottom: 16, alignItems: 'center' },
    welcomeText: { fontSize: 16, color: '#6B7280' },
    userName: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginVertical: 4 },
    badge: { backgroundColor: '#E5E7EB', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 8 },
    badgeText: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
    infoCard: { backgroundColor: '#EEF2FF', padding: 20, borderRadius: 16, marginBottom: 30, borderLeftWidth: 4, borderLeftColor: '#4F46E5' },
    infoLabel: { fontSize: 16, fontWeight: 'bold', color: '#1E1B4B', marginBottom: 12 },
    codeContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 8, justifyContent: 'space-between' },
    codeLabel: { fontSize: 14, color: '#4B5563' },
    codeValue: { fontSize: 20, fontWeight: 'bold', color: '#4F46E5', letterSpacing: 2 },
    infoHelp: { fontSize: 12, color: '#6366F1', marginTop: 12, fontStyle: 'italic' },
    label: { fontSize: 14, color: '#374151', marginBottom: 6, fontWeight: '500' },
    input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16 },
    inputError: { borderColor: '#EF4444' },
    errorText: { color: '#EF4444', fontSize: 12, marginTop: -8, marginBottom: 12 },
    setupButton: { backgroundColor: '#4F46E5', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 12 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    logoutButton: { padding: 16, alignItems: 'center' },
    logoutButtonText: { color: '#EF4444', fontWeight: '600' },
    logoutLink: { marginTop: 20, alignItems: 'center' },
    logoutLinkText: { color: '#9CA3AF', fontSize: 14 },
    statsRow: { flexDirection: 'row', marginBottom: 20 },
    statCard: { backgroundColor: '#fff', flex: 1, padding: 20, borderRadius: 16, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    statValue: { fontSize: 32, fontWeight: 'bold', color: '#10B981' },
    statLabel: { fontSize: 14, color: '#6B7280', marginTop: 4 }
});
