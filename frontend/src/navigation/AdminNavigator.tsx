import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, TouchableWithoutFeedback, Easing } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AdminFaultTrackingScreen } from '../screens/admin/AdminFaultTrackingScreen';
import { AdminAssetsScreen } from '../screens/admin/AdminAssetsScreen';
import { AdminStockScreen } from '../screens/admin/AdminStockScreen';
import { AdminAnalyticsScreen } from '../screens/admin/AdminAnalyticsScreen';
import { MyPurchaseRequestsScreen } from '../screens/purchase/MyPurchaseRequestsScreen';

const Stack = createNativeStackNavigator();
const { width } = Dimensions.get('window');
const DRAWER_WIDTH = 280;

const MENU_ITEMS = [
    { name: 'Ana Sayfa', icon: 'home-outline', activeIcon: 'home', screen: 'Ana Sayfa' },
    { name: 'Arıza Takip', icon: 'alert-circle-outline', activeIcon: 'alert-circle', screen: 'Arıza Takip' },
    { name: 'Cihazlar', icon: 'cube-outline', activeIcon: 'cube', screen: 'Cihazlar' },
    { name: 'Stok & Satın Alma', icon: 'layers-outline', activeIcon: 'layers', screen: 'Stok & Satın Alma' },
    { name: 'Parça Taleplerim', icon: 'cart-outline', activeIcon: 'cart', screen: 'MyPurchaseRequests' },
    { name: 'Analitik', icon: 'analytics-outline', activeIcon: 'analytics', screen: 'Analitik' },
];

export const DrawerContext = React.createContext({
    openDrawer: () => { },
    closeDrawer: () => { },
    toggleDrawer: () => { },
});

// Wrappers to inject openDrawer into navigation props
const AdminDashboardWrapper = (props: any) => {
    const drawer = React.useContext(DrawerContext);
    return <AdminDashboardScreen {...props} navigation={{ ...props.navigation, openDrawer: drawer.openDrawer }} />;
};
const AdminFaultTrackingWrapper = (props: any) => {
    const drawer = React.useContext(DrawerContext);
    return <AdminFaultTrackingScreen {...props} navigation={{ ...props.navigation, openDrawer: drawer.openDrawer }} />;
};
const AdminAssetsWrapper = (props: any) => {
    const drawer = React.useContext(DrawerContext);
    return <AdminAssetsScreen {...props} navigation={{ ...props.navigation, openDrawer: drawer.openDrawer }} />;
};
const AdminStockWrapper = (props: any) => {
    const drawer = React.useContext(DrawerContext);
    return <AdminStockScreen {...props} navigation={{ ...props.navigation, openDrawer: drawer.openDrawer }} />;
};
const AdminAnalyticsWrapper = (props: any) => {
    const drawer = React.useContext(DrawerContext);
    return <AdminAnalyticsScreen {...props} navigation={{ ...props.navigation, openDrawer: drawer.openDrawer }} />;
};
const MyPurchaseRequestsWrapper = (props: any) => {
    const drawer = React.useContext(DrawerContext);
    return <MyPurchaseRequestsScreen {...props} navigation={{ ...props.navigation, openDrawer: drawer.openDrawer }} />;
};

export function AdminNavigator() {
    const [isOpen, setIsOpen] = useState(false);
    const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Track active route
    const [activeRoute, setActiveRoute] = useState('Ana Sayfa');

    const openDrawer = () => {
        setIsOpen(true);
        Animated.parallel([
            Animated.timing(drawerAnim, {
                toValue: 0,
                duration: 250,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            })
        ]).start();
    };

    const closeDrawer = () => {
        Animated.parallel([
            Animated.timing(drawerAnim, {
                toValue: -DRAWER_WIDTH,
                duration: 250,
                easing: Easing.in(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            })
        ]).start(() => setIsOpen(false));
    };

    const toggleDrawer = () => {
        if (isOpen) {
            closeDrawer();
        } else {
            openDrawer();
        }
    };

    return (
        <DrawerContext.Provider value={{ openDrawer, closeDrawer, toggleDrawer }}>
            <View style={{ flex: 1 }}>
                <Stack.Navigator
                    screenOptions={{ headerShown: false }}
                    screenListeners={{
                        state: (e: any) => {
                            const routes = e.data.state.routes;
                            if (routes && routes.length > 0) {
                                setActiveRoute(routes[routes.length - 1].name);
                            }
                        }
                    }}
                >
                    <Stack.Screen name="Ana Sayfa" component={AdminDashboardWrapper} />
                    <Stack.Screen name="Arıza Takip" component={AdminFaultTrackingWrapper} />
                    <Stack.Screen name="Cihazlar" component={AdminAssetsWrapper} />
                    <Stack.Screen name="Stok & Satın Alma" component={AdminStockWrapper} />
                    <Stack.Screen name="Analitik" component={AdminAnalyticsWrapper} />
                    <Stack.Screen name="MyPurchaseRequests" component={MyPurchaseRequestsWrapper} />
                </Stack.Navigator>

                {/* Custom Drawer Overlay */}
                {isOpen && (
                    <TouchableWithoutFeedback onPress={closeDrawer}>
                        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} />
                    </TouchableWithoutFeedback>
                )}

                {/* Custom Drawer Content */}
                <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}>
                    <CustomDrawerContent
                        closeDrawer={closeDrawer}
                        activeRoute={activeRoute}
                    />
                </Animated.View>
            </View>
        </DrawerContext.Provider>
    );
}



