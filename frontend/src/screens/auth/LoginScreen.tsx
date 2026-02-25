import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export function LoginScreen() {
    const { control, handleSubmit, formState: { errors } } = useForm();
    const [loading, setLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false); // Beni Hatırla state
    const { login } = useAuth();
    const navigation = useNavigation<NavigationProp>();

    const onSubmit = async (data: any) => {
        try {
            setLoading(true);
            const response = await api.post('/auth/login', {
                email: data.email,
                password: data.password
            });

            const { token, user } = response.data;
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
        <View style={styles.container}>
            <Text style={styles.title}>Arıza Takip Sistemi</Text>
            <Text style={styles.subtitle}>Hesabınıza giriş yapın</Text>

            <Controller
                control={control}
                rules={{ required: 'E-posta zorunludur' }}
                render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                        style={[styles.input, errors.email && styles.inputError]}
                        placeholder="E-posta"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                    />
                )}
                name="email"
            />
            {errors.email && <Text style={styles.errorText}>{errors.email.message as string}</Text>}

            <Controller
                control={control}
                rules={{ required: 'Şifre zorunludur' }}
                render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                        style={[styles.input, errors.password && styles.inputError]}
                        placeholder="Şifre"
                        secureTextEntry
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                    />
                )}
                name="password"
            />
            {errors.password && <Text style={styles.errorText}>{errors.password.message as string}</Text>}

            <TouchableOpacity
                style={styles.forgotPasswordContainer}
                onPress={() => navigation.navigate('ForgotPassword')}
            >
                <Text style={styles.forgotPasswordText}>Şifremi Unuttum</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.7}
            >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                    {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Beni Hatırla</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.button}
                onPress={handleSubmit(onSubmit)}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>Giriş Yap</Text>
                )}
            </TouchableOpacity>

            <View style={styles.footer}>
                <Text style={styles.footerText}>Hesabınız yok mu? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                    <Text style={styles.link}>Kayıt Ol</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        backgroundColor: '#F9FAFB'
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
        textAlign: 'center'
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
        marginBottom: 32,
        textAlign: 'center'
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 14,
        marginBottom: 12,
        fontSize: 16
    },
    inputError: {
        borderColor: '#EF4444'
    },
    errorText: {
        color: '#EF4444',
        fontSize: 12,
        marginTop: -8,
        marginBottom: 12,
        marginLeft: 4
    },
    forgotPasswordContainer: {
        alignItems: 'flex-end',
        marginBottom: 8,
    },
    forgotPasswordText: {
        color: '#3B82F6',
        fontSize: 14,
        fontWeight: '500'
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        marginLeft: 4
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#3B82F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10
    },
    checkboxChecked: {
        backgroundColor: '#3B82F6'
    },
    checkmark: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold'
    },
    checkboxLabel: {
        fontSize: 15,
        color: '#4B5563'
    },
    button: {
        backgroundColor: '#3B82F6',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 12
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600'
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24
    },
    footerText: {
        color: '#6B7280',
        fontSize: 14
    },
    link: {
        color: '#3B82F6',
        fontSize: 14,
        fontWeight: '600'
    }
});
