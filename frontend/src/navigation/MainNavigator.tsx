import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, TouchableWithoutFeedback, Easing } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';
import { DashboardScreen } from '../screens/DashboardScreen';
import { FaultListScreen } from '../screens/faults/FaultListScreen';
import { CreateFaultScreen } from '../screens/faults/CreateFaultScreen';
import { AssetListScreen } from '../screens/assets/AssetListScreen';
import { CreateAssetScreen } from '../screens/assets/CreateAssetScreen';
import { FaultDetailScreen } from '../screens/faults/FaultDetailScreen';
import { MyWorkOrdersScreen } from '../screens/faults/MyWorkOrdersScreen';
import { MyPurchaseRequestsScreen } from '../screens/purchase/MyPurchaseRequestsScreen';
import { TechnicianStockScreen } from '../screens/technician/TechnicianStockScreen';

const DRAWER_WIDTH = 280;

export const MainDrawerContext = React.createContext({
    openDrawer: () => { },
    closeDrawer: () => { },
    toggleDrawer: () => { },
});

const DashboardWrapper = (props: any) => {
    const drawer = React.useContext(MainDrawerContext);
    return <DashboardScreen {...props} navigation={{ ...props.navigation, openDrawer: drawer.openDrawer }} />;
};
const FaultListWrapper = (props: any) => {
    const drawer = React.useContext(MainDrawerContext);
    return <FaultListScreen {...props} navigation={{ ...props.navigation, openDrawer: drawer.openDrawer }} />;
};
const AssetListWrapper = (props: any) => {
    const drawer = React.useContext(MainDrawerContext);
    return <AssetListScreen {...props} navigation={{ ...props.navigation, openDrawer: drawer.openDrawer }} />;
};
const MyWorkOrdersWrapper = (props: any) => {
    const drawer = React.useContext(MainDrawerContext);
    return <MyWorkOrdersScreen {...props} navigation={{ ...props.navigation, openDrawer: drawer.openDrawer }} />;
};
const MyPurchaseRequestsWrapper = (props: any) => {
    const drawer = React.useContext(MainDrawerContext);
    return <MyPurchaseRequestsScreen {...props} navigation={{ ...props.navigation, openDrawer: drawer.openDrawer }} />;
};
const TechnicianStockWrapper = (props: any) => {
    const drawer = React.useContext(MainDrawerContext);
    return <TechnicianStockScreen {...props} navigation={{ ...props.navigation, openDrawer: drawer.openDrawer }} />;
};

const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
    const { user } = useAuth();
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName = '';
                    if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
                    else if (route.name === 'FaultsTab') iconName = focused ? 'alert-circle' : 'alert-circle-outline';
                    else if (route.name === 'MyWorkTab') iconName = focused ? 'briefcase' : 'briefcase-outline';
                    else if (route.name === 'PurchaseTab') iconName = focused ? 'cart' : 'cart-outline';
                    else if (route.name === 'AssetsTab') iconName = focused ? 'cube' : 'cube-outline';
                    else if (route.name === 'TechStockTab') iconName = focused ? 'layers' : 'layers-outline';
                    return <Ionicons name={iconName || 'help-outline'} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#6366F1',
                tabBarInactiveTintColor: '#94A3B8',
                tabBarStyle: { height: 60, paddingBottom: 10, paddingTop: 10 }
            })}
        >
            <Tab.Screen name="Home" component={DashboardWrapper} options={{ title: 'Ana Sayfa' }} />
            <Tab.Screen name="FaultsTab" component={FaultListWrapper} options={{ title: 'Arızalar' }} />
            <Tab.Screen name="MyWorkTab" component={MyWorkOrdersWrapper} options={{ title: 'İşlemlerim' }} />
            <Tab.Screen 
                name="AssetsTab" 
                component={AssetListWrapper} 
                options={{ 
                    title: 'Cihazlar', 
                    tabBarButton: () => null,
                    tabBarItemStyle: { display: 'none' }
                }} 
            />
            <Tab.Screen 
                name="PurchaseTab" 
                component={MyPurchaseRequestsWrapper} 
                options={{ 
                    title: 'Parça Taleplerim', 
                    tabBarButton: () => null,
                    tabBarItemStyle: { display: 'none' }
                }} 
            />
            <Tab.Screen 
                name="TechStockTab" 
                component={TechnicianStockWrapper} 
                options={{ 
                    title: 'Stok', 
                    tabBarButton: (user?.role === 'Technician' || user?.role === 'WarehouseKeeper') ? undefined : () => null,
                    tabBarItemStyle: (user?.role === 'Technician' || user?.role === 'WarehouseKeeper') ? undefined : { display: 'none' }
                }} 
            />
        </Tab.Navigator>
    );
}

