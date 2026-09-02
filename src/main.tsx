import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthCallback } from './components/AuthCallback';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import './index.css';

// Verifica se a janela atual é o popup de autenticação
const isAuthCallback =
  typeof window !== 'undefined' &&
  (window.location.pathname.startsWith('/auth/callback') ||
    window.name === 'supabase-google-auth-popup' ||
    (Boolean(window.opener) && window.opener !== window &&
      (window.location.hash.includes('access_token') ||
        window.location.search.includes('code='))));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        {isAuthCallback ? <AuthCallback /> : <App />}
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
