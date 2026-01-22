import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import * as api from '../services/api';
import { Spinner } from './icons';
import { User } from '../types';

export const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        try {
            const { token, user } = await api.login(email, password);
            login(token, user);
        } catch (err) {
            setError(err instanceof Error ? err.message : '登录失败，请重试。');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGuestLogin = () => {
        const guestUser: User = {
            id: 'guest-user-001',
            email: 'guest@example.com',
            name: '访客用户',
        };
        const guestToken = 'guest-session-token-for-testing';
        login(guestToken, guestUser);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-lg border p-8">
                <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">审计助手</h1>
                <p className="text-center text-gray-500 mb-8">欢迎回来，请登录您的账户</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            邮箱地址
                        </label>
                        <div className="mt-1">
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="auditor@example.com"
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                            密码
                        </label>
                        <div className="mt-1">
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="••••••••"
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                    
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-400 p-3">
                           <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}


                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
                        >
                            {isLoading ? <Spinner className="h-5 w-5" /> : '登 录'}
                        </button>
                    </div>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">或</span>
                    </div>
                </div>

                <div>
                    <button
                        type="button"
                        onClick={handleGuestLogin}
                        disabled={isLoading}
                        className="w-full flex justify-center py-2.5 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        访客登录 (测试用)
                    </button>
                </div>
                
                 <p className="mt-6 text-center text-xs text-gray-500">
                    没有账户？ <a href="#" className="font-medium text-blue-600 hover:text-blue-500">联系管理员注册</a>
                </p>
            </div>
        </div>
    );
};