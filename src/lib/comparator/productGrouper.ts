import { Product, StoreOffer, StoreId, PriceHistoryPoint } from '../../types';

// Logos padrão das lojas parceiras
const STORE_LOGOS: Record<string, string> = {
  amazon: 'https://images.unsplash.com/photo-1523474253243-283a0ed81406?w=100&auto=format&fit=crop&q=80',
  mercadolivre: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=100&auto=format&fit=crop&q=80',
  shopee: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=100&auto=format&fit=crop&q=80',
  magalu: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=100&auto=format&fit=crop&q=80',
  kabum: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=100&auto=format&fit=crop&q=80',
  aliexpress: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=100&auto=format&fit=crop&q=80',
  awin: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=100&auto=format&fit=crop&q=80',
};

export function getStoreLogo(storeId?: StoreId | string): string {
  return (storeId && STORE_LOGOS[storeId]) || STORE_LOGOS.kabum;
}

/**
 * Limpa e normaliza código de barras EAN
 */
export function cleanEan(ean?: string | null): string | null {
  if (!ean) return null;
  const digits = ean.toString().replace(/\D/g, '');
  return digits.length >= 8 ? digits : null;
}

/**
 * Limpa e normaliza SKU de fabricante removendo prefixos de lojas
 */
export function cleanSku(sku?: string | null): string | null {
  if (!sku) return null;
  const raw = sku.toString().trim();
  // Remove prefixos conhecidos como KBM-, ALI-, AMZ-, ML-, MAGALU-, AWIN-
  const stripped = raw.replace(/^(KBM|ALI|AMZ|ML|MAGALU|AWIN|SHP|OFFER)-+/i, '').toLowerCase().trim();
  // Ignora SKUs genéricos ou muito curtos
  if (stripped.length < 4 || /^(prod|item|deal|geral|teste)/i.test(stripped)) {
    return null;
  }
  return stripped;
}

/**
 * Extrai tokens canônicos do título/slug ignorando ruídos de marketing
 */
export function extractCanonicalTokens(text: string): { tokens: string[]; numbers: string[] } {
  const stopWords = new Set([
    'de', 'do', 'da', 'dos', 'das', 'para', 'com', 'sem', 'em', 'por', 'e', 'ou',
    'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas',
    'smartphone', 'celular', 'smart', 'tv', 'box', 'fone', 'fones', 'ouvido',
    'bluetooth', 'wireless', 'novo', 'original', 'oficial', 'versao', 'global',
    'version', 'lacrado', 'garantia', 'pronta', 'entrega', 'promocao', 'oferta',
    'barato', 'brasil', 'br', 'loja', 'distribuidor', 'autorizado', 'frete', 'gratis'
  ]);

  const clean = (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  const words = clean.split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));
  const numbers = words.filter(w => /\d/.test(w));

  return { tokens: words, numbers };
}

/**
 * Verifica se dois produtos são representações do mesmo item (EAN, SKU ou Slug Compatível)
 */
