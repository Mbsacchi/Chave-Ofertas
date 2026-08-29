import React, { useState } from 'react';
import { X, Bell, Heart, ShieldCheck, Mail, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { KeyLogo } from './KeyLogo';

export const AuthModal: React.FC = () => {
  const { showAuthModal, closeAuthModal, authModalFeature, signInWithGoogle, sendMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [emailSentMessage, setEmailSentMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);

  if (!showAuthModal) return null;

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);
    try {
      await signInWithGoogle();
    } catch {
      setErrorMessage('Não foi possível autenticar com o Google no momento.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsEmailLoading(true);
    setErrorMessage(null);

    try {
      const res = await sendMagicLink(email);
      if (res.success) {
        setEmailSentMessage(res.message);
        setTimeout(() => {
          closeAuthModal();
          setEmailSentMessage(null);
        }, 3000);
      } else {
        setErrorMessage(res.message);
      }
    } catch {
      setErrorMessage('Erro ao gerar link de acesso. Tente novamente.');
    } finally {
      setIsEmailLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div 
        className="relative w-full max-w-md max-h-[92vh] bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-3xl p-5 sm:p-6 md:p-8 shadow-2xl overflow-y-auto scrollbar-thin my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-3 right-3 sm:top-5 sm:right-5 p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white bg-gray-100/80 dark:bg-dark-card/80 sm:bg-transparent transition-colors active:scale-90"
          aria-label="Fechar autenticação"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <KeyLogo size="md" />
          </div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white">
            Acesso a Recursos Especiais
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Faça login para <strong className="text-amber-600 dark:text-amber-400">{authModalFeature}</strong>.
          </p>
        </div>

        {/* Benefits list */}
        <div className="bg-amber-50/50 dark:bg-dark-card border border-amber-100 dark:border-dark-border rounded-2xl p-4 mb-6 space-y-2.5">
          <div className="flex items-center gap-2.5 text-xs text-gray-700 dark:text-gray-300">
            <Bell className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Alertas automáticos de menor preço por e-mail</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-gray-700 dark:text-gray-300">
            <Heart className="w-4 h-4 text-rose-500 shrink-0" />
            <span>Lista de desejos sincronizada em todos os dispositivos</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-gray-700 dark:text-gray-300">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>100% gratuito, seguro e sem anúncios invasivos</span>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold">
            {errorMessage}
          </div>
        )}

        {emailSentMessage ? (
          <div className="p-5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex flex-col items-center text-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-semibold animate-fade-in">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            <span className="font-bold text-sm">Link de Acesso Enviado!</span>
            <span className="text-gray-600 dark:text-gray-400 text-[11px] leading-relaxed">{emailSentMessage}</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Primary Google Login Button */}
            <button
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading || isEmailLoading}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-white dark:bg-dark-card hover:bg-gray-50 dark:hover:bg-dark-hover border-2 border-gray-200 dark:border-dark-border text-gray-800 dark:text-white font-extrabold text-sm shadow-sm transition-all hover:shadow hover:border-amber-500 dark:hover:border-amber-500 group disabled:opacity-50"
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                  <span>Conectando com o Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Continuar com o Google</span>
                </>
              )}
            </button>

            <div className="flex items-center my-3">
              <div className="flex-grow border-t border-gray-200 dark:border-dark-border"></div>
              <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">ou via Magic Link</span>
              <div className="flex-grow border-t border-gray-200 dark:border-dark-border"></div>
            </div>

            {/* Secondary Email Login (Magic Link) */}
            <form onSubmit={handleEmailSubmit} className="space-y-2.5">
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Seu melhor e-mail"
                  required
                  disabled={isEmailLoading || isGoogleLoading}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all disabled:opacity-80"
                />
              </div>
              <button
                type="submit"
                disabled={isEmailLoading || isGoogleLoading}
                className="w-full flex items-center justify-center gap-1.5 py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-glow-amber transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEmailLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando link de acesso...</span>
                  </>
                ) : (
                  <>
                    <span>Receber link de acesso</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        <p className="text-[10px] text-center text-gray-400 dark:text-gray-500 mt-5 leading-relaxed">
          Navegação e comparação de preços continuam 100% livres e sem cadastro. Ao entrar, você concorda com os Termos de Uso.
        </p>
      </div>
    </div>
  );
};
