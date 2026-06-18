import React, { useRef, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Animated, Dimensions, TouchableWithoutFeedback, Easing
} from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';
import { PurchaseOrderListScreen } from '../screens/purchase/PurchaseOrderListScreen';

const DRAWER_WIDTH = 280;

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

export const PurchaseDrawerContext = React.createContext({
    openDrawer:   () => { },
    closeDrawer:  () => { },
    toggleDrawer: () => { },
});

const PurchaseOrderListWrapper = (props: any) => {
    const drawer = React.useContext(PurchaseDrawerContext);
    return (
        <PurchaseOrderListScreen
            {...props}
            navigation={{ ...props.navigation, openDrawer: drawer.openDrawer }}
        />
    );
};

function PurchaseTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused, color, size }) => {
                    let icon = 'cart-outline';
                    if (route.name === 'PurchaseOrders') {
                        icon = focused ? 'cart' : 'cart-outline';
                    }
                    return <Ionicons name={icon} size={size} color={color} />;
                },
                tabBarActiveTintColor:   '#6366F1',
                tabBarInactiveTintColor: '#94A3B8',
                tabBarStyle:             { height: 60, paddingBottom: 10, paddingTop: 10 },
            })}
        >
            <Tab.Screen
                name="PurchaseOrders"
                component={PurchaseOrderListWrapper}
                options={{ title: 'Siparişler' }}
            />
        </Tab.Navigator>
    );
}

export function PurchaseNavigator() {
    const [isOpen, setIsOpen]       = useState(false);
    const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
    const fadeAnim   = useRef(new Animated.Value(0)).current;

    const openDrawer = () => {
        setIsOpen(true);
        Animated.parallel([
            Animated.timing(drawerAnim, {
                toValue: 0, duration: 250,
                easing: Easing.out(Easing.ease), useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1, duration: 250, useNativeDriver: true,
            }),
        ]).start();
    };

    const closeDrawer = () => {
        Animated.parallel([
            Animated.timing(drawerAnim, {
                toValue: -DRAWER_WIDTH, duration: 250,
                easing: Easing.in(Easing.ease), useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 0, duration: 250, useNativeDriver: true,
            }),
        ]).start(() => setIsOpen(false));
    };

    return (
        <PurchaseDrawerContext.Provider
            value={{ openDrawer, closeDrawer, toggleDrawer: () => isOpen ? closeDrawer() : openDrawer() }}
        >
            <View style={{ flex: 1 }}>
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="PurchaseTabs" component={PurchaseTabNavigator} />
                </Stack.Navigator>

                {isOpen && (
                    <TouchableWithoutFeedback onPress={closeDrawer}>
                        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} />
                    </TouchableWithoutFeedback>
                )}

                <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}>
                    <PurchaseDrawerContent closeDrawer={closeDrawer} />
                </Animated.View>
            </View>
        </PurchaseDrawerContext.Provider>
    );
}

function PurchaseDrawerContent({ closeDrawer }: { closeDrawer: () => void }) {
    const { user, logout } = useAuth();
    const navigation = useNavigation<any>();

    const MENU = [
        { name: 'Siparişler', icon: 'cart-outline', screen: 'PurchaseOrders' },
    ];

    return (
        <View style={styles.drawerContent}>
            {/* Header */}
            <View style={styles.drawerHeader}>
                <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>
                        {user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'SA'}
                    </Text>
                </View>
                <Text style={styles.drawerName} numberOfLines={1}>{user?.name}</Text>
                <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>SATIN ALMA / MUHASEBE</Text>
                </View>
                <Text style={styles.drawerCompany} numberOfLines={1}>{user?.companyName}</Text>
            </View>

            {/* Menu */}
            <View style={styles.menuList}>
                {MENU.map(item => (
                    <TouchableOpacity
                        key={item.screen}
                        style={styles.menuItem}
                        onPress={() => {
                            navigation.navigate('PurchaseTabs', { screen: item.screen });
                            closeDrawer();
                        }}
                    >
                        <Ionicons name={item.icon} size={22} color="#6366F1" />
                        <Text style={styles.menuItemText}>{item.name}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={{ flex: 1 }} />

            {/* Company code */}
            {user?.companyCode && (
                <View style={styles.codeBox}>
                    <Ionicons name="key-outline" size={14} color="#6366F1" />
                    <Text style={styles.codeLabel}>Şirket Kodu: </Text>
                    <Text style={styles.codeValue}>{user.companyCode}</Text>
                </View>
            )}

            <View style={styles.divider} />

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
        top: 0, bottom: 0, left: 0,
        width: DRAWER_WIDTH,
        backgroundColor: '#fff',
        zIndex: 20, elevation: 16,
        shadowColor: '#000', shadowOffset: { width: 5, height: 0 },
        shadowOpacity: 0.2, shadowRadius: 10,
    },
    drawerContent:  { flex: 1 },
    drawerHeader: {
        backgroundColor: '#6366F1',
        padding: 24, paddingTop: 52,
        alignItems: 'center', marginBottom: 8,
    },
    avatarCircle: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 12,
        borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
    },
    avatarText:     { fontSize: 22, fontWeight: '800', color: '#fff' },
    drawerName:     { fontSize: 16, fontWeight: '700', color: '#fff', textAlign: 'center' },
    roleBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 12, paddingHorizontal: 12, paddingVertical: 3,
        marginTop: 6, marginBottom: 4,
    },
    roleBadgeText:  { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
    drawerCompany:  { fontSize: 12, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
    menuList:       { paddingHorizontal: 12, paddingTop: 12, gap: 4 },
    menuItem: {
        flexDirection: 'row', alignItems: 'center',
        padding: 14, borderRadius: 12, gap: 14,
        backgroundColor: '#EEF2FF',
    },
    menuItemText:   { fontSize: 15, fontWeight: '600', color: '#6366F1', flex: 1 },
    codeBox: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 10,
        backgroundColor: '#EEF2FF', marginHorizontal: 12,
        borderRadius: 10, marginBottom: 12, gap: 4,
    },
    codeLabel:      { fontSize: 12, color: '#64748B' },
    codeValue:      { fontSize: 14, fontWeight: '800', color: '#6366F1', letterSpacing: 1 },
    divider:        { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 16, marginVertical: 12 },
    logoutBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingHorizontal: 20, paddingVertical: 16,
        marginHorizontal: 12, marginBottom: 24,
        borderRadius: 12, backgroundColor: '#FEF2F2',
    },
    logoutText:     { color: '#EF4444', fontWeight: '700', fontSize: 15 },
});