export function areProductsCompatible(p1: Product, p2: Product): boolean {
  // 1. Mesmo ID exato
  if (p1.id === p2.id) return true;

  // 2. Correspondência por EAN (Código de Barras)
  const ean1 = cleanEan(p1.ean);
  const ean2 = cleanEan(p2.ean);
  if (ean1 && ean2 && ean1 === ean2) {
    return true;
  }

  // 3. Correspondência por SKU de Fabricante
  const sku1 = cleanSku(p1.sku);
  const sku2 = cleanSku(p2.sku);
  if (sku1 && sku2 && sku1 === sku2) {
    return true;
  }

  // 4. Mesmo Slug exato
  if (p1.slug && p2.slug && p1.slug.trim() === p2.slug.trim()) {
    return true;
  }

  // 5. Slug Compatível / Tokens Semânticos do Título
  // Verifica se as marcas são compatíveis (se ambas forem informadas e diferentes, não agrupa)
  const b1 = (p1.brand || '').toLowerCase().trim();
  const b2 = (p2.brand || '').toLowerCase().trim();
  const hasSpecificBrands = b1 && b2 && b1 !== 'geral' && b2 !== 'geral';
  if (hasSpecificBrands && b1 !== b2 && !b1.includes(b2) && !b2.includes(b1)) {
    return false;
  }

  const { tokens: tokens1, numbers: num1 } = extractCanonicalTokens(`${p1.title} ${p1.slug}`);
  const { tokens: tokens2, numbers: num2 } = extractCanonicalTokens(`${p2.title} ${p2.slug}`);

  // Se houver números de modelo ou especificações críticas (ex: s25 vs s26, 13 vs 14, 32 vs 50),
  // os conjuntos numéricos não podem divergir
  if (num1.length > 0 && num2.length > 0) {
    const numSet2 = new Set(num2);
    // Deve haver pelo menos 1 número em comum e nenhum conflito grave
    const sharedNumbers = num1.filter(n => numSet2.has(n));
    if (sharedNumbers.length === 0) {
      return false;
    }
  }

  // Cálculo de sobreposição de tokens
  const set2 = new Set(tokens2);
  const commonTokens = tokens1.filter(t => set2.has(t));
  const minLength = Math.min(tokens1.length, tokens2.length);

  if (minLength >= 3 && commonTokens.length / minLength >= 0.75) {
    return true;
  }

  return false;
}

/**
 * Normaliza e recalcula menor preço e melhor loja para um produto único
 */
export function normalizeProductOffers(product: Product): Product {
  if (!product.offers || product.offers.length === 0) {
    return product;
  }

  // Ordena ofertas do menor para o maior preço
  const sortedOffers = [...product.offers].sort((a, b) => {
    const netA = a.price - (a.couponDiscount || 0);
    const netB = b.price - (b.couponDiscount || 0);
    return netA - netB;
  });

  const bestOffer = sortedOffers[0];
  const lowestPrice = bestOffer.price;
  const bestStoreName = bestOffer.storeName;
  const bestStoreId = bestOffer.storeId;

  return {
    ...product,
    minPrice: lowestPrice,
    bestStore: bestStoreName,
    bestStoreId: bestStoreId,
    offers: sortedOffers,
  };
}

/**
 * Consolida um grupo de produtos repetidos em um único produto multi-lojas
 */
