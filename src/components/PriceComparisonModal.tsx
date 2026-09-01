import React, { useState } from 'react';
import { X, ExternalLink, ShieldCheck, Tag, Star, Truck, CreditCard, Heart, Bell, Check, Flame, Clock, Zap } from 'lucide-react';
import { Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { sanitizeUrl } from '../lib/security/sanitizer';
import { PriceHistoryChart } from './PriceHistoryChart';
import { incrementProductClick } from '../services/productAnalyticsService';

interface PriceComparisonModalProps {
  product: Product | null;
  onClose: () => void;
  onOpenAlert: (product: Product) => void;
}

export const PriceComparisonModal: React.FC<PriceComparisonModalProps> = ({
  product,
  onClose,
  onOpenAlert,
}) => {
  const { toggleFavorite, isFavorited, hasActiveAlert } = useAuth();

  if (!product) return null;

  const offersSorted = [...product.offers].sort((a, b) => {
    const netA = a.price - (a.couponDiscount || 0);
    const netB = b.price - (b.couponDiscount || 0);
    return netA - netB;
  });

  const bestOffer = offersSorted[0];
  const favorited = isFavorited(product.id);
  const hasAlert = hasActiveAlert(product.id);

  const [copiedOfferId, setCopiedOfferId] = useState<string | null>(null);
  const [revealedOfferCoupons, setRevealedOfferCoupons] = useState<Record<string, boolean>>({});

  const handleClaimOffer = (offer: typeof bestOffer) => {
    // 1. Rastreamento e incremento atômico de clique de popularidade
    incrementProductClick(product.id);

    // 2. Copia cupom silenciosamente se houver
    if (offer.couponCode && navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(offer.couponCode).catch(() => {});
      setCopiedOfferId(offer.id);
      setRevealedOfferCoupons((prev) => ({ ...prev, [offer.id]: true }));
      setTimeout(() => setCopiedOfferId(null), 3000);
    }
    // 3. Abre link de afiliado rastreável
    window.open(sanitizeUrl(offer.affiliateUrl), '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div 
        className="relative w-full max-h-[92vh] sm:max-h-[90vh] sm:max-w-4xl bg-white dark:bg-dark-surface border-t sm:border border-gray-200 dark:border-dark-border rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl overflow-y-auto scrollbar-thin my-0 sm:my-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-5 sm:right-5 p-2 sm:p-2.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white bg-gray-100/80 dark:bg-dark-card/80 sm:bg-transparent transition-colors z-20 active:scale-90"
          aria-label="Fechar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 1. Header Product Summary */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 pb-6 border-b border-gray-100 dark:border-dark-border/60">
          {/* Image Container with Psychological Urgency Badge */}
          <div className="md:col-span-4 bg-gray-50/80 dark:bg-dark-card rounded-2xl p-4 flex items-center justify-center relative border border-gray-100 dark:border-dark-border/40 group">
            {/* Urgency Badge */}
            {bestOffer.discountPercent >= 20 ? (
              <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1 z-10 animate-pulse">
                <Flame className="w-3.5 h-3.5 fill-current" />
                <span>🔥 OFERTA QUENTE</span>
              </div>
            ) : bestOffer.discountPercent >= 10 ? (
              <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1 z-10">
                <Clock className="w-3 h-3" />
                <span>⏳ ACABA HOJE</span>
              </div>
            ) : (
              <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1 z-10">
                <Zap className="w-3 h-3 fill-current" />
                <span>⚡ MENOR PREÇO</span>
              </div>
            )}

            <div className="w-full h-full bg-white rounded-lg p-3 flex items-center justify-center shadow-sm">
              <img
                src={product.imageUrl}
                alt={product.title}
                className="max-h-40 sm:max-h-56 w-auto max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <button
              onClick={() => toggleFavorite(product.id)}
              className={`absolute top-2.5 right-2.5 p-2 rounded-full border shadow-sm transition-all active:scale-90 ${
                favorited
                  ? 'bg-rose-500 text-white border-rose-600 shadow-rose-500/30'
                  : 'bg-white/90 dark:bg-dark-surface/90 text-gray-400 hover:text-rose-500 border-gray-200 dark:border-dark-border'
              }`}
              aria-label="Favoritar"
            >
              <Heart className={`w-4 h-4 ${favorited ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Details */}
          <div className="md:col-span-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1.5 sm:mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
                  {product.categoryName}
                </span>
                <span className="text-[11px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Marca: <strong className="text-gray-800 dark:text-gray-200">{product.brand}</strong>
                </span>
                {product.isVerified && (
                  <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Preço Auditado</span>
                  </span>
                )}
              </div>

              <h2 className="text-base sm:text-xl md:text-2xl font-black text-gray-900 dark:text-white leading-snug">
                {product.title}
              </h2>

              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1.5 sm:mt-2 leading-relaxed line-clamp-2 sm:line-clamp-3">
                {product.description}
              </p>

              {/* Rating */}
              <div className="flex items-center gap-2 mt-2 sm:mt-3">
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-black text-gray-900 dark:text-white">{product.rating}</span>
                </div>
                <span className="text-[11px] sm:text-xs text-gray-400">
                  ({product.reviewsCount.toLocaleString('pt-BR')} avaliações reais)
                </span>
              </div>
            </div>

            {/* Price Callout with Strong Anchoring */}
            <div className="mt-4 pt-3.5 sm:pt-4 border-t border-gray-100 dark:border-dark-border/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                {bestOffer.originalPrice > bestOffer.price && (
                  <span className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 font-semibold line-through block">
                    De: R$ {bestOffer.originalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                )}
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">
                    Por:
                  </span>
                  <span className="text-2xl sm:text-3xl md:text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                    R$ {bestOffer.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  {bestOffer.discountPercent > 0 && (
                    <span className="px-2 py-0.5 rounded-md text-xs font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                      -{bestOffer.discountPercent}% OFF
                    </span>
                  )}
                </div>
                <span className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5">
                  em <strong className="text-gray-800 dark:text-gray-200">{bestOffer.storeName}</strong> • {bestOffer.installment}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1 sm:pt-0">
                <button
                  onClick={() => onOpenAlert(product)}
                  className={`flex-1 sm:flex-initial px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                    hasAlert
                      ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400'
                      : 'bg-gray-100 hover:bg-gray-200 dark:bg-dark-card dark:hover:bg-dark-hover border-gray-200 dark:border-dark-border text-gray-800 dark:text-gray-200'
                  }`}
                >
                  <Bell className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 ${hasAlert ? 'fill-current' : ''}`} />
                  <span className="whitespace-nowrap">{hasAlert ? 'Alerta Ativo' : 'Criar Alerta'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleClaimOffer(bestOffer)}
                  className="flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs sm:text-sm shadow-glow-amber flex items-center justify-center gap-2 transition-all active:scale-95 whitespace-nowrap cursor-pointer"
                >
                  {copiedOfferId === bestOffer.id ? (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Cupom Copiado!</span>
                    </>
                  ) : (
                    <>
                      <span>Ir para Loja</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Recharts Interactive Price History */}
        <div className="my-4 sm:my-6">
          <PriceHistoryChart product={product} />
        </div>

        {/* Store Comparison - Mobile-first stacked cards */}
        <div>
          <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-gray-900 dark:text-white mb-3">
            Comparativo de Lojas Parceiras ({offersSorted.length} Ofertas Disponíveis)
          </h3>

          <div className="space-y-3">
            {offersSorted.map((offer, index) => {
              const isBest = index === 0;
              const hasCoupon = !!offer.couponCode;
              const finalPrice = offer.price - (offer.couponDiscount || 0);

              return (
                <div
                  key={offer.id}
                  className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all gap-3 sm:gap-4 ${
                    isBest
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 shadow-sm'
                      : 'bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-dark-hover'
                  }`}
                >
                  {/* Store Info */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-dark-surface p-1 border border-gray-200 dark:border-dark-border flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-black text-gray-800 dark:text-gray-200">
                        {offer.storeName.slice(0, 3).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                          {offer.storeName}
                        </span>
                        {isBest && (
                          <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-emerald-500 text-white">
                            Menor Preço
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <Truck className="w-3 h-3" />
                          <span>{offer.freeShipping ? 'Frete Grátis' : 'Frete Calculado'}</span>
                        </span>
                        <span>• {offer.lastUpdated}</span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing and Installments */}
                  <div className="flex flex-col sm:items-end justify-center">
                    <div className="flex items-baseline gap-2">
                      {offer.originalPrice > offer.price && (
                        <span className="text-[11px] text-gray-400 line-through">
                          R$ {offer.originalPrice.toFixed(2)}
                        </span>
                      )}
                      <span className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                        R$ {finalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <CreditCard className="w-3 h-3" />
                      <span>{offer.installment}</span>
                    </span>

                    {hasCoupon && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-600 dark:text-amber-400 mt-0.5 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/60">
                        <Tag className="w-3 h-3" />
                        <span>
                          Cupom:{' '}
                          <strong className="font-mono tracking-wider">
                            {revealedOfferCoupons[offer.id] || copiedOfferId === offer.id
                              ? offer.couponCode
                              : `${offer.couponCode!.slice(0, 3)}***`}
                          </strong>{' '}
                          (-R$ {offer.couponDiscount})
                        </span>
                      </span>
                    )}
                  </div>

                  {/* CTA Button with Cookie Trap */}
                  <button
                    type="button"
                    onClick={() => handleClaimOffer(offer)}
                    className={`w-full sm:w-auto px-4 py-2.5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 shrink-0 cursor-pointer ${
                      copiedOfferId === offer.id
                        ? 'bg-emerald-600 text-white shadow-glow-green'
                        : isBest
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-glow-green'
                        : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm'
                    }`}
                  >
                    {copiedOfferId === offer.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Cupom Copiado!</span>
                      </>
                    ) : hasCoupon ? (
                      <>
                        <span>Pegar Cupom & Ir</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        <span>Ir para Loja</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