export function MainNavigator() {
    const [isOpen, setIsOpen] = useState(false);
    const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const openDrawer = () => {
        setIsOpen(true);
        Animated.parallel([
            Animated.timing(drawerAnim, { toValue: 0, duration: 250, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true })
        ]).start();
    };

    const closeDrawer = () => {
        Animated.parallel([
            Animated.timing(drawerAnim, { toValue: -DRAWER_WIDTH, duration: 250, easing: Easing.in(Easing.ease), useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true })
        ]).start(() => setIsOpen(false));
    };

    return (
        <MainDrawerContext.Provider value={{ openDrawer, closeDrawer, toggleDrawer: () => isOpen ? closeDrawer() : openDrawer() }}>
            <View style={{ flex: 1 }}>
                <RootStack.Navigator screenOptions={{ headerShown: false }}>
                    <RootStack.Screen name="MainTabs" component={TabNavigator} />
                    <RootStack.Screen name="FaultDetail" component={FaultDetailScreen} />
                    <RootStack.Screen name="CreateFault" component={CreateFaultScreen} />
                    <RootStack.Screen name="CreateAsset" component={CreateAssetScreen} />
                </RootStack.Navigator>

                {isOpen && (
                    <TouchableWithoutFeedback onPress={closeDrawer}>
                        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} />
                    </TouchableWithoutFeedback>
                )}

                <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}>
                    <CustomDrawerContent closeDrawer={closeDrawer} />
                </Animated.View>
            </View>
        </MainDrawerContext.Provider>
    );
}

function CustomDrawerContent({ closeDrawer }: { closeDrawer: () => void }) {
    const { user, logout } = useAuth();
    const navigation = useNavigation<any>();

    const MENU_ITEMS = [
        { name: 'Ana Sayfa', icon: 'home-outline', screen: 'Home' },
        { name: 'Arızalar', icon: 'alert-circle-outline', screen: 'FaultsTab' },
        { name: 'İşlemlerim', icon: 'briefcase-outline', screen: 'MyWorkTab' },
        (user?.role === 'Technician' || user?.role === 'WarehouseKeeper') ? { name: 'Stok Durumu', icon: 'layers-outline', screen: 'TechStockTab' } : null,
        { name: 'Cihazlar', icon: 'cube-outline', screen: 'AssetsTab' },
    ].filter(Boolean) as any[];

    return (
        <View style={styles.drawerContent}>
            <View style={styles.drawerHeader}>
                <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || 'U'}</Text>
                </View>
                <Text style={styles.drawerName}>{user?.name}</Text>
                <Text style={styles.drawerRole}>{user?.role === 'Technician' ? 'Teknisyen' : user?.role === 'WarehouseKeeper' ? 'Depo Sorumlusu' : 'Çalışan'}</Text>
            </View>

            <View style={styles.menuList}>
                {MENU_ITEMS.map(item => (
                    <TouchableOpacity
                        key={item.screen}
                        style={styles.menuItem}
                        onPress={() => { 
                            navigation.navigate('MainTabs', { screen: item.screen }); 
                            closeDrawer(); 
                        }}
                    >
                        <Ionicons name={item.icon} size={22} color="#64748B" />
                        <Text style={styles.menuItemText}>{item.name}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={{ flex: 1 }} />
            <View style={styles.divider} />

            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                <Text style={styles.logoutText}>Güvenli Çıkış</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10 },
    drawer: { position: 'absolute', top: 0, bottom: 0, left: 0, width: DRAWER_WIDTH, backgroundColor: '#fff', zIndex: 20, elevation: 16 },
    drawerContent: { flex: 1 },
    drawerHeader: { backgroundColor: '#6366F1', padding: 24, paddingTop: 52, alignItems: 'center' },
    avatarCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    avatarText: { fontSize: 24, fontWeight: '800', color: '#fff' },
    drawerName: { fontSize: 18, fontWeight: '700', color: '#fff' },
    drawerRole: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
    menuList: { padding: 12 },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 16, borderRadius: 12 },
    menuItemText: { fontSize: 15, fontWeight: '600', color: '#475569' },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 16, marginBottom: 16 },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, marginHorizontal: 12, marginBottom: 24, backgroundColor: '#FEF2F2', borderRadius: 12 },
    logoutText: { color: '#EF4444', fontWeight: '700' }
});
