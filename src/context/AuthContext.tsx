import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { PriceAlert } from '../types';

export interface CustomUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  isPremium?: boolean;
}

interface AuthContextType {
  user: CustomUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  sendMagicLink: (email: string) => Promise<{ success: boolean; message: string }>;
  signOut: () => Promise<void>;
  favorites: string[];
  toggleFavorite: (productId: string) => Promise<boolean>;
  isFavorited: (productId: string) => boolean;
  priceAlerts: string[];
  alertsMap: Record<string, PriceAlert>;
  hasActiveAlert: (productId: string) => boolean;
  getAlertDetails: (productId: string) => PriceAlert | undefined;
  addPriceAlert: (alert: Omit<PriceAlert, 'id' | 'userId' | 'createdAt' | 'isActive'>) => Promise<boolean>;
  removePriceAlert: (productId: string) => Promise<boolean>;
  showAuthModal: boolean;
  authModalFeature: string;
  openAuthModal: (featureName?: string) => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CustomUser | null>(() => {
    try {
      const cached = localStorage.getItem('chave_user_session');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('chave_user_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [alertsMap, setAlertsMap] = useState<Record<string, PriceAlert>>(() => {
    try {
      const saved = localStorage.getItem('chave_user_alerts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const map: Record<string, PriceAlert> = {};
          parsed.forEach((a) => {
            if (a.productId) map[a.productId] = a;
          });
          return map;
        }
      }
      return {};
    } catch {
      return {};
    }
  });

  const priceAlerts = Object.keys(alertsMap);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalFeature, setAuthModalFeature] = useState('recursos exclusivos');

  // Listener de autenticação em tempo real com o Supabase
  useEffect(() => {
    let isMounted = true;

    // 1. Restaura sessão ativa do Supabase
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!isMounted) return;
      if (!error && session?.user) {
        const u = session.user;
        const formatted: CustomUser = {
          uid: u.id,
          displayName:
            u.user_metadata?.full_name ||
            u.user_metadata?.name ||
            u.email?.split('@')[0] ||
            'Usuário',
          email: u.email || null,
          photoURL:
            u.user_metadata?.avatar_url ||
            u.user_metadata?.picture ||
            `https://api.dicebear.com/7.x/bottts/svg?seed=${u.id}`,
          isPremium: true,
        };
        setUser(formatted);
        localStorage.setItem('chave_user_session', JSON.stringify(formatted));
      } else if (!localStorage.getItem('chave_user_session')) {
        setUser(null);
      }
      setLoading(false);
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    // 2. Mudanças de estado de autenticação (Login via OAuth Google, Logout, Token Refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        const u = session.user;
        const formatted: CustomUser = {
          uid: u.id,
          displayName:
            u.user_metadata?.full_name ||
            u.user_metadata?.name ||
            u.email?.split('@')[0] ||
            'Usuário',
          email: u.email || null,
          photoURL:
            u.user_metadata?.avatar_url ||
            u.user_metadata?.picture ||
            `https://api.dicebear.com/7.x/bottts/svg?seed=${u.id}`,
          isPremium: true,
        };
        setUser(formatted);
        localStorage.setItem('chave_user_session', JSON.stringify(formatted));
      } else {
        setUser(null);
        localStorage.removeItem('chave_user_session');
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Login com Google oficial via Supabase OAuth
  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) {
      console.error('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
      throw new Error('Supabase não configurado no ambiente.');
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      console.error('Erro ao autenticar com Google no Supabase:', error.message);
      throw error;
    }
  };

  // Magic Link com Supabase OTP
  const sendMagicLink = async (email: string): Promise<{ success: boolean; message: string }> => {
    if (!email || !email.includes('@')) {
      return { success: false, message: 'Por favor, insira um e-mail válido.' };
    }

    if (!isSupabaseConfigured) {
      return { success: false, message: 'Supabase não configurado no ambiente.' };
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        return { success: false, message: error.message };
      }

      return {
        success: true,
        message: `Link de acesso enviado para ${email}! Verifique sua caixa de entrada para entrar instantaneamente.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Erro ao enviar link de acesso. Tente novamente.',
      };
    }
  };

  // Logout oficial via Supabase
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Erro ao desconectar:', err);
    } finally {
      setUser(null);
      setFavorites([]);
      setAlertsMap({});
      localStorage.removeItem('chave_user_session');
      localStorage.removeItem('chave_user_favorites');
      localStorage.removeItem('chave_user_alerts');
      localStorage.removeItem('emailForSignIn');
    }
  };

  // Favoritar produtos
  const toggleFavorite = async (productId: string): Promise<boolean> => {
    if (!user) {
      openAuthModal('favoritar produtos e salvar sua lista de desejos');
      return false;
    }

    const isAlreadyFavorited = favorites.includes(productId);
    const updated = isAlreadyFavorited
      ? favorites.filter((id) => id !== productId)
      : [...favorites, productId];

    setFavorites(updated);
    localStorage.setItem('chave_user_favorites', JSON.stringify(updated));

    return !isAlreadyFavorited;
  };

  const isFavorited = (productId: string): boolean => {
    return favorites.includes(productId);
  };

  // Alertas de preço
  const hasActiveAlert = (productId: string): boolean => {
    return !!alertsMap[productId];
  };

  const getAlertDetails = (productId: string): PriceAlert | undefined => {
    return alertsMap[productId];
  };

  const addPriceAlert = async (
    alertData: Omit<PriceAlert, 'id' | 'userId' | 'createdAt' | 'isActive'>
  ): Promise<boolean> => {
    if (!user) {
      openAuthModal('criar e gerenciar alertas de preço inteligentes');
      return false;
    }

    const fullAlert: PriceAlert = {
      ...alertData,
      id: alertData.productId,
      userId: user.uid,
      targetPrice: alertData.notifyOnAnyDrop ? null : (alertData.targetPrice ?? null),
      notifyOnAnyDrop: !!alertData.notifyOnAnyDrop,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    const updatedMap = { ...alertsMap, [alertData.productId]: fullAlert };
    setAlertsMap(updatedMap);
    localStorage.setItem('chave_user_alerts', JSON.stringify(Object.values(updatedMap)));

    return true;
  };

  const removePriceAlert = async (productId: string): Promise<boolean> => {
    if (!user) return false;

    const updatedMap = { ...alertsMap };
    delete updatedMap[productId];
    setAlertsMap(updatedMap);
    localStorage.setItem('chave_user_alerts', JSON.stringify(Object.values(updatedMap)));

    return true;
  };

  const openAuthModal = (featureName = 'acessar recursos exclusivos') => {
    setAuthModalFeature(featureName);
    setShowAuthModal(true);
  };

  const closeAuthModal = () => {
    setShowAuthModal(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        sendMagicLink,
        signOut,
        favorites,
        toggleFavorite,
        isFavorited,
        priceAlerts,
        alertsMap,
        hasActiveAlert,
        getAlertDetails,
        addPriceAlert,
        removePriceAlert,
        showAuthModal,
        authModalFeature,
        openAuthModal,
        closeAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
