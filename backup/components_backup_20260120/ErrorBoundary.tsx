import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: undefined,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  handleReset = () => {
    // Clear potential corrupted state for guest mode
    localStorage.removeItem('guest-projects');
    localStorage.removeItem('guest-globalState');
    localStorage.removeItem('guest-activeProjectId');
    // Reload the application
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-slate-50">
            <div className="w-full max-w-lg text-center bg-white p-8 rounded-lg shadow-lg border">
                <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h1 className="mt-4 text-2xl font-bold text-gray-800">应用程序遇到错误</h1>
                <p className="mt-2 text-gray-600">
                    抱歉，工作台无法正常加载。这可能是由于本地缓存的数据损坏或程序内部错误导致的。
                </p>
                <div className="mt-6">
                    <button
                        onClick={this.handleReset}
                        className="px-6 py-2.5 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition-colors"
                    >
                        重置并刷新
                    </button>
                </div>
                 <p className="mt-3 text-xs text-red-700 font-bold">
                    警告：此操作将彻底清除所有本地访客数据，且无法恢复。
                 </p>
                 <details className="mt-4 text-sm text-left">
                    <summary className="cursor-pointer text-gray-500 hover:text-gray-700">显示技术详情</summary>
                    <pre className="mt-2 p-2 bg-gray-100 text-gray-700 rounded-md text-xs overflow-auto max-h-40">
                        {this.state.error?.toString()}
                        {this.state.error?.stack}
                    </pre>
                </details>
            </div>
        </div>
      );
    }

    // Explicitly cast this to any to avoid "Property 'props' does not exist on type 'ErrorBoundary'" error
    // which can occur in some TypeScript configurations or version mismatches.
    return (this as any).props.children;
  }
}

export default ErrorBoundary;