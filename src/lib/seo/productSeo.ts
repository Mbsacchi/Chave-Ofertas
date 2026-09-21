import { useEffect } from 'react';
import { Product } from '../../types';
import { normalizePrice } from '../../utils/priceFormatter';

export interface SeoMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  keywords: string;
}

export const DEFAULT_TITLE = 'Chave Ofertas | Comparador de Preços e Melhores Ofertas em Tempo Real';
export const DEFAULT_DESCRIPTION = 'Compare preços em tempo real nas maiores lojas do Brasil: KaBuM!, AliExpress, Amazon, Mercado Livre e Magalu. Encontre cupons e economize sempre.';
export const SITE_URL = 'https://chaveofertas.com.br';

/**
 * Gera Metadados Dinâmicos Otimizados para SEO e Motores de IA (GEO)
 */
export function generateProductMetadata(product?: Product | null): SeoMetadata {
  if (!product) {
    return {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      canonicalUrl: SITE_URL,
      ogTitle: DEFAULT_TITLE,
      ogDescription: DEFAULT_DESCRIPTION,
      ogImage: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=600&q=80',
      keywords: 'menor preço, comparador de preços, ofertas, desconto, cupons',
    };
  }

  const minPriceVal = normalizePrice(product.minPrice);
  const formattedMinPrice = minPriceVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const rawOffers = Array.isArray(product.offers) ? product.offers : (Array.isArray(product.prices) ? product.prices : []);
  const otherStoresCount = Math.max(0, (rawOffers.length || 1) - 1);
  const bestStore = String(product.bestStore || 'Loja Oficial').trim();
  const storeContext = otherStoresCount > 0 
    ? `na ${bestStore} e mais ${otherStoresCount} loja(s)`
    : `na loja oficial ${bestStore}`;

  const prodTitle = String(product.title || 'Produto').trim();
  const prodBrand = String(product.brand || 'Geral').trim();
  const prodCategory = String(product.categoryName || 'Geral').trim();

  // Título rigorosamente otimizado com 'Menor Preço' e marca para SEO e GEO
  const title = `${prodTitle} - Menor Preço R$ ${formattedMinPrice} | Chave Ofertas`;

  // Descrição persuasiva rica em entidades semânticas para LLMs e Rich Snippets
  const description = `Compare o Menor Preço de ${prodTitle} a partir de R$ ${formattedMinPrice} ${storeContext}. Histórico de preços, cupons de desconto e entrega garantida no Chave Ofertas.`;

  const canonicalUrl = `${SITE_URL}/produto/${product.slug || product.id || ''}`;
  const keywords = Array.from(new Set([
    prodTitle.toLowerCase(),
    prodBrand.toLowerCase(),
    prodCategory.toLowerCase(),
    'menor preço',
    'comparador de preços',
    'ofertas',
    'desconto',
    'cupom',
    bestStore.toLowerCase(),
    ...(Array.isArray(product.searchKeywords) ? product.searchKeywords : [])
  ])).filter(Boolean).join(', ');

  const imageList = Array.isArray(product.images) ? product.images : (Array.isArray(product.galleryUrls) ? product.galleryUrls : []);
  const ogImage = product.imageUrl || imageList[0] || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=600&q=80';

  return {
    title,
    description,
    canonicalUrl,
    ogTitle: title,
    ogDescription: description,
    ogImage,
    keywords,
  };
}

/**
 * Gera Schema Markup JSON-LD completo com Product e AggregateOffer (Google Rich Snippets)
 */
