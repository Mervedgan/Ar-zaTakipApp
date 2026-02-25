import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import api from '../../services/api';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen() {
    const { control, handleSubmit, formState: { errors } } = useForm();
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation<NavigationProp>();

    const onSubmit = async (data: any) => {
        try {
            setLoading(true);
            const response = await api.post('/auth/forgot-password', {
                email: data.email
            });

            Toast.show({ type: 'success', text1: 'Başarılı', text2: response.data.message });

            // Eğer istek başarılıysa, bu mail adresiyle birlikte Reset ekranına geçelim
            navigation.navigate('ResetPassword', { email: data.email });
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: 'Başarısız',
                text2: error.response?.data?.message || 'Bir hata oluştu.'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Şifremi Unuttum</Text>
            <Text style={styles.subtitle}>
                Kayıtlı e-posta adresinizi giriniz. Şifre sıfırlama kodunuzu e-posta olarak göndereceğiz.
            </Text>

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

            <TouchableOpacity
                style={styles.button}
                onPress={handleSubmit(onSubmit)}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>Doğrulama Kodu Gönder</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
            >
                <Text style={styles.backButtonText}>Girişe Dön</Text>
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
        fontSize: 28,
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
    backButton: {
        marginTop: 20,
        alignItems: 'center'
    },
    backButtonText: {
        color: '#6B7280',
        fontSize: 15,
        fontWeight: '500'
    }
});
