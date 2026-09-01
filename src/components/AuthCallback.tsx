import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { KeyLogo } from './KeyLogo';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

export const AuthCallback: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const processAuth = async () => {
      try {
        // O cliente Supabase processa automaticamente o código PKCE ou tokens presentes na URL
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Erro ao recuperar sessão no callback:', error.message);
          if (isMounted) {
            setErrorMessage(error.message);
            setStatus('error');
          }
          return;
        }

        if (isMounted) {
          setStatus('success');
        }

        // Notifica a janela principal (opener)
        if (window.opener) {
          try {
            window.opener.postMessage(
              {
                type: 'SUPABASE_AUTH_SUCCESS',
                session: data.session,
              },
              window.location.origin
            );
          } catch (postErr) {
            console.warn('Não foi possível enviar postMessage:', postErr);
          }

          // Fecha a janela popup após uma breve confirmação visual
          setTimeout(() => {
            window.close();
          }, 600);
        } else {
          // Se o usuário abriu diretamente a rota na mesma aba
          setTimeout(() => {
            window.location.href = '/';
          }, 800);
        }
      } catch (err: any) {
        console.error('Exceção no processamento do callback:', err);
        if (isMounted) {
          setErrorMessage(err.message || 'Erro inesperado');
          setStatus('error');
        }
      }
    };

    processAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100 flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="mb-6">
        <KeyLogo size="md" />
      </div>

      <div className="max-w-sm w-full bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-3xl p-6 shadow-xl space-y-4">
        {status === 'loading' && (
          <div className="space-y-3 py-4">
            <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto" />
            <h2 className="text-base font-black text-gray-900 dark:text-white">
              Conectando com o Google...
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Autenticando sua conta de forma segura no Chave Ofertas.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-3 py-4 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
            </div>
            <h2 className="text-base font-black text-emerald-600 dark:text-emerald-400">
              Login realizado com sucesso!
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Esta janela será fechada automaticamente...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-3 py-4 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7 stroke-[2.5]" />
            </div>
            <h2 className="text-base font-black text-rose-600 dark:text-rose-400">
              Falha na Autenticação
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {errorMessage || 'Não foi possível concluir o login. Tente novamente.'}
            </p>
            <button
              onClick={() => window.close()}
              className="mt-2 w-full py-2.5 px-4 rounded-xl bg-gray-200 hover:bg-gray-300 dark:bg-dark-surface dark:hover:bg-dark-hover text-xs font-bold text-gray-800 dark:text-gray-200 transition-colors"
            >
              Fechar Janela
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
