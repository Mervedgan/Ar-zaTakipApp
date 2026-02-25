import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { ActivityIndicator, View } from 'react-native';

export function AppNavigator() {
    const { token, isLoading } = useAuth();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            {token ? <MainNavigator /> : <AuthNavigator />}
        </NavigationContainer>
    );
}
