import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export function DashboardScreen() {
    const { user, logout } = useAuth();

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Hoşgeldiniz, {user?.name}</Text>
            <Text style={styles.role}>Rol: {user?.role}</Text>
            <Button title="Çıkış Yap" onPress={logout} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
    role: { fontSize: 16, marginBottom: 30, color: 'gray' },
});
