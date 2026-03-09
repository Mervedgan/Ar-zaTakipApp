import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { AdminNavigator } from './AdminNavigator';
import { ActivityIndicator, View } from 'react-native';

export function AppNavigator() {
    const { token, user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#6366F1" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            {!token
                ? <AuthNavigator />
                : user?.role === 'Admin'
                    ? <AdminNavigator />
                    : <MainNavigator />
            }
        </NavigationContainer>
    );
}

