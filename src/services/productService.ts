import { Product, StoreOffer, StoreId } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { fetchAllGlobalProducts } from './adminService';
import { normalizePrice } from '../utils/priceFormatter';

/**
 * Normaliza e protege qualquer objeto de produto contra propriedades nulas ou ausentes,
 * garantindo valores padrão para product.title, product.images, product.prices, product.offers, etc.
 */
export function normalizeProduct(raw: any): Product {
  if (!raw) {
    return {
      id: `prod-empty-${Date.now()}`,
      title: 'Produto Indisponível',
      slug: 'produto-indisponivel',
      description: '',
      categoryId: 'geral',
      categoryName: 'Geral',
      brand: 'Geral',
      sku: '',
      imageUrl: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=600&q=80',
      images: [],
      galleryUrls: [],
      searchKeywords: [],
      minPrice: 0,
      maxPrice: 0,
      historicalLowestPrice: 0,
      bestStore: 'Loja Oficial',
      bestStoreId: 'kabum',
      offers: [],
      prices: [],
      priceHistory: [],
      rating: 4.8,
      reviewsCount: 0,
      clickCount: 0,
      isVerified: true,
      isActive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // 1. Título e Identificadores
  const id = String(raw.id || raw.productId || raw._id || `prod-${Date.now()}`);
  const title = String(raw.title || raw.name || 'Produto sem título').trim();
  const slug = String(raw.slug || id).trim();
  const description = String(raw.description || '').trim();
  const brand = String(raw.brand || 'Geral').trim();
  const categoryId = String(raw.categoryId || raw.category_id || 'geral');
  const categoryName = String(raw.categoryName || raw.category_name || 'Geral');
  const subcategoryId = raw.subcategoryId || raw.subcategory_id ? String(raw.subcategoryId || raw.subcategory_id) : undefined;
  const subcategoryName = raw.subcategoryName || raw.subcategory_name ? String(raw.subcategoryName || raw.subcategory_name) : undefined;
  const sku = String(raw.sku || id);
  const ean = raw.ean ? String(raw.ean) : undefined;

  // 2. Imagens (Garante product.images e product.imageUrl)
  let images: string[] = [];
  if (Array.isArray(raw.images)) {
    images = raw.images.filter((img: any) => typeof img === 'string' && img.trim().length > 0);
  } else if (Array.isArray(raw.galleryUrls)) {
    images = raw.galleryUrls.filter((img: any) => typeof img === 'string' && img.trim().length > 0);
  } else if (Array.isArray(raw.gallery_urls)) {
    images = raw.gallery_urls.filter((img: any) => typeof img === 'string' && img.trim().length > 0);
  }

  const primaryImage = raw.imageUrl || raw.image_url || raw.image || (images.length > 0 ? images[0] : '');
  const finalImageUrl = primaryImage || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=600&q=80';
  if (images.length === 0 && finalImageUrl) {
    images = [finalImageUrl];
  }

  // 3. Preços e Valores Numéricos (Sanitizados e Imunes a Erros de Milhar/Centavos)
  const rawMin = raw.minPrice ?? raw.min_price ?? (Array.isArray(raw.prices) && raw.prices[0]?.price) ?? 0;
  const minPrice = normalizePrice(rawMin);

  const rawMax = raw.maxPrice ?? raw.max_price ?? raw.originalPrice ?? raw.original_price ?? minPrice;
  const maxPrice = normalizePrice(rawMax, minPrice) || minPrice;

  const rawHist = raw.historicalLowestPrice ?? raw.historical_lowest_price ?? minPrice;
  const historicalLowestPrice = normalizePrice(rawHist, minPrice) || minPrice;

  const bestStore = String(raw.bestStore || raw.best_store || 'Loja Parceira');
  const bestStoreId: StoreId = (raw.bestStoreId || raw.best_store_id || 'kabum') as StoreId;

  // 4. Ofertas e Preços Multilojas (Garante product.offers e product.prices)
  const rawOffersList = Array.isArray(raw.offers) ? raw.offers : (Array.isArray(raw.prices) ? raw.prices : []);
  const normalizedOffers: StoreOffer[] = rawOffersList.map((off: any, index: number) => {
    const rawOffPrice = off?.price ?? off?.minPrice ?? off?.min_price ?? minPrice;
    const offPrice = normalizePrice(rawOffPrice, minPrice) || minPrice;
    const rawOffOrig = off?.originalPrice ?? off?.original_price ?? offPrice;
    const offOrig = normalizePrice(rawOffOrig, offPrice) || offPrice;

    const offDiscount = offOrig > offPrice ? Math.round(((offOrig - offPrice) / offOrig) * 100) : 0;

    return {
      id: String(off?.id || `off-${index}-${Date.now()}`),
      storeId: (off?.storeId || off?.store_id || bestStoreId) as StoreId,
      storeName: String(off?.storeName || off?.store_name || bestStore),
      storeLogo: String(off?.storeLogo || off?.store_logo || ''),
      price: offPrice,
      originalPrice: offOrig,
      discountPercent: offDiscount,
      currency: String(off?.currency || 'BRL'),
      affiliateUrl: String(off?.affiliateUrl || off?.affiliate_url || off?.url || '#'),
      inStock: off?.inStock !== false && off?.in_stock !== false,
      freeShipping: Boolean(off?.freeShipping ?? off?.free_shipping ?? true),
      installment: String(off?.installment || 'À vista'),
      couponCode: off?.couponCode || off?.coupon_code ? String(off?.couponCode || off?.coupon_code) : undefined,
      couponDiscount: off?.couponDiscount || off?.coupon_discount ? Number(off?.couponDiscount || off?.coupon_discount) : undefined,
      rating: Number(off?.rating) || 4.8,
      reviewsCount: Number(off?.reviewsCount || off?.reviews_count) || 50,
      lastUpdated: String(off?.lastUpdated || off?.last_updated || 'Hoje'),
    };
  });

  // Se não houver ofertas na lista, gera uma oferta padrão consolidada com o menor preço
  if (normalizedOffers.length === 0) {
    normalizedOffers.push({
      id: `off-default-${id}`,
      storeId: bestStoreId,
      storeName: bestStore,
      storeLogo: '',
      price: minPrice,
      originalPrice: maxPrice,
      discountPercent: maxPrice > minPrice ? Math.round(((maxPrice - minPrice) / maxPrice) * 100) : 0,
      currency: 'BRL',
      affiliateUrl: String(raw.affiliateUrl || raw.affiliate_url || raw.url || '#'),
      inStock: true,
      freeShipping: true,
      installment: 'Consulte condições de parcelamento',
      rating: 4.8,
      reviewsCount: 100,
      lastUpdated: 'Hoje',
    });
  }

  // 5. Histórico de Preços e Palavras-chave
  const rawHistoryList = Array.isArray(raw.priceHistory || raw.price_history)
    ? (raw.priceHistory || raw.price_history)
    : [];
  const priceHistory = rawHistoryList.map((pt: any) => ({
    ...pt,
    minPrice: normalizePrice(pt?.minPrice ?? pt?.price, minPrice),
  }));
  const searchKeywords = Array.isArray(raw.searchKeywords || raw.search_keywords)
    ? (raw.searchKeywords || raw.search_keywords)
    : [];

  return {
    id,
    title,
    slug,
    description,
    categoryId,
    categoryName,
    subcategoryId,
    subcategoryName,
    brand,
    sku,
    ean,
    imageUrl: finalImageUrl,
    images,
    galleryUrls: images,
    searchKeywords,
    minPrice,
    maxPrice,
    historicalLowestPrice,
    bestStore,
    bestStoreId,
    offers: normalizedOffers,
    prices: normalizedOffers, // retrocompatibilidade para componentes que leem product.prices
    priceHistory,
    rating: Number(raw.rating) || 4.8,
    reviewsCount: Number(raw.reviewsCount ?? raw.reviews_count ?? 0) || 0,
    clickCount: Number(raw.clickCount ?? raw.click_count ?? 0) || 0,
    isVerified: Boolean(raw.isVerified ?? raw.is_verified ?? true),
    isActive: Boolean(raw.isActive ?? raw.is_active ?? true),
    createdAt: String(raw.createdAt || raw.created_at || new Date().toISOString()),
    updatedAt: String(raw.updatedAt || raw.updated_at || new Date().toISOString()),
  };
}

/**
 * Busca resiliente de produto pelo slug ou ID no Supabase com fallback seguro.
 * Nunca lança exceção não tratada. Retorna null se o produto não existir.
 */
export async function fetchProductBySlugOrId(slugOrId: string): Promise<Product | null> {
  const clean = String(slugOrId || '').trim();
  if (!clean) return null;

  // 1. Tenta buscar diretamente no Supabase se configurado
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(`slug.eq."${clean}",id.eq."${clean}"`)
        .limit(1);

      if (!error && data && data.length > 0) {
        return normalizeProduct(data[0]);
      }
    } catch (err: any) {
      console.warn(`[productService] Erro ao buscar produto no Supabase por slug (${clean}):`, err?.message);
    }
  }

  // 2. Fallback: busca em todos os produtos globais consolidados (banco + custom + catálogo)
  try {
    const all = await fetchAllGlobalProducts();
    const cleanLower = clean.toLowerCase();
    const matched = all.find((p) => {
      if (!p) return false;
      const pSlug = (p.slug || '').toLowerCase();
      const pId = (p.id || '').toLowerCase();
      return pSlug === cleanLower || pId === cleanLower;
    });

    if (matched) {
      return normalizeProduct(matched);
    }
  } catch (err: any) {
    console.warn(`[productService] Erro no fallback global para slug (${clean}):`, err?.message);
  }

  return null;
}
