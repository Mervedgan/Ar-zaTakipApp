import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import api from '../../services/api';

interface Asset {
    id: number;
    name: string;
    description: string;
    location: string;
    isActive: boolean;
}

export function AssetListScreen() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [assets, setAssets] = useState<Asset[]>([]);
    const navigation = useNavigation<any>();

    const fetchAssets = async () => {
        try {
            const response = await api.get('/assets');
            setAssets(response.data);
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Cihazlar yüklenemedi' });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchAssets();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchAssets();
    };

    const renderItem = ({ item }: { item: Asset }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.name}>{item.name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: item.isActive ? '#10B981' : '#EF4444' }]}>
                    <Text style={styles.statusText}>{item.isActive ? 'Aktif' : 'Pasif'}</Text>
                </View>
            </View>
            {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
            <Text style={styles.location}>📍 {item.location || 'Konum belirtilmedi'}</Text>
        </View>
    );

    if (loading && !refreshing) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={assets}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Henüz kayıtlı cihaz bulunmuyor.</Text>
                        <TouchableOpacity
                            style={styles.emptyButton}
                            onPress={() => navigation.navigate('CreateAsset')}
                        >
                            <Text style={styles.emptyButtonText}>İlk Cihazı Ekle</Text>
                        </TouchableOpacity>
                    </View>
                }
                contentContainerStyle={styles.listContent}
            />

            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('CreateAsset')}
            >
                <Text style={styles.fabIcon}>+</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 16, paddingBottom: 100 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#3B82F6'
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    name: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    statusText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    description: { fontSize: 14, color: '#4B5563', marginBottom: 8 },
    location: { fontSize: 13, color: '#6B7280' },
    emptyContainer: { alignItems: 'center', marginTop: 100, padding: 20 },
    emptyText: { fontSize: 16, color: '#6B7280', marginBottom: 16 },
    emptyButton: { backgroundColor: '#3B82F6', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
    emptyButtonText: { color: '#fff', fontWeight: 'bold' },
    fab: {
        position: 'absolute',
        right: 24,
        bottom: 24,
        backgroundColor: '#3B82F6',
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4
    },
    fabIcon: { color: '#fff', fontSize: 32, fontWeight: 'bold' }
});
