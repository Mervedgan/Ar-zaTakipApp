import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { AdminNavigator } from './AdminNavigator';
import { ActivityIndicator, View, Text } from 'react-native';

export function AppNavigator() {
    const { token, user, isLoading } = useAuth();

    console.log('AppNavigator: AdminNavigator is', !!AdminNavigator);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#6366F1" />
            </View>
        );
    }

    // Fallback if component is missing due to circular dependency or load error
    const SafeAdminNavigator = AdminNavigator || (() => (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>AdminNavigator load error. Check logs.</Text>
        </View>
    ));

    return (
        <NavigationContainer>
            {!token
                ? <AuthNavigator />
                : user?.role === 'Admin'
                    ? <SafeAdminNavigator />
                    : <MainNavigator />
            }
        </NavigationContainer>
    );
}

