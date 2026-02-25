import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export type UserRole = 'Admin' | 'Employee' | 'Technician' | 'WarehouseKeeper' | 'Purchasing';

export interface User {
    id: number;
    companyId: number;
    name: string;
    email: string;
    role: UserRole;
}

interface AuthContextData {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (token: string, userData: User, rememberMe?: boolean) => Promise<void>;
    logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadStorageData();
    }, []);

    async function loadStorageData() {
        try {
            const storagedToken = await AsyncStorage.getItem('@auth_token');
            const storagedUser = await AsyncStorage.getItem('@auth_user');

            if (storagedToken && storagedUser) {
                setToken(storagedToken);
                setUser(JSON.parse(storagedUser));
            }
        } catch (error) {
            console.log('Storage loading error', error);
        } finally {
            setIsLoading(false);
        }
    }

    async function login(newToken: string, userData: User, rememberMe: boolean = true) {
        setToken(newToken);
        setUser(userData);

        if (rememberMe) {
            await AsyncStorage.setItem('@auth_token', newToken);
            await AsyncStorage.setItem('@auth_user', JSON.stringify(userData));
        }
    }

    async function logout() {
        setToken(null);
        setUser(null);
        await AsyncStorage.removeItem('@auth_token');
        await AsyncStorage.removeItem('@auth_user');
    }

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
