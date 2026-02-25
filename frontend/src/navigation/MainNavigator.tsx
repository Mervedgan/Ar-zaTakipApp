import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardScreen } from '../screens/DashboardScreen';

export type MainStackParamList = {
    Dashboard: undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export function MainNavigator() {
    return (
        <Stack.Navigator>
            <Stack.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={{ title: 'Arıza Takip Paneli' }}
            />
        </Stack.Navigator>
    );
}
