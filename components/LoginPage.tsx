import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabase';
import { Spinner } from './icons';

export const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        
        try {
            if (isRegistering) {
                // 注册新用户
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                });
                
                if (signUpError) throw signUpError;
                
                // 注册成功，提示用户
                setError(null);
                alert('注册成功！请使用注册的邮箱和密码登录。');
                setIsRegistering(false);
                setPassword(''); // 清空密码，方便登录
            } else {
                // 登录
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                
                if (signInError) throw signInError;
                
                // 登录成功，AuthContext 会自动处理
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '操作失败，请重试。');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-lg border p-8">
                <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">审计助手</h1>
                <p className="text-center text-gray-500 mb-8">
                    {isRegistering ? '创建您的账户' : '欢迎回来，请登录您的账户'}
                </p>

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
                                autoComplete={isRegistering ? "new-password" : "current-password"}
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
                            {isLoading ? <Spinner className="h-5 w-5" /> : (isRegistering ? '注 册' : '登 录')}
                        </button>
                    </div>
                </form>

                {!isRegistering ? (
                    <p className="mt-6 text-center text-xs text-gray-500">
                        没有账户？{' '}
                        <button 
                            onClick={() => {
                                setIsRegistering(true);
                                setError(null);
                            }}
                            className="font-medium text-blue-600 hover:text-blue-500"
                        >
                            点击注册
                        </button>
                    </p>
                ) : (
                    <p className="mt-6 text-center text-xs text-gray-500">
                        已有账户？{' '}
                        <button 
                            onClick={() => {
                                setIsRegistering(false);
                                setError(null);
                            }}
                            className="font-medium text-blue-600 hover:text-blue-500"
                        >
                            点击登录
                        </button>
                    </p>
                )}
            </div>
        </div>
    );
};