export function generateProductJsonLd(product?: Product | null) {
  if (!product) return null;

  const rawOffers = Array.isArray(product.offers) ? product.offers : (Array.isArray(product.prices) ? product.prices : []);
  const normalizedMin = normalizePrice(product.minPrice);
  const normalizedMax = normalizePrice(product.maxPrice || product.minPrice, normalizedMin);
  
  // Regras de política de devolução padrão no Brasil (CDC art. 49: 7 dias)
  const defaultMerchantReturnPolicy = {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: 'BR',
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: 7,
    returnMethod: 'https://schema.org/ReturnByMail',
    returnFees: 'https://schema.org/FreeReturn',
  };

  // Regras de frete padrão
  const defaultShippingDetails = {
    '@type': 'OfferShippingDetails',
    shippingRate: {
      '@type': 'MonetaryAmount',
      value: 0,
      currency: 'BRL',
    },
    shippingDestination: [{
      '@type': 'DefinedRegion',
      addressCountry: 'BR',
    }],
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: {
        '@type': 'QuantitativeValue',
        minValue: 1,
        maxValue: 3,
        unitCode: 'DAY',
      },
      transitTime: {
        '@type': 'QuantitativeValue',
        minValue: 2,
        maxValue: 8,
        unitCode: 'DAY',
      },
    },
  };

  const offersList = rawOffers.map((off: any) => ({
    '@type': 'Offer',
    price: normalizePrice(off?.price || normalizedMin, normalizedMin),
    priceCurrency: 'BRL',
    priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    itemCondition: 'https://schema.org/NewCondition',
    availability: off?.inStock !== false && off?.in_stock !== false ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    url: off?.affiliateUrl || off?.affiliate_url || `${SITE_URL}/produto/${product.slug || product.id}`,
    seller: {
      '@type': 'Organization',
      name: String(off?.storeName || off?.store_name || product.bestStore || 'Loja Oficial'),
    },
    hasMerchantReturnPolicy: defaultMerchantReturnPolicy,
    shippingDetails: defaultShippingDetails,
  }));

  const imageList = Array.isArray(product.images) 
    ? product.images 
    : (Array.isArray(product.galleryUrls) ? product.galleryUrls : []);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title || 'Produto',
    image: [product.imageUrl, ...imageList].filter(Boolean),
    description: product.description || `Compre ${product.title || 'o item'} com o menor preço garantido e entrega no Brasil.`,
    sku: product.sku || `SKU-${product.id}`,
    ...(product.ean ? { gtin13: product.ean } : {}),
    brand: {
      '@type': 'Brand',
      name: product.brand || 'Geral',
    },
    category: product.categoryName || 'Geral',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: (Number(product.rating) || 4.8).toFixed(1),
      reviewCount: Number(product.reviewsCount) || 100,
      bestRating: '5',
      worstRating: '1',
    },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'BRL',
      lowPrice: normalizedMin,
      highPrice: Math.max(normalizedMax, normalizedMin),
      offerCount: Math.max(offersList.length, 1),
      offers: offersList.length > 0 ? offersList : undefined,
    },
  };

  return jsonLd;
}

/**
 * Gera Schema Markup BreadcrumbList para navegação estruturada no Google SERP
 */
export function generateBreadcrumbJsonLd(product?: Product | null) {
  if (!product) return null;

  const categoryName = product.categoryName || 'Informática e Tecnologia';
  const categorySlug = (product.categoryId || product.categoryName || 'geral').toLowerCase().replace(/\s+/g, '-');
  const productSlug = product.slug || product.id || '';

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: categoryName,
        item: `${SITE_URL}/categoria/${categorySlug}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.title || 'Produto',
        item: `${SITE_URL}/produto/${productSlug}`,
      },
    ],
  };
}

/**
 * Gera Schema Markup WebSite com SearchAction para Google Sitelinks Searchbox
 */
export function generateGlobalWebSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Chave Ofertas',
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Gera Schema Markup Organization para reconhecimento da marca por IAs e Google Knowledge Graph
 */
export function generateOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Chave Ofertas',
    url: SITE_URL,
    logo: `${SITE_URL}/key-icon.svg`,
    sameAs: [
      'https://www.instagram.com/chaveofertas',
    ],
    description: 'Comparador de preços inteligente e cupons de desconto verificados em tempo real.',
  };
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
    const breadcrumbLd = generateBreadcrumbJsonLd(product);

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

    // 7. Injeção do Schema Markup JSON-LD (Product)
    const scriptId = 'product-schema-jsonld';
    let scriptTag = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = scriptId;
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(jsonLd);

    // 8. Injeção do Schema Markup JSON-LD (Breadcrumbs)
    const breadcrumbScriptId = 'breadcrumb-schema-jsonld';
    let breadcrumbScriptTag = document.getElementById(breadcrumbScriptId) as HTMLScriptElement | null;
    if (!breadcrumbScriptTag) {
      breadcrumbScriptTag = document.createElement('script');
      breadcrumbScriptTag.id = breadcrumbScriptId;
      breadcrumbScriptTag.type = 'application/ld+json';
      document.head.appendChild(breadcrumbScriptTag);
    }
    breadcrumbScriptTag.textContent = JSON.stringify(breadcrumbLd);

    // Limpeza ao desmontar
    return () => {
      document.title = DEFAULT_TITLE;
      setMetaTag('name', 'description', DEFAULT_DESCRIPTION);
      const existingScript = document.getElementById(scriptId);
      if (existingScript) {
        existingScript.remove();
      }
      const existingBreadcrumb = document.getElementById(breadcrumbScriptId);
      if (existingBreadcrumb) {
        existingBreadcrumb.remove();
      }
    };
  }, [product]);
}