export function consolidateGroup(group: Product[]): Product {
  if (group.length === 1) {
    return normalizeProductOffers(group[0]);
  }

  // 1. Coleta todas as ofertas de todos os produtos do grupo
  const allOffers: StoreOffer[] = [];

  group.forEach(prod => {
    if (prod.offers && prod.offers.length > 0) {
      allOffers.push(...prod.offers);
    } else {
      // Sintetiza uma oferta estruturada caso o produto venha sem o array offers
      allOffers.push({
        id: `offer-${prod.bestStoreId || 'store'}-${prod.id}`,
        storeId: prod.bestStoreId || 'kabum',
        storeName: prod.bestStore || 'Loja Parceira',
        storeLogo: getStoreLogo(prod.bestStoreId),
        price: prod.minPrice,
        originalPrice: prod.maxPrice || prod.minPrice,
        discountPercent: prod.maxPrice > prod.minPrice
          ? Math.round(((prod.maxPrice - prod.minPrice) / prod.maxPrice) * 100)
          : 0,
        currency: 'BRL',
        affiliateUrl: '#',
        inStock: true,
        freeShipping: true,
        installment: '10x sem juros',
        rating: prod.rating || 4.8,
        reviewsCount: prod.reviewsCount || 100,
        lastUpdated: prod.updatedAt || 'Hoje',
      });
    }
  });

  // 2. Desduplica ofertas por loja: mantém a oferta com o menor preço para cada loja
  const storeOfferMap = new Map<string, StoreOffer>();
  allOffers.forEach(off => {
    const existing = storeOfferMap.get(off.storeId);
    if (!existing || off.price < existing.price) {
      storeOfferMap.set(off.storeId, off);
    }
  });

  // 3. Ordena todas as ofertas da menor para a maior
  const consolidatedOffers = Array.from(storeOfferMap.values()).sort((a, b) => {
    const netA = a.price - (a.couponDiscount || 0);
    const netB = b.price - (b.couponDiscount || 0);
    return netA - netB;
  });

  // 4. Cálculo dinâmico do Menor Preço (Best Price) e Melhor Loja
  const bestOffer = consolidatedOffers[0];
  const lowestPrice = bestOffer ? bestOffer.price : Math.min(...group.map(p => p.minPrice));
  const highestPrice = Math.max(
    ...group.map(p => p.maxPrice),
    ...consolidatedOffers.map(o => o.originalPrice || o.price),
    lowestPrice
  );
  const bestStoreName = bestOffer ? bestOffer.storeName : group[0].bestStore;
  const bestStoreId = bestOffer ? bestOffer.storeId : group[0].bestStoreId;

  // 5. Seleciona o produto primário como base para título, imagem e categoria
  const primary = group.slice().sort((a, b) => {
    // Preferência para produtos gravados no Supabase (não-mock)
    const isMockA = a.id.startsWith('prod-');
    const isMockB = b.id.startsWith('prod-');
    if (isMockA !== isMockB) return isMockA ? 1 : -1;
    // Preferência para títulos/descrições mais completas
    return (b.description?.length || 0) - (a.description?.length || 0);
  })[0];

  // 6. União de palavras-chave de busca
  const mergedKeywords = Array.from(new Set([
    ...group.flatMap(p => p.searchKeywords || []),
    ...consolidatedOffers.map(o => o.storeName.toLowerCase()),
    bestStoreName.toLowerCase(),
  ]));

  // 7. EAN e SKU mais completos
  const consolidatedEan = group.find(p => cleanEan(p.ean))?.ean || primary.ean;
  const consolidatedSku = group.find(p => cleanSku(p.sku))?.sku || primary.sku;

  // 8. Histórico de preços combinado
  const combinedHistory: PriceHistoryPoint[] = [];
  const datesSeen = new Set<string>();
  group.forEach(p => {
    (p.priceHistory || []).forEach(point => {
      if (!datesSeen.has(point.date)) {
        datesSeen.add(point.date);
        combinedHistory.push(point);
      }
    });
  });
  combinedHistory.sort((a, b) => a.timestamp - b.timestamp);

  return {
    ...primary,
    ean: consolidatedEan,
    sku: consolidatedSku,
    minPrice: lowestPrice,
    maxPrice: highestPrice,
    historicalLowestPrice: Math.min(
      ...group.map(p => p.historicalLowestPrice || p.minPrice),
      lowestPrice
    ),
    bestStore: bestStoreName,
    bestStoreId: bestStoreId,
    offers: consolidatedOffers,
    priceHistory: combinedHistory.length > 0 ? combinedHistory : primary.priceHistory,
    searchKeywords: mergedKeywords,
    clickCount: group.reduce((acc, p) => acc + (p.clickCount || 0), 0),
  };
}

/**
 * Função principal que agrupa ofertas repetidas em um único objeto de produto consolidado
 */
export function groupAndConsolidateProducts(products: Product[]): Product[] {
  if (!products || products.length <= 1) {
    return products ? products.map(normalizeProductOffers) : [];
  }

  const groups: Product[][] = [];
  const assigned = new Set<number>();

  for (let i = 0; i < products.length; i++) {
    if (assigned.has(i)) continue;

    const currentGroup: Product[] = [products[i]];
    assigned.add(i);

    for (let j = i + 1; j < products.length; j++) {
      if (assigned.has(j)) continue;

      if (areProductsCompatible(products[i], products[j])) {
        currentGroup.push(products[j]);
        assigned.add(j);
      }
    }

    groups.push(currentGroup);
  }

  return groups.map(consolidateGroup);
}
