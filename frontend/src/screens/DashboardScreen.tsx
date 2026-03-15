import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useForm, Controller } from 'react-hook-form';
import api from '../services/api';
import Toast from 'react-native-toast-message';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';

export function DashboardScreen({ navigation }: any) {
    const { user, logout, login, token } = useAuth();
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({ activeJobs: 0, totalAssets: 0, activeFaults: 0 });

    const { control, handleSubmit, formState: { errors } } = useForm({
        defaultValues: { name: user?.companyName || '', year: '' }
    });

    const fetchStats = async () => {
        try {
            const [ordersRes, assetsRes, faultsRes] = await Promise.all([
                api.get('/workorders').catch(() => ({ data: [] })),
                api.get('/assets').catch(() => ({ data: [] })),
                api.get('/faultreports').catch(() => ({ data: [] })),
            ]);

            const activeWork = ordersRes.data.filter((w: any) => w.status !== 'Completed' && w.status !== 'Resolved').length;
            const activeFaults = faultsRes.data.filter((f: any) => f.status !== 'Closed' && f.status !== 'Resolved').length;

            setStats({
                activeJobs: activeWork,
                totalAssets: assetsRes.data.length,
                activeFaults: activeFaults
            });
        } catch (error) {
            console.log('Stats error:', error);
        } finally {
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { fetchStats(); }, []));

    const onSetupCompany = async (data: any) => {
        try {
            setLoading(true);
            const response = await api.put('/companies/setup', {
                name: data.name,
                establishmentYear: Number(data.year)
            });

            const { companyCode, companyName } = response.data;
            if (user && token) {
                const updatedUser = { ...user, companyName, companyCode, isCompanyApproved: true };
                await login(token, updatedUser);
            }
            Toast.show({ type: 'success', text1: 'Şerkit Kurulumu Tamamlandı!', text2: `Kodunuz: ${companyCode}` });
        } catch (error: any) {
            Toast.show({ type: 'error', text1: 'Kurulum Başarısız', text2: error.response?.data?.message || 'Bir hata oluştu.' });
        } finally {
            setLoading(false);
        }
    };

    const isUnapprovedAdmin = user?.role === 'Admin' && !user?.isCompanyApproved;

    if (isUnapprovedAdmin) {
        return (
            <ScrollView contentContainerStyle={styles.setupContainer}>
                <View style={styles.modalCard}>
                    <Text style={styles.setupTitle}>Şirket Kurulumu</Text>
                    <Text style={styles.setupSubtitle}>
                        Sistemi kullanmaya başlamak için şirket bilgilerinizi tamamlayın.
                    </Text>

                    <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>Şirket Adı</Text>
                        <Controller control={control} rules={{ required: 'Şirket adı zorunludur' }} name="name"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="business-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                                    <TextInput style={styles.formInput} placeholder="Şirket Tam Adı"
                                        onBlur={onBlur} onChangeText={onChange} value={value} />
                                </View>
                            )}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>Kuruluş Yılı</Text>
                        <Controller control={control} rules={{ required: 'Kuruluş yılı zorunludur' }} name="year"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="calendar-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                                    <TextInput style={styles.formInput} placeholder="Örn: 2024"
                                        keyboardType="numeric" maxLength={4} onBlur={onBlur} onChangeText={onChange} value={value} />
                                </View>
                            )}
                        />
                    </View>

                    <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit(onSetupCompany)} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Kaydet ve Başlat</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.logoutLink} onPress={logout}>
                        <Text style={styles.logoutLinkText}>Çıkış Yap</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} />}
        >
            {/* Indigo Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.openDrawer()}>
                        <Ionicons name="menu-outline" size={28} color="#fff" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.welcomeText}>Hoş Geldiniz,</Text>
                        <Text style={styles.userName}>{user?.name}</Text>
                    </View>
                </View>
                <View style={styles.headerRight}>
                    <View style={styles.profileCircle}>
                        <Text style={styles.profileInitial}>{user?.name?.charAt(0).toUpperCase()}</Text>
                    </View>
                </View>
            </View>

            {/* KPI Section */}
            <View style={styles.kpiGrid}>
                <TouchableOpacity 
                    style={[styles.kpiCard, { backgroundColor: '#6366F1' }]}
                    onPress={() => navigation.navigate('AssetsTab')}
                >
                    <Ionicons name="cube-outline" size={20} color="#fff" />
                    <Text style={styles.kpiValue}>{stats.totalAssets}</Text>
                    <Text style={styles.kpiLabel}>Kayıtlı Cihaz</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.kpiCard, { backgroundColor: '#EF4444' }]}
                    onPress={() => navigation.navigate('FaultsTab')}
                >
                    <Ionicons name="alert-circle-outline" size={20} color="#fff" />
                    <Text style={styles.kpiValue}>{stats.activeFaults}</Text>
                    <Text style={styles.kpiLabel}>Aktif Arıza</Text>
                </TouchableOpacity>
                {user?.role === 'Technician' && (
                    <TouchableOpacity 
                        style={[styles.kpiCard, { backgroundColor: '#10B981', width: '100%' }]}
                        onPress={() => navigation.navigate('MyWorkTab')}
                    >
                        <Ionicons name="briefcase-outline" size={20} color="#fff" />
                        <Text style={styles.kpiValue}>{stats.activeJobs}</Text>
                        <Text style={styles.kpiLabel}>Üzerimdeki İşler</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Hızlı Erişim</Text>
                <View style={styles.quickGrid}>
                    <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('CreateFault')}>
                        <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
                            <Ionicons name="add-circle-outline" size={26} color="#EF4444" />
                        </View>
                        <Text style={styles.quickLabel}>Arıza Bildir</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('AssetsTab')}>
                        <View style={[styles.iconBox, { backgroundColor: '#EEF2FF' }]}>
                            <Ionicons name="cube-outline" size={26} color="#6366F1" />
                        </View>
                        <Text style={styles.quickLabel}>Cihazlar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('FaultsTab')}>
                        <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
                            <Ionicons name="list-outline" size={26} color="#10B981" />
                        </View>
                        <Text style={styles.quickLabel}>Tüm Arızalar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('MyWorkTab')}>
                        <View style={[styles.iconBox, { backgroundColor: '#FFF7ED' }]}>
                            <Ionicons name="briefcase-outline" size={26} color="#F97316" />
                        </View>
                        <Text style={styles.quickLabel}>İşlerim</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Company Info */}
            <View style={styles.section}>
                <View style={styles.infoRow}>
                    <Ionicons name="business-outline" size={20} color="#6366F1" />
                    <Text style={styles.infoTitle}>{user?.companyName || 'Şirket Bilgisi Yok'}</Text>
                </View>
                {user?.role === 'Admin' && user?.companyCode && (
                    <View style={styles.codeBox}>
                        <Text style={styles.codeText}>Şirket Kodu: {user.companyCode}</Text>
                        <Text style={styles.codeHint}>Çalışanlar bu kodla ekibinize katılabilir.</Text>
                    </View>
                )}
            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F1F5F9' },
    header: {
        backgroundColor: '#6366F1',
        paddingTop: 60,
        paddingBottom: 30,
        paddingHorizontal: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    menuBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerRight: { alignItems: 'flex-end' },
    profileCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
    profileInitial: { color: '#fff', fontSize: 18, fontWeight: '800' },
    welcomeText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
    userName: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 2 },
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 10 },
    kpiCard: { flex: 1, minWidth: '45%', borderRadius: 16, padding: 14, alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
    kpiValue: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 4 },
    kpiLabel: { fontSize: 11, color: 'rgba(255,255,255,0.9)', marginTop: 2, fontWeight: '600' },
    section: { backgroundColor: '#fff', borderRadius: 24, marginHorizontal: 16, marginBottom: 16, padding: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 16 },
    quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    quickBtn: { flex: 1, minWidth: '45%', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
    iconBox: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    quickLabel: { fontSize: 13, fontWeight: '700', color: '#475569' },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    infoTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
    codeBox: { marginTop: 12, backgroundColor: '#F0F9FF', padding: 12, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#0EA5E9' },
    codeText: { fontSize: 15, fontWeight: '700', color: '#0369A1' },
    codeHint: { fontSize: 12, color: '#0EA5E9', marginTop: 2 },
    setupContainer: { flexGrow: 1, backgroundColor: '#F1F5F9', padding: 20, justifyContent: 'center' },
    modalCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
    setupTitle: { fontSize: 24, fontWeight: '800', color: '#1E293B', textAlign: 'center' },
    setupSubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 8, marginBottom: 24 },
    formGroup: { marginBottom: 16 },
    formLabel: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 8 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 16 },
    inputIcon: { marginRight: 12 },
    formInput: { flex: 1, height: 48, fontSize: 16, color: '#1E293B' },
    saveBtn: { backgroundColor: '#6366F1', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 10 },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    logoutLink: { marginTop: 20, alignItems: 'center' },
    logoutLinkText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' }
});
