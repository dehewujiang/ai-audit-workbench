import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { User, AuthContextType } from './types';
import { supabase } from './supabase';

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // 初始化：从 Supabase 获取会话
    useEffect(() => {
        const initAuth = async () => {
            try {
                // 获取当前会话
                const { data: { session } } = await supabase.auth.getSession();
                
                if (session?.user) {
                    const supabaseUser = session.user;
                    const userData: User = {
                        id: supabaseUser.id,
                        email: supabaseUser.email || '',
                        name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || '用户',
                    };
                    setUser(userData);
                    setToken(session.access_token);
                }
            } catch (error) {
                console.error('Error getting session:', error);
            } finally {
                setIsLoading(false);
            }
        };

        initAuth();

        // 监听会话变化（登录、登出、刷新页面等）
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                const supabaseUser = session.user;
                const userData: User = {
                    id: supabaseUser.id,
                    email: supabaseUser.email || '',
                    name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || '用户',
                };
                setUser(userData);
                setToken(session.access_token);
            } else {
                setUser(null);
                setToken(null);
            }
            setIsLoading(false);
        });

        // 清理订阅
        return () => subscription.unsubscribe();
    }, []);

    const login = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        
        if (error) throw error;
        
        // 登录成功，AuthContext 会通过 onAuthStateChange 自动处理
        return data;
    };

    const logout = async () => {
        await supabase.auth.signOut();
        // 登出，AuthContext 会通过 onAuthStateChange 自动处理
    };

    const value = {
        isAuthenticated: !!token && !!user,
        user,
        token,
        login,
        logout,
        isLoading,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};