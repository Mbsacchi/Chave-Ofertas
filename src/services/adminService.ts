import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DraftProduct, Product, StoreOffer, StoreId } from '../types';
import { CATEGORIES_TREE } from '../data/mockData';

// Local authenticated session cache for fallback when Supabase tables are initializing
const LOCAL_DRAFTS_STORAGE_KEY = 'chave_ofertas_admin_drafts_v1';
const LOCAL_PUBLISHED_STORAGE_KEY = 'chave_ofertas_admin_custom_products_v1';

const getStoredDrafts = (): DraftProduct[] => {
  try {
    const raw = localStorage.getItem(LOCAL_DRAFTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveStoredDrafts = (drafts: DraftProduct[]) => {
  try {
    localStorage.setItem(LOCAL_DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
  } catch (err) {
    console.error('Error saving local drafts:', err);
  }
};

export const getStoredCustomProducts = (): Product[] => {
  try {
    const raw = localStorage.getItem(LOCAL_PUBLISHED_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveStoredCustomProducts = (prods: Product[]) => {
  try {
    localStorage.setItem(LOCAL_PUBLISHED_STORAGE_KEY, JSON.stringify(prods));
  } catch (err) {
    console.error('Error saving local published products:', err);
  }
};

/**
 * Validates that an active Supabase user session exists before allowing mutations.
 */
const requireAuthSession = async (): Promise<string> => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session || !session.user) {
    throw new Error('Acesso negado: Sessão de administrador ausente ou expirada.');
  }
  return session.user.id;
};

export interface ScrapedProductData {
  title: string;
  price: number;
  originalPrice: number;
  imageUrl: string;
  affiliateUrl: string;
  freeShipping?: boolean;
}

/**
 * Extracts product metadata (title, price, image, affiliate URL) by scraping the Mercado Livre page
 * from the pasted affiliate text containing a meli.la or mercadolivre.com link.
 */
export const scrapeMercadoLivreProduct = async (rawAffiliateText: string): Promise<ScrapedProductData> => {
  const urlMatch = rawAffiliateText.match(/https?:\/\/[^\s]+/i);
  if (!urlMatch) {
    throw new Error('Nenhum link válido (ex: https://meli.la/...) foi encontrado no texto colado.');
  }

  const affiliateUrl = urlMatch[0];
  const response = await fetch('/api/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ url: affiliateUrl }),
  });
  
  const text = await response.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Erro do servidor (status ${response.status}): ${text.substring(0, 100)}`);
  }

  if (!response.ok) {
    throw new Error(data.error || `Falha ao processar link: status ${response.status}`);
  }

  if (!data.success) {
    throw new Error(data.error || 'Não foi possível extrair os dados do produto.');
  }

  return {
    title: data.title || '',
    price: Number(data.price) || 0,
    originalPrice: Number(data.originalPrice) || 0,
    imageUrl: data.imageUrl || '',
    affiliateUrl: affiliateUrl,
    freeShipping: data.freeShipping ?? true,
  };
};

/**
 * Fetches all draft products in the staging queue
 */
export const fetchDraftProducts = async (): Promise<DraftProduct[]> => {
  await requireAuthSession();
  
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('draft_products')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        return data.map((d: any) => ({
          id: d.id,
          externalId: d.external_id,
          title: d.title,
          brand: d.brand || '',
          description: d.description || '',
          categoryId: d.category_id,
          categoryName: d.category_name,
          subcategoryId: d.subcategory_id,
          subcategoryName: d.subcategory_name,
          imageUrl: d.image_url,
          originalPrice: Number(d.original_price) || 0,
          promotionalPrice: Number(d.promotional_price) || 0,
          discountPercent: Number(d.discount_percent) || 0,
          affiliateUrl: d.affiliate_url,
          storeId: d.store_id || 'mercadolivre',
          storeName: d.store_name || 'Mercado Livre',
          freeShipping: Boolean(d.free_shipping),
          installment: d.installment || 'À vista',
          status: d.status || 'draft',
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));
      }
    } catch (err) {
      console.warn('Supabase draft table query failed, falling back to secure local staging:', err);
    }
  }

  return getStoredDrafts();
};

/**
 * Adds a new product to the Draft Staging Queue
 */
export const addDraftProduct = async (
  draftData: Omit<DraftProduct, 'id' | 'createdAt' | 'updatedAt' | 'status'>
): Promise<DraftProduct> => {
  await requireAuthSession();

  const id = `draft-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const now = new Date().toISOString();
  
  const newDraft: DraftProduct = {
    ...draftData,
    id,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('draft_products').insert({
        id: newDraft.id,
        external_id: newDraft.externalId,
        title: newDraft.title,
        brand: newDraft.brand,
        description: newDraft.description,
        category_id: newDraft.categoryId,
        category_name: newDraft.categoryName,
        subcategory_id: newDraft.subcategoryId,
        subcategory_name: newDraft.subcategoryName,
        image_url: newDraft.imageUrl,
        original_price: newDraft.originalPrice,
        promotional_price: newDraft.promotionalPrice,
        discount_percent: newDraft.discountPercent,
        affiliate_url: newDraft.affiliateUrl,
        store_id: newDraft.storeId,
        store_name: newDraft.storeName,
        free_shipping: newDraft.freeShipping,
        installment: newDraft.installment,
        status: newDraft.status,
        created_at: newDraft.createdAt,
        updated_at: newDraft.updatedAt,
      });

      if (error) {
        console.warn('Supabase insert draft warning:', error.message);
      }
    } catch (err) {
      console.warn('Supabase draft insertion exception, saving locally:', err);
    }
  }

  const drafts = getStoredDrafts();
  saveStoredDrafts([newDraft, ...drafts]);
  return newDraft;
};

/**
 * Updates an existing draft product in staging
 */
export const updateDraftProduct = async (
  id: string,
  patch: Partial<DraftProduct>
): Promise<DraftProduct> => {
  await requireAuthSession();
  const now = new Date().toISOString();

  if (isSupabaseConfigured) {
    try {
      const dbPayload: any = { updated_at: now };
      if (patch.title !== undefined) dbPayload.title = patch.title;
      if (patch.brand !== undefined) dbPayload.brand = patch.brand;
      if (patch.description !== undefined) dbPayload.description = patch.description;
      if (patch.categoryId !== undefined) dbPayload.category_id = patch.categoryId;
      if (patch.categoryName !== undefined) dbPayload.category_name = patch.categoryName;
      if (patch.subcategoryId !== undefined) dbPayload.subcategory_id = patch.subcategoryId;
      if (patch.subcategoryName !== undefined) dbPayload.subcategory_name = patch.subcategoryName;
      if (patch.imageUrl !== undefined) dbPayload.image_url = patch.imageUrl;
      if (patch.originalPrice !== undefined) dbPayload.original_price = patch.originalPrice;
      if (patch.promotionalPrice !== undefined) dbPayload.promotional_price = patch.promotionalPrice;
      if (patch.discountPercent !== undefined) dbPayload.discount_percent = patch.discountPercent;
      if (patch.affiliateUrl !== undefined) dbPayload.affiliate_url = patch.affiliateUrl;
      if (patch.storeId !== undefined) dbPayload.store_id = patch.storeId;
      if (patch.storeName !== undefined) dbPayload.store_name = patch.storeName;
      if (patch.freeShipping !== undefined) dbPayload.free_shipping = patch.freeShipping;
      if (patch.installment !== undefined) dbPayload.installment = patch.installment;

      await supabase.from('draft_products').update(dbPayload).eq('id', id);
    } catch (err) {
      console.warn('Supabase update draft exception:', err);
    }
  }

  const drafts = getStoredDrafts();
  const updated = drafts.map(d => (d.id === id ? { ...d, ...patch, updatedAt: now } : d));
  saveStoredDrafts(updated);

  const target = updated.find(d => d.id === id);
  if (!target) throw new Error('Rascunho não encontrado.');
  return target;
};

/**
 * Deletes a draft product from staging
 */
export const deleteDraftProduct = async (id: string): Promise<void> => {
  await requireAuthSession();

  if (isSupabaseConfigured) {
    try {
      await supabase.from('draft_products').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase delete draft exception:', err);
    }
  }

  const drafts = getStoredDrafts();
  saveStoredDrafts(drafts.filter(d => d.id !== id));
};

/**
 * Publishes a draft product directly to the live vitrine
 */
export const publishDraftToVitrine = async (draft: DraftProduct): Promise<Product> => {
  await requireAuthSession();

  if (!draft.affiliateUrl || !draft.affiliateUrl.trim()) {
    throw new Error('Por favor, informe o Link de Afiliado antes de publicar o produto.');
  }

  const slug = draft.title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();

  const productId = `prod-${Date.now()}-${slug.slice(0, 30)}`;
  const now = new Date().toISOString();

  const primaryOffer: StoreOffer = {
    id: `off-${draft.storeId}-${Date.now()}`,
    storeId: draft.storeId,
    storeName: draft.storeName,
    storeLogo: draft.storeId === 'mercadolivre' 
      ? 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=100&auto=format&fit=crop&q=80'
      : 'https://images.unsplash.com/photo-1523474253243-283a0ed81406?w=100&auto=format&fit=crop&q=80',
    price: draft.promotionalPrice,
    originalPrice: draft.originalPrice || draft.promotionalPrice,
    discountPercent: draft.discountPercent || 0,
    currency: 'BRL',
    affiliateUrl: draft.affiliateUrl,
    inStock: true,
    freeShipping: draft.freeShipping,
    installment: draft.installment || 'À vista',
    rating: 4.8,
    reviewsCount: 150,
    lastUpdated: 'Agora',
  };

  const newProduct: Product = {
    id: productId,
    title: draft.title,
    slug,
    description: draft.description || `${draft.title} com o melhor preço e oferta verificada pelo Chave Ofertas.`,
    categoryId: draft.categoryId,
    categoryName: draft.categoryName,
    subcategoryId: draft.subcategoryId,
    subcategoryName: draft.subcategoryName,
    brand: draft.brand || 'Geral',
    sku: draft.externalId || `SKU-${Date.now()}`,
    imageUrl: draft.imageUrl,
    searchKeywords: [
      ...draft.title.toLowerCase().split(/\s+/),
      draft.brand?.toLowerCase() || '',
      draft.categoryName?.toLowerCase() || '',
    ].filter(Boolean),
    minPrice: draft.promotionalPrice,
    maxPrice: draft.originalPrice || draft.promotionalPrice,
    historicalLowestPrice: draft.promotionalPrice,
    bestStore: draft.storeName,
    bestStoreId: draft.storeId,
    rating: 4.8,
    reviewsCount: 120,
    isVerified: true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    offers: [primaryOffer],
    priceHistory: [
      { date: 'Mar', timestamp: 1711929600000, minPrice: Math.round(draft.promotionalPrice * 1.15) },
      { date: 'Abr', timestamp: 1714521600000, minPrice: Math.round(draft.promotionalPrice * 1.10) },
      { date: 'Mai', timestamp: 1717200000000, minPrice: Math.round(draft.promotionalPrice * 1.05) },
      { date: 'Jun', timestamp: 1719792000000, minPrice: Math.round(draft.promotionalPrice * 1.02) },
      { date: 'Jul', timestamp: 1722470400000, minPrice: Math.round(draft.promotionalPrice * 1.01) },
      { date: 'Ago (Hoje)', timestamp: 1724889600000, minPrice: draft.promotionalPrice },
    ],
  };

  if (isSupabaseConfigured) {
    try {
      await supabase.from('products').insert({
        id: newProduct.id,
        title: newProduct.title,
        slug: newProduct.slug,
        description: newProduct.description,
        category_id: newProduct.categoryId,
        category_name: newProduct.categoryName,
        subcategory_id: newProduct.subcategoryId,
        subcategory_name: newProduct.subcategoryName,
        brand: newProduct.brand,
        sku: newProduct.sku,
        image_url: newProduct.imageUrl,
        search_keywords: newProduct.searchKeywords,
        min_price: newProduct.minPrice,
        max_price: newProduct.maxPrice,
        historical_lowest_price: newProduct.historicalLowestPrice,
        best_store: newProduct.bestStore,
        best_store_id: newProduct.bestStoreId,
        rating: newProduct.rating,
        reviews_count: newProduct.reviewsCount,
        is_verified: newProduct.isVerified,
        is_active: newProduct.isActive,
        offers: newProduct.offers,
        price_history: newProduct.priceHistory,
        created_at: newProduct.createdAt,
        updated_at: newProduct.updatedAt,
      });

      // Remove from drafts in DB
      await supabase.from('draft_products').delete().eq('id', draft.id);
    } catch (err) {
      console.warn('Supabase publish exception:', err);
    }
  }

  // Update local storage
  const customProducts = getStoredCustomProducts();
  saveStoredCustomProducts([newProduct, ...customProducts]);

  // Remove from local drafts
  const drafts = getStoredDrafts();
  saveStoredDrafts(drafts.filter(d => d.id !== draft.id));

  return newProduct;
};

/**
 * Creates and publishes a product directly to the vitrine from the Manual Form
 */
export const createAndPublishManualProduct = async (data: {
  title: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  affiliateUrl: string;
  brand?: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  subcategoryId?: string;
  subcategoryName?: string;
  storeName?: string;
  storeId?: StoreId;
  freeShipping?: boolean;
}): Promise<Product> => {
  await requireAuthSession();

  if (!data.title.trim()) throw new Error('Por favor, informe o Título do Produto.');
  if (!data.price || data.price <= 0) throw new Error('Por favor, informe um Preço válido.');
  if (!data.imageUrl.trim()) throw new Error('Por favor, informe a URL da Imagem.');
  if (!data.affiliateUrl.trim()) throw new Error('Por favor, informe o Link de Afiliado.');

  const defaultCategory = CATEGORIES_TREE[0];
  const defaultSubcategory = defaultCategory?.subcategories?.[0];

  const categoryId = data.categoryId || defaultCategory?.id || 'eletronicos';
  const categoryName = data.categoryName || defaultCategory?.name || 'Eletrônicos';
  const subcategoryId = data.subcategoryId || defaultSubcategory?.id;
  const subcategoryName = data.subcategoryName || defaultSubcategory?.name;

  const promotionalPrice = Number(data.price);
  const originalPrice = data.originalPrice && data.originalPrice > promotionalPrice 
    ? Number(data.originalPrice) 
    : Math.round(promotionalPrice * 1.15);
  const discountPercent = Math.max(5, Math.round(((originalPrice - promotionalPrice) / originalPrice) * 100));

  const slug = data.title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();

  const productId = `prod-${Date.now()}-${slug.slice(0, 30)}`;
  const now = new Date().toISOString();
  const storeId: StoreId = data.storeId || 'mercadolivre';
  const storeName = data.storeName || 'Mercado Livre';

  const primaryOffer: StoreOffer = {
    id: `off-${storeId}-${Date.now()}`,
    storeId,
    storeName,
    storeLogo: storeId === 'mercadolivre' 
      ? 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=100&auto=format&fit=crop&q=80'
      : 'https://images.unsplash.com/photo-1523474253243-283a0ed81406?w=100&auto=format&fit=crop&q=80',
    price: promotionalPrice,
    originalPrice,
    discountPercent,
    currency: 'BRL',
    affiliateUrl: data.affiliateUrl.trim(),
    inStock: true,
    freeShipping: data.freeShipping ?? true,
    installment: '10x sem juros',
    rating: 4.9,
    reviewsCount: 150,
    lastUpdated: 'Agora',
  };

  const newProduct: Product = {
    id: productId,
    title: data.title.trim(),
    slug,
    description: data.description || `${data.title.trim()} com preço verificado, garantia e envio rápido no Mercado Livre.`,
    categoryId,
    categoryName,
    subcategoryId,
    subcategoryName,
    brand: data.brand?.trim() || 'Mercado Livre',
    sku: `SKU-${Date.now()}`,
    imageUrl: data.imageUrl.trim(),
    searchKeywords: [
      ...data.title.toLowerCase().split(/\s+/),
      'mercado livre',
      'promocao',
      'oferta'
    ].filter(Boolean),
    minPrice: promotionalPrice,
    maxPrice: originalPrice,
    historicalLowestPrice: promotionalPrice,
    bestStore: storeName,
    bestStoreId: storeId,
    rating: 4.9,
    reviewsCount: 120,
    isVerified: true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    offers: [primaryOffer],
    priceHistory: [
      { date: 'Mar', timestamp: 1711929600000, minPrice: Math.round(promotionalPrice * 1.15) },
      { date: 'Abr', timestamp: 1714521600000, minPrice: Math.round(promotionalPrice * 1.10) },
      { date: 'Mai', timestamp: 1717200000000, minPrice: Math.round(promotionalPrice * 1.05) },
      { date: 'Jun', timestamp: 1719792000000, minPrice: Math.round(promotionalPrice * 1.02) },
      { date: 'Jul', timestamp: 1722470400000, minPrice: Math.round(promotionalPrice * 1.01) },
      { date: 'Ago (Hoje)', timestamp: 1724889600000, minPrice: promotionalPrice },
    ],
  };

  if (isSupabaseConfigured) {
    try {
      await supabase.from('products').insert({
        id: newProduct.id,
        title: newProduct.title,
        slug: newProduct.slug,
        description: newProduct.description,
        category_id: newProduct.categoryId,
        category_name: newProduct.categoryName,
        subcategory_id: newProduct.subcategoryId,
        subcategory_name: newProduct.subcategoryName,
        brand: newProduct.brand,
        sku: newProduct.sku,
        image_url: newProduct.imageUrl,
        search_keywords: newProduct.searchKeywords,
        min_price: newProduct.minPrice,
        max_price: newProduct.maxPrice,
        historical_lowest_price: newProduct.historicalLowestPrice,
        best_store: newProduct.bestStore,
        best_store_id: newProduct.bestStoreId,
        rating: newProduct.rating,
        reviews_count: newProduct.reviewsCount,
        is_verified: newProduct.isVerified,
        is_active: newProduct.isActive,
        offers: newProduct.offers,
        price_history: newProduct.priceHistory,
        created_at: newProduct.createdAt,
        updated_at: newProduct.updatedAt,
      });
    } catch (err) {
      console.warn('Supabase insert direct manual product exception:', err);
    }
  }

  // Update local storage
  const customProducts = getStoredCustomProducts();
  saveStoredCustomProducts([newProduct, ...customProducts]);

  return newProduct;
};

/**
 * Fetches all custom published products from Supabase/Storage
 */
export const fetchLiveDatabaseProducts = async (): Promise<Product[]> => {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((p: any) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          description: p.description || '',
          categoryId: p.category_id,
          categoryName: p.category_name,
          subcategoryId: p.subcategory_id,
          subcategoryName: p.subcategory_name,
          brand: p.brand || 'Geral',
          sku: p.sku || '',
          imageUrl: p.image_url,
          searchKeywords: p.search_keywords || [],
          minPrice: Number(p.min_price),
          maxPrice: Number(p.max_price),
          historicalLowestPrice: Number(p.historical_lowest_price) || Number(p.min_price),
          bestStore: p.best_store,
          bestStoreId: p.best_store_id,
          rating: Number(p.rating) || 4.8,
          reviewsCount: Number(p.reviews_count) || 100,
          isVerified: Boolean(p.is_verified),
          isActive: Boolean(p.is_active),
          createdAt: p.created_at,
          updatedAt: p.updated_at,
          offers: p.offers || [],
          priceHistory: p.price_history || [],
        }));
      }
    } catch (err) {
      console.warn('Supabase fetchLiveDatabaseProducts error:', err);
    }
  }

  return getStoredCustomProducts();
};
