import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { AdminNavigator } from './AdminNavigator';
import { PurchaseNavigator } from './PurchaseNavigator';
import { ActivityIndicator, View, Text } from 'react-native';

function NavigatorSelector() {
    const { token, user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#6366F1" />
            </View>
        );
    }

    if (!token)                      return <AuthNavigator />;
    if (user?.role === 'Admin')      return <AdminNavigator />;
    if (user?.role === 'Purchasing') return <PurchaseNavigator />;

    // Fallback: Employee, Technician, WarehouseKeeper → MainNavigator
    return <MainNavigator />;
}

export function AppNavigator() {
    return (
        <NavigationContainer>
            <NavigatorSelector />
        </NavigationContainer>
    );
}
