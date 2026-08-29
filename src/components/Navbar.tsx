import React, { useState } from 'react';
import { Sun, Moon, Sparkles, Tag, Heart, LogIn, LogOut, Menu } from 'lucide-react';
import { KeyLogo } from './KeyLogo';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  activeTab: 'all' | 'coupons' | 'favorites';
  onTabChange: (tab: 'all' | 'coupons' | 'favorites') => void;
  onOpenMobileMenu?: () => void;
  onLogoClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  activeTab, 
  onTabChange, 
  onOpenMobileMenu,
  onLogoClick,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { user, openAuthModal, signOut, favorites } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (onLogoClick) {
      onLogoClick();
    } else {
      onTabChange('all');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border transition-colors">
      <div className="max-w-[1536px] xl:max-w-[1600px] 2xl:max-w-[1720px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex flex-wrap items-center justify-between min-h-[3.75rem] sm:min-h-[4.5rem] py-2 sm:py-3.5 gap-x-2 sm:gap-x-4 gap-y-2">
          {/* Left: Mobile Menu Trigger + Logo */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {onOpenMobileMenu && (
              <button
                type="button"
                onClick={onOpenMobileMenu}
                className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-gray-100 dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-dark-hover text-gray-700 dark:text-gray-300 lg:hidden cursor-pointer active:scale-95 transition-all"
                aria-label="Abrir menu de departamentos"
              >
                <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
              </button>
            )}

            {/* Logo Clickable Button with Smooth Scroll */}
            <button 
              type="button"
              onClick={handleLogoClick}
              className="cursor-pointer hover:opacity-90 active:scale-95 transition-all select-none p-1 sm:p-1.5 -m-1 sm:-m-1.5 rounded-2xl flex items-center text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 shrink-0"
              title="Ir para o início e rolar para o topo"
              aria-label="Ir para a página inicial e rolar para o topo"
            >
              <KeyLogo size="md" />
            </button>
          </div>

          {/* Center Navigation Tabs (Clean E-commerce) */}
          <nav className="hidden md:flex items-center gap-2 p-1.5 rounded-2xl bg-gray-100/90 dark:bg-dark-surface border border-gray-200/80 dark:border-dark-border">
            <button
              onClick={() => onTabChange('all')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-dark-card text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Comparador de Preços</span>
            </button>

            <button
              onClick={() => onTabChange('coupons')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                activeTab === 'coupons'
                  ? 'bg-white dark:bg-dark-card text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Cupons de Desconto</span>
              <span className="px-1.5 py-0.2 text-[9px] font-black rounded-md bg-emerald-500 text-white animate-pulse">
                AO VIVO
              </span>
            </button>

            <button
              onClick={() => {
                if (!user) {
                  openAuthModal('visualizar sua lista de produtos favoritos');
                } else {
                  onTabChange('favorites');
                }
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                activeTab === 'favorites'
                  ? 'bg-white dark:bg-dark-card text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              <span>Favoritos</span>
              {favorites.length > 0 && (
                <span className="px-1.5 py-0.2 text-[9px] font-black rounded-md bg-rose-500 text-white">
                  {favorites.length}
                </span>
              )}
            </button>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-gray-100 dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-dark-hover border border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300 transition-colors"
              title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
              aria-label="Alternar tema"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-amber-600" />
              )}
            </button>

            {/* Auth Button */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1 sm:p-1.5 pr-2.5 sm:pr-3 rounded-xl sm:rounded-2xl bg-gray-100 dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-dark-hover border border-gray-200 dark:border-dark-border transition-all"
                >
                  <img
                    src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`}
                    alt={user.displayName || 'Usuário'}
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl object-cover border border-amber-500"
                  />
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200 hidden sm:inline max-w-[100px] truncate">
                    {user.displayName?.split(' ')[0]}
                  </span>
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-2 shadow-2xl animate-fade-in z-50">
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-dark-border">
                      <p className="text-xs font-extrabold text-gray-900 dark:text-white truncate">
                        {user.displayName}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
                    </div>

                    <button
                      onClick={() => {
                        onTabChange('favorites');
                        setShowUserMenu(false);
                      }}
                      className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover flex items-center gap-2 mt-1"
                    >
                      <Heart className="w-3.5 h-3.5 text-rose-500" />
                      <span>Meus Favoritos ({favorites.length})</span>
                    </button>

                    <button
                      onClick={() => {
                        signOut();
                        setShowUserMenu(false);
                      }}
                      className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 mt-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Desconectar</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => openAuthModal('criar alertas de preço e favoritar ofertas')}
                className="flex items-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl sm:rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-glow-amber transition-all active:scale-95 shrink-0 whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Entrar com Google</span>
                <span className="sm:hidden">Entrar</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
