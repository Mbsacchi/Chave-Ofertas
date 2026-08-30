import React, { useState } from 'react';
import { Star, Heart, Bell, ExternalLink, ArrowRight, Flame, Clock, Zap, Check } from 'lucide-react';
import { Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { sanitizeUrl } from '../lib/security/sanitizer';

interface ProductCardProps {
  product: Product;
  isFeatured?: boolean;
  onOpenCompare: (product: Product) => void;
  onOpenAlert: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isFeatured = false,
  onOpenCompare,
  onOpenAlert,
}) => {
  const { toggleFavorite, isFavorited, hasActiveAlert } = useAuth();
  const favorited = isFavorited(product.id);
  const hasAlert = hasActiveAlert(product.id);
  const [copiedCoupon, setCopiedCoupon] = useState(false);

  const bestOffer = product.offers[0] || {
    price: product.minPrice,
    originalPrice: product.maxPrice,
    storeName: product.bestStore,
    discountPercent: 0,
    affiliateUrl: '#',
    installment: '',
    freeShipping: true,
  };

  // Cookie Trap & Link Out
  const handleGoToOffer = (e: React.MouseEvent) => {
    e.preventDefault();
    if (bestOffer.couponCode && navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(bestOffer.couponCode).catch(() => {});
      setCopiedCoupon(true);
      setTimeout(() => setCopiedCoupon(false), 3000);
    }
    window.open(sanitizeUrl(bestOffer.affiliateUrl), '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`group bg-white dark:bg-dark-card border ${
      isFeatured 
        ? 'border-amber-400/80 dark:border-amber-500/70 shadow-glow-amber' 
        : 'border-gray-200 dark:border-dark-border hover:border-amber-400/80 dark:hover:border-amber-400/80 shadow-sm'
    } rounded-3xl flex flex-col h-full hover:shadow-xl transition-all duration-300 relative overflow-hidden`}>
      
      {/* Featured Badge when applicable */}
      {isFeatured && (
        <div className="absolute top-3 left-3 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-[10px] uppercase tracking-wider shadow-md flex items-center gap-1 z-20">
          <Flame className="w-3 h-3 fill-current" />
          <span>Oferta Destaque</span>
        </div>
      )}

      {/* 1. Edge-to-Edge Image Header (White background touching top, left, right edges) */}
      <div 
        onClick={() => onOpenCompare(product)}
        className="w-full h-48 sm:h-52 bg-white rounded-t-3xl p-4 flex items-center justify-center cursor-pointer relative overflow-hidden border-b border-gray-100 dark:border-dark-border/40"
      >
        {/* Floating Category Badge */}
        {!isFeatured && (
          <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-900/80 text-white backdrop-blur-sm z-10 truncate max-w-[130px] shadow-sm">
            {product.categoryName}
          </span>
        )}

        {/* Floating Action Buttons */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenAlert(product);
            }}
            className={`p-1.5 rounded-full border shadow-sm transition-all active:scale-90 ${
              hasAlert
                ? 'bg-amber-500 text-white border-amber-600'
                : 'bg-white/90 text-gray-600 hover:text-amber-500 hover:bg-amber-50 border-gray-200'
            }`}
            title={hasAlert ? 'Alerta de preço ativo' : 'Criar Alerta de Preço'}
            aria-label="Alerta de Preço"
          >
            <Bell className={`w-3.5 h-3.5 ${hasAlert ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(product.id);
            }}
            className={`p-1.5 rounded-full border shadow-sm transition-all active:scale-90 ${
              favorited
                ? 'bg-rose-500 text-white border-rose-600'
                : 'bg-white/90 text-gray-600 hover:text-rose-500 border-gray-200'
            }`}
            title={favorited ? 'Remover dos favoritos' : 'Favoritar produto'}
          >
            <Heart className={`w-3.5 h-3.5 ${favorited ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* High-Contrast Psychological Urgency Badges */}
        {bestOffer.discountPercent >= 20 || isFeatured ? (
          <div className="absolute bottom-2.5 left-3 px-2 py-0.5 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1 z-10">
            <Flame className="w-3 h-3 fill-current" />
            <span>🔥 OFERTA QUENTE</span>
          </div>
        ) : bestOffer.discountPercent >= 10 ? (
          <div className="absolute bottom-2.5 left-3 px-2 py-0.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1 z-10">
            <Clock className="w-3 h-3" />
            <span>⏳ ACABA HOJE</span>
          </div>
        ) : (
          <div className="absolute bottom-2.5 left-3 px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1 z-10">
            <Zap className="w-3 h-3 fill-current" />
            <span>⚡ MENOR PREÇO</span>
          </div>
        )}

        {/* Top-Right/Bottom-Right Discount Percentage Chip */}
        {bestOffer.discountPercent > 0 && (
          <div className="absolute bottom-2.5 right-3 px-2 py-0.5 rounded-lg bg-emerald-500 text-white text-[10px] font-black shadow-md z-10">
            -{bestOffer.discountPercent}% OFF
          </div>
        )}

        {/* Product Image with object-contain */}
        <img
          src={product.imageUrl}
          alt={product.title}
          className="max-h-36 sm:max-h-40 w-auto max-w-full object-contain transition-transform duration-300 group-hover:scale-108"
          loading="lazy"
        />
      </div>

      {/* 2. Bottom Content Section (padded, dark theme background) */}
      <div className="p-5 sm:p-6 flex flex-col flex-1">
        {/* Brand, Rating & Title */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-400 font-bold">
            <span className="truncate">{product.brand}</span>
            <div className="flex items-center gap-1 text-amber-500 shrink-0">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="text-gray-900 dark:text-white font-extrabold text-[11px]">{product.rating}</span>
              <span className="text-gray-400 font-normal text-[10px]">({product.reviewsCount})</span>
            </div>
          </div>

          <h3
            onClick={() => onOpenCompare(product)}
            className="text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-snug line-clamp-2 min-h-[2.5rem] cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 transition-colors pt-0.5"
            title={product.title}
          >
            {product.title}
          </h3>
        </div>

        {/* Bottom Section: Pricing & CTA Buttons (Pinned to bottom with mt-auto) */}
        <div className="mt-auto pt-3.5 border-t border-gray-100 dark:border-dark-border/80 space-y-2.5">
          {/* Price display with Top Row (Old Price + Store) & Bottom Row (New Price) */}
          <div className="flex flex-col w-full">
            {/* Top Row: Old Price (De: R$ ...) on Left + Store Badge on Right */}
            <div className="flex flex-row justify-between items-center w-full mb-1 gap-2">
              <div className="min-w-0">
                {bestOffer.originalPrice > bestOffer.price ? (
                  <span className="text-xs sm:text-sm font-semibold text-gray-400 dark:text-gray-500 line-through whitespace-nowrap">
                    De: R$ {bestOffer.originalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">
                    Menor Preço:
                  </span>
                )}
              </div>

              <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40 shrink-0 truncate max-w-[100px] sm:max-w-[120px] shadow-sm">
                {product.bestStore}
              </span>
            </div>

            {/* Bottom Row: Current Best Price (Por: R$ ...) with maximum visual hierarchy */}
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">
                Por:
              </span>
              <span className="text-xl sm:text-2xl lg:text-[26px] font-black text-emerald-600 dark:text-emerald-400 tracking-tight whitespace-nowrap leading-none">
                R$ {product.minPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              {bestOffer.discountPercent > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-black tracking-tight shrink-0">
                  -{bestOffer.discountPercent}% OFF
                </span>
              )}
            </div>
          </div>

          {/* Other stores snippet */}
          <div className="flex items-center gap-1 text-[10px] text-gray-400 overflow-hidden whitespace-nowrap">
            <span className="font-medium shrink-0">Também em:</span>
            {product.offers.slice(1, 3).map((off) => (
              <span
                key={off.id}
                className="px-1.5 py-0.2 rounded bg-gray-100 dark:bg-dark-surface text-gray-600 dark:text-gray-300 font-semibold truncate"
              >
                {off.storeName.split(' ')[0]}: R$ {off.price.toFixed(0)}
              </span>
            ))}
            {product.offers.length > 3 && (
              <span className="text-amber-500 font-bold shrink-0">
                +{product.offers.length - 3}
              </span>
            )}
          </div>

          {/* CTA Buttons Grid */}
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <button
              onClick={() => onOpenCompare(product)}
              className="py-2.5 px-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-dark-surface dark:hover:bg-dark-hover border border-gray-200 dark:border-dark-border text-gray-900 dark:text-white font-bold text-xs flex items-center justify-center gap-1 transition-all text-center active:scale-95 cursor-pointer"
            >
              <span>Comparar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleGoToOffer}
              className={`py-2.5 px-2 rounded-xl font-black text-xs shadow-glow-amber flex items-center justify-center gap-1 transition-all active:scale-95 text-center truncate cursor-pointer ${
                copiedCoupon
                  ? 'bg-emerald-600 text-white shadow-glow-green'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
              }`}
            >
              {copiedCoupon ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Cupom Copiado!</span>
                </>
              ) : (
                <>
                  <span>Pegar Oferta</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
