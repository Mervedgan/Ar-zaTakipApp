import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import api from '../../services/api';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ResetPassword'>;
type ResetPasswordRouteProp = RouteProp<AuthStackParamList, 'ResetPassword'>;

export function ResetPasswordScreen() {
    const { control, handleSubmit, formState: { errors }, watch } = useForm();
    const [loading, setLoading] = useState(false);

    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<ResetPasswordRouteProp>();
    const email = route.params?.email || '';

    const newPassword = watch('newPassword');

    const onSubmit = async (data: any) => {
        try {
            setLoading(true);
            const response = await api.post('/auth/reset-password', {
                email: email,
                code: data.code,
                newPassword: data.newPassword
            });

            Toast.show({ type: 'success', text1: 'Şifre Değiştirildi', text2: response.data.message });

            // Başarılı ise Login ekranına yönlendir
            navigation.navigate('Login');
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: 'Başarısız',
                text2: error.response?.data?.message || 'Geçersiz doğrulama kodu veya süresi dolmuş.'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Yeni Şifre Belirle</Text>
            <Text style={styles.subtitle}>
                <Text style={{ fontWeight: 'bold' }}>{email}</Text> adresine gönderilen 6 haneli doğrulama kodunu ve yeni şifrenizi giriniz.
            </Text>

            <Controller
                control={control}
                rules={{
                    required: 'Doğrulama kodu zorunludur',
                    minLength: { value: 6, message: 'Kod 6 haneli olmalıdır' },
                    maxLength: { value: 6, message: 'Kod 6 haneli olmalıdır' }
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                        style={[styles.input, errors.code && styles.inputError, { letterSpacing: 5, textAlign: 'center', fontSize: 20 }]}
                        placeholder="000000"
                        keyboardType="numeric"
                        maxLength={6}
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        autoCorrect={false}
                        spellCheck={false}
                        textContentType="oneTimeCode"
                        importantForAutofill="no"
                    />
                )}
                name="code"
            />
            {errors.code && <Text style={styles.errorText}>{errors.code.message as string}</Text>}

            <Controller
                control={control}
                rules={{
                    required: 'Yeni şifre zorunludur',
                    minLength: { value: 6, message: 'Şifreniz en az 6 karakter olmalıdır' }
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                        style={[styles.input, errors.newPassword && styles.inputError]}
                        placeholder="Yeni Şifre"
                        secureTextEntry
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        autoCorrect={false}
                        spellCheck={false}
                        textContentType="newPassword"
                        importantForAutofill="no"
                    />
                )}
                name="newPassword"
            />
            {errors.newPassword && <Text style={styles.errorText}>{errors.newPassword.message as string}</Text>}

            <Controller
                control={control}
                rules={{
                    required: 'Şifre tekrarı zorunludur',
                    validate: value => value === newPassword || 'Şifreler uyuşmuyor'
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                        style={[styles.input, errors.confirmPassword && styles.inputError]}
                        placeholder="Yeni Şifre Tekrar"
                        secureTextEntry
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        autoCorrect={false}
                        spellCheck={false}
                        textContentType="newPassword"
                        importantForAutofill="no"
                    />
                )}
                name="confirmPassword"
            />
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword.message as string}</Text>}

            <TouchableOpacity
                style={styles.button}
                onPress={handleSubmit(onSubmit)}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>Şifreyi Güncelle</Text>
                )}
            </TouchableOpacity>
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
        fontSize: 26,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 12,
        textAlign: 'center'
    },
    subtitle: {
        fontSize: 15,
        color: '#6B7280',
        marginBottom: 32,
        textAlign: 'center',
        lineHeight: 22
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
    button: {
        backgroundColor: '#10B981',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 12
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600'
    }
});
