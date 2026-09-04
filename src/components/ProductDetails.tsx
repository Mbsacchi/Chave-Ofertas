import React, { useState } from 'react';
import {
  ExternalLink,
  Tag,
  Heart,
  Bell,
  Check,
  Flame,
  ArrowLeft,
  Zap,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { sanitizeUrl } from '../lib/security/sanitizer';
import { PriceHistoryChart } from './PriceHistoryChart';
import { incrementProductClick } from '../services/productAnalyticsService';
import { useProductSeo, generateProductJsonLd } from '../lib/seo/productSeo';

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
  // Geração Dinâmica de Meta Tags (SEO/GEO) e injeção no Head
  useProductSeo(product);
  const jsonLd = generateProductJsonLd(product);

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
    <article
      role="article"
      aria-label={`Comparador e Detalhes do Produto: ${product.title}`}
      itemScope
      itemType="https://schema.org/Product"
      className="w-full bg-white dark:bg-dark-surface rounded-3xl p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8"
    >
      {/* Schema Markup JSON-LD (Product + AggregateOffer) para Rich Snippets do Google e Crawlers LLM */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* 1. Header com Navegação e Ações Rápidas */}
      <header className="flex items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-dark-border">
        {onClose && (
          <button
            type="button"
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
              type="button"
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
            type="button"
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
      </header>

      {/* 2. Resumo Principal do Produto (Imagem, Título, Menor Preço) */}
      <section aria-labelledby="product-title" className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Imagem */}
        <figure className="md:col-span-5 bg-white rounded-3xl p-6 border border-gray-100 dark:border-dark-border flex items-center justify-center relative shadow-sm min-h-[260px] m-0">
          {product.clickCount && product.clickCount > 5 ? (
            <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>🔥 EM ALTA ({product.clickCount} cliques)</span>
            </div>
          ) : null}

          <img
            itemProp="image"
            src={product.imageUrl}
            alt={`${product.title} - Menor Preço e Ofertas`}
            className="max-h-56 max-w-full object-contain hover:scale-105 transition-transform duration-300"
          />
        </figure>

        {/* Informações de Compra */}
        <div className="md:col-span-7 space-y-4">
          <div className="space-y-1">
            <span className="text-xs font-black uppercase tracking-wider text-amber-500">
              {product.categoryName} • <span itemProp="brand">{product.brand}</span>
            </span>
            <h1 id="product-title" itemProp="name" className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-tight">
              {product.title}
            </h1>
            {product.ean && (
              <span className="text-[11px] font-mono text-gray-400 block">
                EAN / Código de Barras: <span itemProp="gtin13">{product.ean}</span>
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
              type="button"
              onClick={() => handleClaimOffer(bestOffer)}
              className="py-3 px-6 rounded-xl font-black text-xs uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-glow-green transition-all active:scale-95 flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <span>Ir para a Loja</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>

          <p itemProp="description" className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            {product.description || `Compare as melhores ofertas de ${product.title} nas lojas oficiais parceiras com entrega garantida e menor preço verificado.`}
          </p>
        </div>
      </section>

      {/* 3. Ficha Técnica e Especificações Estruturadas (Semântica para LLMs/SEO) */}
      <section aria-labelledby="specs-heading" className="space-y-3 pt-2">
        <h2 id="specs-heading" className="text-sm sm:text-base font-black uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-500" />
          <span>Ficha Técnica e Especificações</span>
        </h2>

        <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-card/50">
          <table className="w-full text-xs text-left border-collapse">
            <caption className="sr-only">Especificações técnicas e atributos do produto para comparação de preços</caption>
            <tbody>
              <tr className="border-b border-gray-100 dark:border-dark-border">
                <th scope="row" className="py-2.5 px-4 font-bold text-gray-500 dark:text-gray-400 w-1/3 bg-gray-100/50 dark:bg-dark-surface/50">
                  Marca / Fabricante
                </th>
                <td className="py-2.5 px-4 font-medium text-gray-900 dark:text-white">
                  {product.brand}
                </td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-dark-border">
                <th scope="row" className="py-2.5 px-4 font-bold text-gray-500 dark:text-gray-400 bg-gray-100/50 dark:bg-dark-surface/50">
                  Categoria
                </th>
                <td className="py-2.5 px-4 font-medium text-gray-900 dark:text-white">
                  {product.categoryName}
                </td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-dark-border">
                <th scope="row" className="py-2.5 px-4 font-bold text-gray-500 dark:text-gray-400 bg-gray-100/50 dark:bg-dark-surface/50">
                  Menor Preço Verificado
                </th>
                <td className="py-2.5 px-4 font-extrabold text-emerald-600 dark:text-emerald-400">
                  R$ {product.minPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (Vendido por {product.bestStore})
                </td>
              </tr>
              {product.ean && (
                <tr className="border-b border-gray-100 dark:border-dark-border">
                  <th scope="row" className="py-2.5 px-4 font-bold text-gray-500 dark:text-gray-400 bg-gray-100/50 dark:bg-dark-surface/50">
                    Código EAN / Barras
                  </th>
                  <td className="py-2.5 px-4 font-mono font-medium text-gray-900 dark:text-white">
                    {product.ean}
                  </td>
                </tr>
              )}
              <tr className="border-b border-gray-100 dark:border-dark-border">
                <th scope="row" className="py-2.5 px-4 font-bold text-gray-500 dark:text-gray-400 bg-gray-100/50 dark:bg-dark-surface/50">
                  Código de Identificação / SKU
                </th>
                <td className="py-2.5 px-4 font-mono font-medium text-gray-900 dark:text-white">
                  {product.sku}
                </td>
              </tr>
              <tr>
                <th scope="row" className="py-2.5 px-4 font-bold text-gray-500 dark:text-gray-400 bg-gray-100/50 dark:bg-dark-surface/50">
                  Garantia e Condição
                </th>
                <td className="py-2.5 px-4 font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 inline" />
                  <span>Novo, Original e com Garantia Oficial da Loja Parceira</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Gráfico de Evolução de Preços Interativo (Recharts) */}
      <section aria-labelledby="chart-heading" className="space-y-2">
        <h2 id="chart-heading" className="sr-only">Histórico de Preços</h2>
        <PriceHistoryChart product={product} />
      </section>

      {/* 5. Comparativo Multilojas: Outras opções de compra */}
      <section aria-labelledby="comparator-heading" className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-gray-100 dark:border-dark-border pb-3">
          <h2 id="comparator-heading" className="text-base sm:text-lg font-black uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-amber-500" />
            <span>Outras opções de compra</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300">
              {offersSorted.length} {offersSorted.length === 1 ? 'loja encontrada' : 'lojas comparadas'}
            </span>
          </h2>
          <span className="text-[11px] text-gray-400 font-medium">
            Ordenadas do menor para o maior preço
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {offersSorted.map((offer, idx) => {
            const isBest = idx === 0;
            const isCopied = copiedOfferId === offer.id;
            const isRevealed = revealedOfferCoupons[offer.id];
            const diffPrice = offer.price - bestOffer.price;

            return (
              <div
                key={offer.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 ${
                  isBest
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 shadow-sm'
                    : 'bg-gray-50/60 dark:bg-dark-card border-gray-200 dark:border-dark-border hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border flex items-center justify-center font-black text-xs text-gray-900 dark:text-white shrink-0 overflow-hidden p-1 shadow-sm">
                    {offer.storeLogo ? (
                      <img src={offer.storeLogo} alt={offer.storeName} className="w-full h-full object-contain" />
                    ) : (
                      offer.storeName.slice(0, 3).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm text-gray-900 dark:text-white">
                        {offer.storeName}
                      </span>
                      {isBest ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-white font-black text-[9px] uppercase tracking-wider shadow-sm flex items-center gap-1">
                          <Zap className="w-2.5 h-2.5 fill-current" />
                          <span>Menor Preço</span>
                        </span>
                      ) : diffPrice > 0 ? (
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold">
                          (+ R$ {diffPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block pt-0.5">
                      {offer.installment || 'À vista'} • {offer.freeShipping ? 'Frete Grátis' : 'Consultar frete'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="text-right">
                    <span className="text-lg sm:text-xl font-black text-gray-900 dark:text-white block">
                      R$ {offer.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    {offer.couponCode && (
                      <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
                        Cupom: {isRevealed || isCopied ? offer.couponCode : 'Clique p/ copiar'}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
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
      </section>
    </article>
  );
};