function CustomDrawerContent({ closeDrawer, activeRoute }: { closeDrawer: () => void, activeRoute: string }) {
    const { user, logout } = useAuth();
    const navigation = useNavigation<any>();

    return (
        <View style={styles.drawerContent}>
            {/* Header Profile */}
            <View style={styles.drawerHeader}>
                <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>
                        {user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'AD'}
                    </Text>
                </View>
                <Text style={styles.drawerName} numberOfLines={1}>{user?.name}</Text>
                <View style={styles.adminBadge}>
                    <Text style={styles.adminBadgeText}>YÖNETİCİ</Text>
                </View>
                <Text style={styles.drawerCompany} numberOfLines={1}>{user?.companyName}</Text>
            </View>

            {/* Menu Items */}
            <View style={styles.menuList}>
                {MENU_ITEMS.map(item => {
                    const isActive = activeRoute === item.screen;
                    return (
                        <TouchableOpacity
                            key={item.screen}
                            style={[styles.menuItem, isActive && styles.menuItemActive]}
                            onPress={() => {
                                navigation.navigate(item.screen);
                                closeDrawer();
                            }}
                        >
                            <Ionicons
                                name={isActive ? item.activeIcon : item.icon}
                                size={22}
                                color={isActive ? '#6366F1' : '#64748B'}
                            />
                            <Text style={[styles.menuItemText, isActive && styles.menuItemTextActive]}>
                                {item.name}
                            </Text>
                            {isActive && <View style={styles.activeIndicator} />}
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={{ flex: 1 }} />

            {/* Divider */}
            <View style={styles.divider} />

            {/* Company Code */}
            {user?.companyCode && (
                <View style={styles.codeBox}>
                    <Ionicons name="key-outline" size={14} color="#6366F1" />
                    <Text style={styles.codeLabel}>Şirket Kodu: </Text>
                    <Text style={styles.codeValue}>{user.companyCode}</Text>
                </View>
            )}

            {/* Logout */}
            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                <Text style={styles.logoutText}>Güvenli Çıkış</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 10,
    },
    drawer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        width: DRAWER_WIDTH,
        backgroundColor: '#fff',
        zIndex: 20,
        elevation: 16,
        shadowColor: '#000',
        shadowOffset: { width: 5, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
    },
    drawerContent: { flex: 1 },
    drawerHeader: {
        backgroundColor: '#6366F1',
        padding: 24,
        paddingTop: 52,
        alignItems: 'center',
        marginBottom: 8,
    },
    avatarCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    avatarText: { fontSize: 22, fontWeight: '800', color: '#fff' },
    drawerName: { fontSize: 16, fontWeight: '700', color: '#fff', textAlign: 'center' },
    adminBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 3,
        marginTop: 6,
        marginBottom: 4,
    },
    adminBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    drawerCompany: { fontSize: 12, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
    menuList: { paddingHorizontal: 12, paddingTop: 12, gap: 4 },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        gap: 14,
    },
    menuItemActive: { backgroundColor: '#EEF2FF' },
    menuItemText: { fontSize: 15, fontWeight: '600', color: '#64748B', flex: 1 },
    menuItemTextActive: { color: '#6366F1' },
    activeIndicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#6366F1' },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 16, marginVertical: 12 },
    codeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: '#EEF2FF',
        marginHorizontal: 12,
        borderRadius: 10,
        marginBottom: 12,
        gap: 4,
    },
    codeLabel: { fontSize: 12, color: '#64748B' },
    codeValue: { fontSize: 14, fontWeight: '800', color: '#6366F1', letterSpacing: 1 },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 20,
        paddingVertical: 16,
        marginHorizontal: 12,
        marginBottom: 24,
        borderRadius: 12,
        backgroundColor: '#FEF2F2',
    },
    logoutText: { color: '#EF4444', fontWeight: '700', fontSize: 15 },
});
