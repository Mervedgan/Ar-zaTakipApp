import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login as apiLogin, register as apiRegister } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    // Restore session on app start
    useEffect(() => {
        const restore = async () => {
            try {
                const storedToken = await AsyncStorage.getItem('token');
                const storedUser = await AsyncStorage.getItem('user');
                if (storedToken && storedUser) {
                    setToken(storedToken);
                    setUser(JSON.parse(storedUser));
                }
            } finally {
                setLoading(false);
            }
        };
        restore();
    }, []);

    const login = async (email, password) => {
        const { data } = await apiLogin(email, password);
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('user', JSON.stringify(data));
        setToken(data.token);
        setUser(data);
    };

    const register = async (name, email, password) => {
        await apiRegister(name, email, password);
    };

    const logout = async () => {
        await AsyncStorage.multiRemove(['token', 'user']);
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
    return ctx;
};
