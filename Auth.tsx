import React from 'react';
import { App } from './App';
import { AuthProvider, useAuth } from './AuthContext';
import { LoginPage } from './components/LoginPage';
import { Spinner } from './components/icons';
import ErrorBoundary from './components/ErrorBoundary';
import { GlobalProvider } from './contexts/GlobalContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { UIProvider } from './contexts/UIContext';

const AppGate: React.FC = () => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <div className="text-center">
                    <Spinner className="h-12 w-12 text-blue-600 mx-auto" />
                    <p className="mt-4 text-gray-600">正在验证您的身份...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <LoginPage />;
    }

    return (
        <GlobalProvider>
            <UIProvider>
                <ProjectProvider>
                    <App />
                </ProjectProvider>
            </UIProvider>
        </GlobalProvider>
    );
};

export const Auth: React.FC = () => {
    return (
        <AuthProvider>
            <ErrorBoundary>
                <AppGate />
            </ErrorBoundary>
        </AuthProvider>
    );
};