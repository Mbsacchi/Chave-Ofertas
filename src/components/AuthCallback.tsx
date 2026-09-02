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
        let session = null;

        // 1. Se houver código PKCE nos parâmetros de busca (?code=...)
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('code');

        if (code) {
          const { data: exData, error: exError } = await supabase.auth.exchangeCodeForSession(code);
          if (!exError && exData?.session) {
            session = exData.session;
          } else if (exError) {
            console.warn('exchangeCodeForSession notice:', exError.message);
          }
        }

        // 2. Fallback: obter sessão atual (caso implicit flow / tokens no hash)
        if (!session) {
          const { data: sData, error: sError } = await supabase.auth.getSession();
          if (!sError && sData?.session) {
            session = sData.session;
          }
        }

        if (isMounted) {
          setStatus('success');
        }

        // 3. Notifica a janela principal (opener) com os dados da sessão
        if (window.opener && window.opener !== window) {
          try {
            window.opener.postMessage(
              {
                type: 'SUPABASE_AUTH_SUCCESS',
                session: session,
              },
              window.location.origin
            );
          } catch (postErr) {
            console.warn('Não foi possível enviar postMessage:', postErr);
          }
        }

        // 4. Fecha a janela popup instantaneamente
        setTimeout(() => {
          window.close();
        }, 150);
      } catch (err: any) {
        console.error('Exceção no processamento do callback:', err);
        if (isMounted) {
          setErrorMessage(err.message || 'Erro ao processar autenticação');
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
              Concluindo login...
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Autenticado com sucesso. Fechando janela...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-3 py-4 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
            </div>
            <h2 className="text-base font-black text-emerald-600 dark:text-emerald-400">
              Conectado!
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Fechando janela...
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
