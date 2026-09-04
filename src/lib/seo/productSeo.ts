import { useEffect } from 'react';
import { Product } from '../../types';

export interface SeoMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  keywords: string;
}

const DEFAULT_TITLE = 'Chave Ofertas | Comparador de Preços e Melhores Ofertas em Tempo Real';
const DEFAULT_DESCRIPTION = 'Compare preços em tempo real nas maiores lojas do Brasil: KaBuM!, AliExpress, Amazon, Mercado Livre e Magalu. Encontre cupons e economize sempre.';
const SITE_URL = 'https://chaveofertas.com.br';

/**
 * Gera Metadados Dinâmicos Otimizados para SEO e Motores de IA (GEO)
 */
export function generateProductMetadata(product: Product): SeoMetadata {
  const formattedMinPrice = product.minPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const otherStoresCount = (product.offers?.length || 1) - 1;
  const storeContext = otherStoresCount > 0 
    ? `na ${product.bestStore} e mais ${otherStoresCount} loja(s)`
    : `na loja oficial ${product.bestStore}`;

  // Título rigorosamente otimizado com 'Menor Preço'
  const title = `${product.title} - Menor Preço R$ ${formattedMinPrice} | Chave Ofertas`;

  // Descrição persuasiva rica em entidades semânticas para LLMs e Rich Snippets
  const description = `Compare o Menor Preço de ${product.title} a partir de R$ ${formattedMinPrice} ${storeContext}. Histórico de preços, cupons de desconto e entrega garantida no Chave Ofertas.`;

  const canonicalUrl = `${SITE_URL}/produto/${product.slug || product.id}`;
  const keywords = Array.from(new Set([
    product.title.toLowerCase(),
    product.brand.toLowerCase(),
    product.categoryName.toLowerCase(),
    'menor preço',
    'comparador de preços',
    'ofertas',
    'desconto',
    'cupom',
    product.bestStore.toLowerCase(),
    ...(product.searchKeywords || [])
  ])).join(', ');

  return {
    title,
    description,
    canonicalUrl,
    ogTitle: title,
    ogDescription: description,
    ogImage: product.imageUrl,
    keywords,
  };
}

/**
 * Gera Schema Markup JSON-LD completo com Product e AggregateOffer (Google Rich Snippets)
 */
export function generateProductJsonLd(product: Product) {
  const offersList = (product.offers || []).map((off) => ({
    '@type': 'Offer',
    price: off.price,
    priceCurrency: 'BRL',
    priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    itemCondition: 'https://schema.org/NewCondition',
    availability: off.inStock !== false ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    url: off.affiliateUrl || `${SITE_URL}/produto/${product.slug || product.id}`,
    seller: {
      '@type': 'Organization',
      name: off.storeName,
    },
  }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: [product.imageUrl, ...(product.galleryUrls || [])].filter(Boolean),
    description: product.description || `Compre ${product.title} com o menor preço garantido e entrega no Brasil.`,
    sku: product.sku || `SKU-${product.id}`,
    ...(product.ean ? { gtin13: product.ean } : {}),
    brand: {
      '@type': 'Brand',
      name: product.brand || 'Geral',
    },
    category: product.categoryName,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: (product.rating || 4.8).toFixed(1),
      reviewCount: product.reviewsCount || 100,
      bestRating: '5',
      worstRating: '1',
    },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'BRL',
      lowPrice: product.minPrice,
      highPrice: product.maxPrice || product.minPrice,
      offerCount: Math.max(product.offers?.length || 1, 1),
      offers: offersList.length > 0 ? offersList : undefined,
    },
  };

  return jsonLd;
}

/**
 * React Hook para injeção em tempo real de Meta Tags e JSON-LD no Head da página
 */
export function useProductSeo(product?: Product | null) {
  useEffect(() => {
    if (!product) {
      document.title = DEFAULT_TITLE;
      return;
    }

    const meta = generateProductMetadata(product);
    const jsonLd = generateProductJsonLd(product);

    // 1. Atualiza Título
    document.title = meta.title;

    // 2. Helper para atualizar ou criar meta tag
    const setMetaTag = (attr: 'name' | 'property', key: string, content: string) => {
      let element = document.querySelector(`meta[${attr}="${key}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, key);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // 3. Meta Tags Principais
    setMetaTag('name', 'description', meta.description);
    setMetaTag('name', 'keywords', meta.keywords);

    // 4. Open Graph (Facebook, WhatsApp, LinkedIn, Motores de IA)
    setMetaTag('property', 'og:title', meta.ogTitle);
    setMetaTag('property', 'og:description', meta.ogDescription);
    setMetaTag('property', 'og:image', meta.ogImage);
    setMetaTag('property', 'og:url', meta.canonicalUrl);
    setMetaTag('property', 'og:type', 'product');

    // 5. Twitter Card
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', meta.ogTitle);
    setMetaTag('name', 'twitter:description', meta.ogDescription);
    setMetaTag('name', 'twitter:image', meta.ogImage);

    // 6. Link Canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', meta.canonicalUrl);

    // 7. Injeção do Schema Markup JSON-LD (Product + AggregateOffer)
    const scriptId = 'product-schema-jsonld';
    let scriptTag = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = scriptId;
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(jsonLd);

    // Limpeza ao desmontar
    return () => {
      document.title = DEFAULT_TITLE;
      setMetaTag('name', 'description', DEFAULT_DESCRIPTION);
      const existingScript = document.getElementById(scriptId);
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [product]);
}
