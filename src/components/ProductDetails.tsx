import React, { useState } from 'react';
import {
  ExternalLink,
  Tag,
  Heart,
  Bell,
  Check,
  Flame,
  ArrowLeft,
} from 'lucide-react';
import { Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { sanitizeUrl } from '../lib/security/sanitizer';
import { PriceHistoryChart } from './PriceHistoryChart';
import { incrementProductClick } from '../services/productAnalyticsService';

interface ProductDetailsProps {
  product: Product;
  onClose?: () => void;
  onOpenAlert?: (product: Product) => void;
}

export const ProductDetails: React.FC<ProductDetailsProps> = ({
  product,
  onClose,
  onOpenAlert,
}) => {
  const { toggleFavorite, isFavorited, hasActiveAlert } = useAuth();
  const [copiedOfferId, setCopiedOfferId] = useState<string | null>(null);
  const [revealedOfferCoupons, setRevealedOfferCoupons] = useState<Record<string, boolean>>({});

  const favorited = isFavorited(product.id);
  const hasAlert = hasActiveAlert(product.id);

  const offersSorted = [...(product.offers || [])].sort((a, b) => {
    const netA = a.price - (a.couponDiscount || 0);
    const netB = b.price - (b.couponDiscount || 0);
    return netA - netB;
  });

  const bestOffer = offersSorted[0] || {
    id: 'off-1',
    storeName: product.bestStore || 'Loja Parceira',
    storeId: product.bestStoreId || 'kabum',
    price: product.minPrice,
    originalPrice: product.maxPrice,
    discountPercent: 0,
    affiliateUrl: '#',
    installment: '10x sem juros',
    freeShipping: true,
    rating: 4.8,
    reviewsCount: 100,
    lastUpdated: 'Agora',
  };

  const handleClaimOffer = (offer: typeof bestOffer) => {
    // 1. Rastreamento e incremento atômico de clique
    incrementProductClick(product.id);

    // 2. Copia código silenciosamente se houver cupom
    if (offer.couponCode && navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(offer.couponCode).catch(() => {});
      setCopiedOfferId(offer.id);
      setRevealedOfferCoupons((prev) => ({ ...prev, [offer.id]: true }));
      setTimeout(() => setCopiedOfferId(null), 3500);
    }

    // 3. Abre o link de afiliado rastreável da Awin/loja parceira
    window.open(sanitizeUrl(offer.affiliateUrl), '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full bg-white dark:bg-dark-surface rounded-3xl p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
      {/* 1. Header com Navegação e Ações Rápidas */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-dark-border">
        {onClose && (
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-amber-500 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para a Vitrine</span>
          </button>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {onOpenAlert && (
            <button
              onClick={() => onOpenAlert(product)}
              className={`p-2 rounded-2xl border transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
                hasAlert
                  ? 'bg-amber-500 text-white border-amber-600 shadow-glow-amber'
                  : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 border-gray-200 dark:border-dark-border hover:border-amber-400'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">{hasAlert ? 'Alerta Ativo' : 'Criar Alerta de Preço'}</span>
            </button>
          )}

          <button
            onClick={() => toggleFavorite(product.id)}
            className={`p-2 rounded-2xl border transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
              favorited
                ? 'bg-rose-500 text-white border-rose-600 shadow-glow-red'
                : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 border-gray-200 dark:border-dark-border hover:border-rose-400'
            }`}
          >
            <Heart className={`w-4 h-4 ${favorited ? 'fill-current' : ''}`} />
            <span className="hidden sm:inline">{favorited ? 'Salvo' : 'Favoritar'}</span>
          </button>
        </div>
      </div>

      {/* 2. Resumo Principal do Produto */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Imagem */}
        <div className="md:col-span-5 bg-white rounded-3xl p-6 border border-gray-100 dark:border-dark-border flex items-center justify-center relative shadow-sm min-h-[260px]">
          {product.clickCount && product.clickCount > 5 ? (
            <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>🔥 EM ALTA ({product.clickCount} cliques)</span>
            </div>
          ) : null}

          <img
            src={product.imageUrl}
            alt={product.title}
            className="max-h-56 max-w-full object-contain hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Informações de Compra */}
        <div className="md:col-span-7 space-y-4">
          <div className="space-y-1">
            <span className="text-xs font-black uppercase tracking-wider text-amber-500">
              {product.categoryName} • {product.brand}
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-tight">
              {product.title}
            </h1>
            {product.ean && (
              <span className="text-[11px] font-mono text-gray-400 block">
                EAN / Código de Barras: {product.ean}
              </span>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-extrabold text-emerald-700 dark:text-emerald-300 block">
                Menor Preço Encontrado Hoje:
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  R$ {product.minPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs font-bold text-gray-500">na {product.bestStore}</span>
              </div>
            </div>

            <button
              onClick={() => handleClaimOffer(bestOffer)}
              className="py-3 px-6 rounded-xl font-black text-xs uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-glow-green transition-all active:scale-95 flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <span>Ir para a Loja</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            {product.description || 'Compare as melhores ofertas nas lojas oficiais parceiras com entrega garantida e cupom exclusivo.'}
          </p>
        </div>
      </div>

      {/* 3. Gráfico de Evolução de Preços Interativo (Recharts) */}
      <PriceHistoryChart product={product} />

      {/* 4. Comparativo de Lojas */}
      <div className="space-y-4">
        <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
          <Tag className="w-4 h-4 text-amber-500" />
          <span>Comparativo de Lojas ({offersSorted.length} Ofertas)</span>
        </h3>

        <div className="grid grid-cols-1 gap-3">
          {offersSorted.map((offer, idx) => {
            const isBest = idx === 0;
            const isCopied = copiedOfferId === offer.id;
            const isRevealed = revealedOfferCoupons[offer.id];

            return (
              <div
                key={offer.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 ${
                  isBest
                    ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                    : 'bg-gray-50/50 dark:bg-dark-card border-gray-200 dark:border-dark-border'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border flex items-center justify-center font-black text-xs text-gray-900 dark:text-white shrink-0">
                    {offer.storeName.slice(0, 3).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-gray-900 dark:text-white">
                        {offer.storeName}
                      </span>
                      {isBest && (
                        <span className="px-2 py-0.2 rounded-md bg-emerald-500 text-white font-black text-[9px] uppercase">
                          Melhor Oferta
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block">
                      {offer.installment || 'À vista'} • {offer.freeShipping ? 'Frete Grátis' : 'Consultar frete'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="text-right">
                    <span className="text-lg font-black text-gray-900 dark:text-white block">
                      R$ {offer.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    {offer.couponCode && (
                      <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
                        Cupom: {isRevealed || isCopied ? offer.couponCode : 'Clique p/ copiar'}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleClaimOffer(offer)}
                    className={`py-2.5 px-4 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all active:scale-95 shrink-0 cursor-pointer ${
                      isCopied
                        ? 'bg-emerald-600 text-white shadow-glow-green'
                        : isBest
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                        : 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Copiado!</span>
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
            );
          })}
        </div>
      </div>
    </div>
  );
};
