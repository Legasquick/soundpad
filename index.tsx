import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-white">
          <div className="bg-slate-900 border border-red-900 p-6 rounded-lg max-w-lg w-full">
            <h1 className="text-xl font-bold text-red-500 mb-2">Ошибка приложения</h1>
            <p className="text-slate-400 mb-4 text-sm">Приложение аварийно завершило работу.</p>
            <pre className="bg-black/50 p-3 rounded text-xs text-red-300 overflow-auto mb-4">
              {this.state.error?.message || "Unknown Error"}
            </pre>
            <button 
              onClick={() => {
                  indexedDB.deleteDatabase('SonicGridDB');
                  window.location.reload();
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm w-full"
            >
              Сбросить данные и перезагрузить
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);

// StrictMode is good for React 19 to catch concurrent issues
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);