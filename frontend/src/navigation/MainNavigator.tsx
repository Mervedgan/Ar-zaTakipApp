import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { DashboardScreen } from '../screens/DashboardScreen';
import { FaultListScreen } from '../screens/faults/FaultListScreen';
import { CreateFaultScreen } from '../screens/faults/CreateFaultScreen';
import { AssetListScreen } from '../screens/assets/AssetListScreen';
import { CreateAssetScreen } from '../screens/assets/CreateAssetScreen';
import { FaultDetailScreen } from '../screens/faults/FaultDetailScreen';
import { MyWorkOrdersScreen } from '../screens/faults/MyWorkOrdersScreen';
import { PurchaseOrderListScreen } from '../screens/purchase/PurchaseOrderListScreen';

export type MainStackParamList = {
    MainTabs: undefined;
    FaultDetail: { faultId: number };
    CreateFault: undefined;
    CreateAsset: undefined;
};

export type TabParamList = {
    Home: undefined;
    FaultsTab: undefined;
    MyWorkTab: undefined;
    AssetsTab: undefined;
};

export type FaultStackParamList = {
    FaultList: undefined;
    CreateFault: undefined;
    FaultDetail: { faultId: number };
};

export type AssetStackParamList = {
    AssetList: undefined;
    CreateAsset: undefined;
};

const RootStack = createNativeStackNavigator<MainStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();
const FaultStack = createNativeStackNavigator();
const AssetStack = createNativeStackNavigator();

function FaultNavigator() {
    return (
        <FaultStack.Navigator screenOptions={{ headerShown: true }}>
            <FaultStack.Screen
                name="FaultList"
                component={FaultListScreen}
                options={{ title: 'Arıza Kayıtları' }}
            />
        </FaultStack.Navigator>
    );
}

function AssetNavigator() {
    return (
        <AssetStack.Navigator screenOptions={{ headerShown: true }}>
            <AssetStack.Screen
                name="AssetList"
                component={AssetListScreen}
                options={{ title: 'Cihaz Listesi' }}
            />
        </AssetStack.Navigator>
    );
}

import { useAuth } from '../contexts/AuthContext';

function TabNavigator() {
    const { user } = useAuth();
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName = '';

                    if (route.name === 'Home') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'FaultsTab') {
                        iconName = focused ? 'alert-circle' : 'alert-circle-outline';
                    } else if (route.name === 'MyWorkTab') {
                        iconName = focused ? 'briefcase' : 'briefcase-outline';
                    } else if (route.name === 'AssetsTab') {
                        iconName = focused ? 'cube' : 'cube-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#3B82F6',
                tabBarInactiveTintColor: 'gray',
            })}
        >
            <Tab.Screen
                name="Home"
                component={DashboardScreen}
                options={{
                    title: 'Ana Sayfa',
                    headerShown: true
                }}
            />
            <Tab.Screen
                name="FaultsTab"
                component={FaultNavigator}
                options={{ title: 'Tüm Arızalar' }}
            />
            <Tab.Screen
                name="MyWorkTab"
                component={MyWorkOrdersScreen}
                options={{
                    title: user?.role === 'Admin' ? 'İşlemdekiler' : 'İşlerim',
                    headerShown: true
                }}
            />
            <Tab.Screen
                name="AssetsTab"
                component={AssetNavigator}
                options={{ title: 'Ekipmanlar' }}
            />
        </Tab.Navigator>
    );
}

export function MainNavigator() {
    return (
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
            <RootStack.Screen name="MainTabs" component={TabNavigator} />
            <RootStack.Screen
                name="FaultDetail"
                component={FaultDetailScreen}
                options={{ headerShown: true, title: 'Arıza Detayı' }}
            />
            <RootStack.Screen
                name="CreateFault"
                component={CreateFaultScreen}
                options={{ headerShown: true, title: 'Yeni Arıza Bildir' }}
            />
            <RootStack.Screen
                name="CreateAsset"
                component={CreateAssetScreen}
                options={{ headerShown: true, title: 'Yeni Cihaz Ekle' }}
            />
        </RootStack.Navigator>
    );
}
