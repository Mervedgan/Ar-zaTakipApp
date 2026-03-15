import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export function LoginScreen() {
    const { control, handleSubmit, formState: { errors } } = useForm();
    const [loading, setLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const { login } = useAuth();
    const navigation = useNavigation<NavigationProp>();

    const onSubmit = async (data: any) => {
        try {
            setLoading(true);
            const response = await api.post('/auth/login', {
                email: data.email,
                password: data.password
            });

            const { token, userId, name, email, role, companyId, companyName, companyCode, isCompanyApproved } = response.data;
            const user = { id: userId, name, email, role, companyId, companyName, companyCode, isCompanyApproved };
            await login(token, user, rememberMe);

            Toast.show({ type: 'success', text1: 'Giriş Başarılı' });
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: 'Giriş Başarısız',
                text2: error.response?.data?.message || 'Bilgilerinizi kontrol ediniz.'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.header}>
                    <View style={styles.logoBox}>
                        <Ionicons name="flash" size={40} color="#6366F1" />
                    </View>
                    <Text style={styles.title}>Arıza Takip</Text>
                    <Text style={styles.subtitle}>Sisteme giriş yaparak devam edin</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>E-posta Adresi</Text>
                        <Controller
                            control={control}
                            rules={{ required: 'E-posta zorunludur' }}
                            render={({ field: { onChange, onBlur, value } }) => (
                                <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
                                    <Ionicons name="mail-outline" size={20} color="#94A3B8" />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="ornek@sirket.com"
                                        placeholderTextColor="#CBD5E1"
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                        onBlur={onBlur}
                                        onChangeText={onChange}
                                        value={value}
                                        autoCorrect={false}
                                    />
                                </View>
                            )}
                            name="email"
                        />
                        {errors.email && <Text style={styles.errorText}>{errors.email.message as string}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Şifre</Text>
                        <Controller
                            control={control}
                            rules={{ required: 'Şifre zorunludur' }}
                            render={({ field: { onChange, onBlur, value } }) => (
                                <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
                                    <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="••••••••"
                                        placeholderTextColor="#CBD5E1"
                                        secureTextEntry
                                        onBlur={onBlur}
                                        onChangeText={onChange}
                                        value={value}
                                        autoCorrect={false}
                                    />
                                </View>
                            )}
                            name="password"
                        />
                        {errors.password && <Text style={styles.errorText}>{errors.password.message as string}</Text>}
                    </View>

                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={styles.checkboxArea}
                            onPress={() => setRememberMe(!rememberMe)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                                {rememberMe && <Ionicons name="checkmark" size={14} color="#fff" />}
                            </View>
                            <Text style={styles.checkboxLabel}>Beni Hatırla</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                            <Text style={styles.forgotText}>Şifremi Unuttum</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
                        onPress={handleSubmit(onSubmit)}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.loginBtnText}>Giriş Yap</Text>
                                <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
                            </>
                        )}
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Yeni misiniz? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                            <Text style={styles.footerLink}>Hesap Oluştur</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
    header: { alignItems: 'center', marginBottom: 40 },
    logoBox: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 32, fontWeight: '900', color: '#1E293B' },
    subtitle: { fontSize: 15, color: '#64748B', marginTop: 8 },
    form: { width: '100%' },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 8 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 16 },
    inputError: { borderColor: '#EF4444' },
    input: { flex: 1, height: 56, marginLeft: 12, fontSize: 16, color: '#1E293B' },
    errorText: { color: '#EF4444', fontSize: 12, marginTop: 4, marginLeft: 4 },
    actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
    checkboxArea: { flexDirection: 'row', alignItems: 'center' },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#6366F1', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    checkboxChecked: { backgroundColor: '#6366F1' },
    checkboxLabel: { fontSize: 14, color: '#475569', fontWeight: '500' },
    forgotText: { color: '#6366F1', fontSize: 14, fontWeight: '700' },
    loginBtn: { backgroundColor: '#6366F1', height: 60, borderRadius: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    loginBtnDisabled: { backgroundColor: '#94A3B8' },
    loginBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
    footerText: { color: '#64748B', fontSize: 14 },
    footerLink: { color: '#6366F1', fontSize: 14, fontWeight: '800' }
});
