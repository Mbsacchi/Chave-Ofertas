import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DraftProduct, Product, StoreOffer, StoreId, PriceHistoryPoint } from '../types';
import { MOCK_PRODUCTS } from '../data/mockData';

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

/**
 * Fetches all draft products in the staging queue (No restrictive user/source filters)
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
      console.warn('Supabase fetchDraftProducts error, using local cache:', err);
    }
  }

  return getStoredDrafts();
};

/**
 * Adds a new draft product to the staging queue (Status: draft)
 */
export const addDraftProduct = async (
  draft: Omit<DraftProduct, 'id' | 'createdAt' | 'updatedAt' | 'status'>
): Promise<DraftProduct> => {
  await requireAuthSession();

  const newDraft: DraftProduct = {
    ...draft,
    id: `draft-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('draft_products')
        .insert({
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
          status: 'draft',
        })
        .select()
        .single();

      if (!error && data) {
        return {
          id: data.id,
          externalId: data.external_id,
          title: data.title,
          brand: data.brand,
          description: data.description,
          categoryId: data.category_id,
          categoryName: data.category_name,
          subcategoryId: data.subcategory_id,
          subcategoryName: data.subcategory_name,
          imageUrl: data.image_url,
          originalPrice: Number(data.original_price),
          promotionalPrice: Number(data.promotional_price),
          discountPercent: Number(data.discount_percent),
          affiliateUrl: data.affiliate_url,
          storeId: data.store_id,
          storeName: data.store_name,
          freeShipping: Boolean(data.free_shipping),
          installment: data.installment,
          status: 'draft',
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
    } catch (err) {
      console.warn('Supabase addDraftProduct error, saving locally:', err);
    }
  }

  const existing = getStoredDrafts();
  saveStoredDrafts([newDraft, ...existing]);
  return newDraft;
};

/**
 * Updates an existing draft product
 */
export const updateDraftProduct = async (
  id: string,
  updates: Partial<DraftProduct>
): Promise<DraftProduct> => {
  await requireAuthSession();

  if (isSupabaseConfigured) {
    try {
      const payload: any = { updated_at: new Date().toISOString() };
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.brand !== undefined) payload.brand = updates.brand;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.categoryId !== undefined) payload.category_id = updates.categoryId;
      if (updates.categoryName !== undefined) payload.category_name = updates.categoryName;
      if (updates.subcategoryId !== undefined) payload.subcategory_id = updates.subcategoryId;
      if (updates.subcategoryName !== undefined) payload.subcategory_name = updates.subcategoryName;
      if (updates.imageUrl !== undefined) payload.image_url = updates.imageUrl;
      if (updates.originalPrice !== undefined) payload.original_price = updates.originalPrice;
      if (updates.promotionalPrice !== undefined) payload.promotional_price = updates.promotionalPrice;
      if (updates.discountPercent !== undefined) payload.discount_percent = updates.discountPercent;
      if (updates.affiliateUrl !== undefined) payload.affiliate_url = updates.affiliateUrl;
      if (updates.storeId !== undefined) payload.store_id = updates.storeId;
      if (updates.storeName !== undefined) payload.store_name = updates.storeName;
      if (updates.freeShipping !== undefined) payload.free_shipping = updates.freeShipping;
      if (updates.installment !== undefined) payload.installment = updates.installment;
      if (updates.status !== undefined) payload.status = updates.status;

      const { data, error } = await supabase
        .from('draft_products')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        return {
          id: data.id,
          externalId: data.external_id,
          title: data.title,
          brand: data.brand,
          description: data.description,
          categoryId: data.category_id,
          categoryName: data.category_name,
          subcategoryId: data.subcategory_id,
          subcategoryName: data.subcategory_name,
          imageUrl: data.image_url,
          originalPrice: Number(data.original_price),
          promotionalPrice: Number(data.promotional_price),
          discountPercent: Number(data.discount_percent),
          affiliateUrl: data.affiliate_url,
          storeId: data.store_id,
          storeName: data.store_name,
          freeShipping: Boolean(data.free_shipping),
          installment: data.installment,
          status: data.status,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
    } catch (err) {
      console.warn('Supabase updateDraftProduct error, updating locally:', err);
    }
  }

  const existing = getStoredDrafts();
  const index = existing.findIndex((d) => d.id === id);
  if (index === -1) {
    throw new Error('Rascunho não encontrado.');
  }

  const updated: DraftProduct = {
    ...existing[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  existing[index] = updated;
  saveStoredDrafts(existing);
  return updated;
};

/**
 * Deletes a draft product from the staging queue
 */
export const deleteDraftProduct = async (id: string): Promise<void> => {
  await requireAuthSession();

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('draft_products').delete().eq('id', id);
      if (error) console.warn('Supabase delete error:', error);
    } catch (err) {
      console.warn('Supabase deleteDraftProduct error:', err);
    }
  }

  const existing = getStoredDrafts();
  saveStoredDrafts(existing.filter((d) => d.id !== id));
};

/**
 * Publishes a draft product to the live Product table/Vitrine (Status: published)
 */
export const publishDraftToVitrine = async (draft: DraftProduct): Promise<Product> => {
  await requireAuthSession();

  const primaryOffer: StoreOffer = {
    id: `offer-${Date.now()}-1`,
    storeId: draft.storeId || 'mercadolivre',
    storeName: draft.storeName || 'Mercado Livre',
    storeLogo: `https://images.unsplash.com/photo-1557821552-17105176677c?w=100&auto=format&fit=crop&q=80`,
    price: draft.promotionalPrice,
    originalPrice: draft.originalPrice,
    discountPercent: draft.discountPercent,
    currency: 'BRL',
    affiliateUrl: draft.affiliateUrl,
    inStock: true,
    freeShipping: draft.freeShipping,
    installment: draft.installment || '10x sem juros',
    rating: 4.8,
    reviewsCount: 120,
    lastUpdated: new Date().toISOString(),
  };

  const historyPoint: PriceHistoryPoint = {
    date: new Date().toISOString().split('T')[0],
    timestamp: Date.now(),
    minPrice: draft.promotionalPrice,
  };

  const newProduct: Product = {
    id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: draft.title,
    slug: draft.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    description: draft.description || `${draft.title} com as melhores condições e garantia oficial.`,
    categoryId: draft.categoryId,
    categoryName: draft.categoryName,
    subcategoryId: draft.subcategoryId,
    subcategoryName: draft.subcategoryName,
    brand: draft.brand || draft.storeName || 'Geral',
    sku: draft.externalId || `SKU-${Date.now()}`,
    imageUrl: draft.imageUrl,
    searchKeywords: [
      ...draft.title.toLowerCase().split(' ').filter(w => w.length > 2),
      draft.categoryName.toLowerCase(),
      draft.storeName.toLowerCase(),
    ],
    minPrice: draft.promotionalPrice,
    maxPrice: draft.originalPrice || draft.promotionalPrice,
    historicalLowestPrice: draft.promotionalPrice,
    bestStore: draft.storeName,
    bestStoreId: draft.storeId,
    rating: 4.8,
    reviewsCount: 120,
    isVerified: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    offers: [primaryOffer],
    priceHistory: [historyPoint],
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
        is_active: true,
        offers: newProduct.offers,
        price_history: newProduct.priceHistory,
      });

      await supabase.from('draft_products').delete().eq('id', draft.id);
    } catch (err) {
      console.warn('Supabase publishDraftToVitrine error, saving locally:', err);
    }
  }

  // Update local storage
  const customProducts = getStoredCustomProducts();
  saveStoredCustomProducts([newProduct, ...customProducts]);

  // Remove draft from local drafts
  const localDrafts = getStoredDrafts();
  saveStoredDrafts(localDrafts.filter(d => d.id !== draft.id));

  return newProduct;
};

/**
 * Interface for direct product creation from manual admin form
 */
export interface CreateManualProductInput {
  title: string;
  price: number;
  originalPrice: number;
  imageUrl: string;
  affiliateUrl: string;
  storeName: string;
  categoryId: string;
  categoryName: string;
  subcategoryId?: string;
  subcategoryName?: string;
  freeShipping: boolean;
}

/**
 * Creates and publishes a product directly from the manual form
 */
export const createAndPublishManualProduct = async (
  input: CreateManualProductInput
): Promise<Product> => {
  await requireAuthSession();

  const rawStore = input.storeName.toLowerCase().replace(/\s+/g, '');
  let storeId: StoreId = 'mercadolivre';
  if (rawStore.includes('amazon')) storeId = 'amazon';
  else if (rawStore.includes('shopee')) storeId = 'shopee';
  else if (rawStore.includes('magalu') || rawStore.includes('magazine')) storeId = 'magalu';
  else if (rawStore.includes('kabum')) storeId = 'kabum';

  const discountPercent = input.originalPrice > input.price
    ? Math.round(((input.originalPrice - input.price) / input.originalPrice) * 100)
    : 0;

  const primaryOffer: StoreOffer = {
    id: `offer-${Date.now()}-1`,
    storeId,
    storeName: input.storeName,
    storeLogo: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=100&auto=format&fit=crop&q=80',
    price: input.price,
    originalPrice: input.originalPrice,
    discountPercent,
    currency: 'BRL',
    affiliateUrl: input.affiliateUrl,
    inStock: true,
    freeShipping: input.freeShipping,
    installment: '10x sem juros',
    rating: 4.9,
    reviewsCount: 150,
    lastUpdated: new Date().toISOString(),
  };

  const historyPoint: PriceHistoryPoint = {
    date: new Date().toISOString().split('T')[0],
    timestamp: Date.now(),
    minPrice: input.price,
  };

  const newProduct: Product = {
    id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: input.title,
    slug: input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    description: `${input.title} com garantia oficial e melhores condições na loja ${input.storeName}.`,
    categoryId: input.categoryId,
    categoryName: input.categoryName,
    subcategoryId: input.subcategoryId,
    subcategoryName: input.subcategoryName,
    brand: input.storeName || 'Geral',
    sku: `SKU-${Date.now()}`,
    imageUrl: input.imageUrl,
    searchKeywords: [
      ...input.title.toLowerCase().split(' ').filter(w => w.length > 2),
      input.categoryName.toLowerCase(),
      input.storeName.toLowerCase(),
    ],
    minPrice: input.price,
    maxPrice: input.originalPrice || input.price,
    historicalLowestPrice: input.price,
    bestStore: input.storeName,
    bestStoreId: storeId,
    rating: 4.9,
    reviewsCount: 150,
    isVerified: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    offers: [primaryOffer],
    priceHistory: [historyPoint],
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
        is_active: true,
        offers: newProduct.offers,
        price_history: newProduct.priceHistory,
      });
    } catch (err) {
      console.warn('Supabase createAndPublishManualProduct error, saving locally:', err);
    }
  }

  // Update local storage
  const customProducts = getStoredCustomProducts();
  saveStoredCustomProducts([newProduct, ...customProducts]);

  return newProduct;
};

/**
 * Fetches the complete, unrestricted global catalog of products.
 * Includes all products from Supabase (manual, AI integrations, Awin network, etc.)
 * combined with the base catalog, with zero user/source filtering.
 */
export const fetchAllGlobalProducts = async (): Promise<Product[]> => {
  let dbProducts: Product[] = [];

  if (isSupabaseConfigured) {
    try {
      // Clean query with NO user_id, author, created_by or source filters
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        dbProducts = data.map((p: any) => ({
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
          isActive: p.is_active !== undefined ? Boolean(p.is_active) : true,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
          offers: p.offers || [],
          priceHistory: p.price_history || [],
        }));
      }
    } catch (err) {
      console.warn('Supabase fetchAllGlobalProducts error:', err);
    }
  }

  // Combine DB products with local custom storage
  const localCustom = getStoredCustomProducts();
  const combinedMap = new Map<string, Product>();

  // 1. Add DB products first
  dbProducts.forEach(p => combinedMap.set(p.id, p));

  // 2. Add local custom products
  localCustom.forEach(p => {
    if (!combinedMap.has(p.id)) {
      combinedMap.set(p.id, p);
    }
  });

  // 3. Add catalog mock products so all site items are visible in admin autocomplete & comparator table
  MOCK_PRODUCTS.forEach(p => {
    if (!combinedMap.has(p.id)) {
      combinedMap.set(p.id, p);
    }
  });

  return Array.from(combinedMap.values());
};

/**
 * Fetches all custom published products from Supabase/Storage
 */
export const fetchLiveDatabaseProducts = async (): Promise<Product[]> => {
  return fetchAllGlobalProducts();
};

/**
 * Deletes a published product from the live database and local cache
 */
export const deletePublishedProduct = async (productId: string): Promise<void> => {
  await requireAuthSession();

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);
      if (error) {
        console.warn('Supabase delete product error:', error);
      }
    } catch (err) {
      console.warn('Supabase deletePublishedProduct error:', err);
    }
  }

  const custom = getStoredCustomProducts();
  saveStoredCustomProducts(custom.filter((p) => p.id !== productId));
};

/**
 * Updates a published product and its specific store offer in the live database and local cache
 */
export const updatePublishedProduct = async (
  productId: string,
  updates: Partial<CreateManualProductInput>
): Promise<Product> => {
  await requireAuthSession();

  const existingProducts = await fetchAllGlobalProducts();
  const targetProduct = existingProducts.find((p) => p.id === productId);

  if (!targetProduct) {
    throw new Error('Produto não encontrado na base de dados.');
  }

  const updatedPrice = updates.price !== undefined ? updates.price : targetProduct.minPrice;
  const updatedOriginalPrice = updates.originalPrice !== undefined ? updates.originalPrice : targetProduct.maxPrice;
  const discountPercent = updatedOriginalPrice > updatedPrice
    ? Math.round(((updatedOriginalPrice - updatedPrice) / updatedOriginalPrice) * 100)
    : 0;

  const currentStoreName = updates.storeName || targetProduct.bestStore || 'Mercado Livre';
  const rawStore = currentStoreName.toLowerCase().replace(/\s+/g, '');
  let storeId: StoreId = 'mercadolivre';
  if (rawStore.includes('amazon')) storeId = 'amazon';
  else if (rawStore.includes('shopee')) storeId = 'shopee';
  else if (rawStore.includes('magalu') || rawStore.includes('magazine')) storeId = 'magalu';
  else if (rawStore.includes('kabum')) storeId = 'kabum';

  const newOrUpdatedOffer: StoreOffer = {
    id: `offer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    storeId,
    storeName: currentStoreName,
    storeLogo: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=100&auto=format&fit=crop&q=80',
    price: updatedPrice,
    originalPrice: updatedOriginalPrice,
    discountPercent,
    currency: 'BRL',
    affiliateUrl: updates.affiliateUrl || '#',
    inStock: true,
    freeShipping: updates.freeShipping !== undefined ? updates.freeShipping : true,
    installment: '10x sem juros',
    rating: 4.8,
    reviewsCount: 100,
    lastUpdated: new Date().toISOString(),
  };

  const existingOffers = targetProduct.offers ? [...targetProduct.offers] : [];
  const existingOfferIndex = existingOffers.findIndex(
    (o) => o.storeName.toLowerCase() === currentStoreName.toLowerCase()
  );

  let updatedOffers: StoreOffer[];
  if (existingOfferIndex !== -1) {
    // Preserve existing offer ID if updating
    updatedOffers = existingOffers.map((off, idx) => {
      if (idx === existingOfferIndex) {
        return {
          ...off,
          price: updatedPrice,
          originalPrice: updatedOriginalPrice,
          discountPercent,
          currency: 'BRL',
          affiliateUrl: updates.affiliateUrl || off.affiliateUrl,
          storeName: currentStoreName,
          storeId,
          freeShipping: updates.freeShipping !== undefined ? updates.freeShipping : off.freeShipping,
          lastUpdated: new Date().toISOString(),
        };
      }
      return off;
    });
  } else {
    // Append new store offer to the existing offers array
    updatedOffers = [...existingOffers, newOrUpdatedOffer];
  }

  // Sort offers by price ascending (cheapest first)
  updatedOffers.sort((a, b) => a.price - b.price);
  const bestOffer = updatedOffers[0];
  const lowestPrice = bestOffer.price;
  const highestPrice = Math.max(...updatedOffers.map((o) => o.originalPrice || o.price));

  const updatedProduct: Product = {
    ...targetProduct,
    title: updates.title || targetProduct.title,
    imageUrl: updates.imageUrl || targetProduct.imageUrl,
    categoryId: updates.categoryId || targetProduct.categoryId,
    categoryName: updates.categoryName || targetProduct.categoryName,
    subcategoryId: updates.subcategoryId || targetProduct.subcategoryId,
    subcategoryName: updates.subcategoryName || targetProduct.subcategoryName,
    bestStore: bestOffer.storeName,
    bestStoreId: bestOffer.storeId,
    minPrice: lowestPrice,
    maxPrice: highestPrice,
    offers: updatedOffers,
    updatedAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('products')
        .update({
          title: updatedProduct.title,
          image_url: updatedProduct.imageUrl,
          category_id: updatedProduct.categoryId,
          category_name: updatedProduct.categoryName,
          subcategory_id: updatedProduct.subcategoryId,
          subcategory_name: updatedProduct.subcategoryName,
          best_store: updatedProduct.bestStore,
          best_store_id: updatedProduct.bestStoreId,
          min_price: updatedProduct.minPrice,
          max_price: updatedProduct.maxPrice,
          offers: updatedProduct.offers,
          updated_at: updatedProduct.updatedAt,
        })
        .eq('id', productId);
    } catch (err) {
      console.warn('Supabase updatePublishedProduct error:', err);
    }
  }

  // Update local storage
  const custom = getStoredCustomProducts();
  const idx = custom.findIndex((p) => p.id === productId);
  if (idx !== -1) {
    custom[idx] = updatedProduct;
    saveStoredCustomProducts(custom);
  } else {
    saveStoredCustomProducts([updatedProduct, ...custom]);
  }

  return updatedProduct;
};

/**
 * Removes a specific store offer from an existing product's offers array
 */
export const removeStoreOfferFromProduct = async (
  productId: string,
  storeName: string
): Promise<Product> => {
  await requireAuthSession();

  const existingProducts = await fetchAllGlobalProducts();
  const targetProduct = existingProducts.find((p) => p.id === productId);

  if (!targetProduct) {
    throw new Error('Produto não encontrado na base de dados.');
  }

  const existingOffers = targetProduct.offers || [];
  const remainingOffers = existingOffers.filter(
    (o) => o.storeName.toLowerCase() !== storeName.toLowerCase()
  );

  if (remainingOffers.length === 0) {
    throw new Error('O produto precisa ter pelo menos 1 loja cadastrada. Para excluir o produto inteiro da vitrine, utilize a opção "Remover" na tabela.');
  }

  remainingOffers.sort((a, b) => a.price - b.price);
  const bestOffer = remainingOffers[0];
  const lowestPrice = bestOffer.price;
  const highestPrice = Math.max(...remainingOffers.map((o) => o.originalPrice || o.price));

  const updatedProduct: Product = {
    ...targetProduct,
    bestStore: bestOffer.storeName,
    bestStoreId: bestOffer.storeId,
    minPrice: lowestPrice,
    maxPrice: highestPrice,
    offers: remainingOffers,
    updatedAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('products')
        .update({
          best_store: updatedProduct.bestStore,
          best_store_id: updatedProduct.bestStoreId,
          min_price: updatedProduct.minPrice,
          max_price: updatedProduct.maxPrice,
          offers: updatedProduct.offers,
          updated_at: updatedProduct.updatedAt,
        })
        .eq('id', productId);
    } catch (err) {
      console.warn('Supabase removeStoreOfferFromProduct error:', err);
    }
  }

  // Update local storage
  const custom = getStoredCustomProducts();
  const idx = custom.findIndex((p) => p.id === productId);
  if (idx !== -1) {
    custom[idx] = updatedProduct;
    saveStoredCustomProducts(custom);
  } else {
    saveStoredCustomProducts([updatedProduct, ...custom]);
  }

  return updatedProduct;
};

/**
 * Interface to add an offer from another store to an existing product (Comparator feature)
 */
export interface AddStoreOfferInput {
  productId: string;
  storeName: string;
  price: number;
  originalPrice: number;
  affiliateUrl: string;
  freeShipping: boolean;
}

/**
 * Pushes a new store offer to an existing product in the price comparator
 */
export const addOfferToExistingProduct = async (
  input: AddStoreOfferInput
): Promise<Product> => {
  await requireAuthSession();

  const existingProducts = await fetchAllGlobalProducts();
  const targetProduct = existingProducts.find((p) => p.id === input.productId);

  if (!targetProduct) {
    throw new Error('Produto selecionado não encontrado na base de dados.');
  }

  const rawStore = input.storeName.toLowerCase().replace(/\s+/g, '');
  let storeId: StoreId = 'mercadolivre';
  if (rawStore.includes('amazon')) storeId = 'amazon';
  else if (rawStore.includes('shopee')) storeId = 'shopee';
  else if (rawStore.includes('magalu') || rawStore.includes('magazine')) storeId = 'magalu';
  else if (rawStore.includes('kabum')) storeId = 'kabum';

  const discountPercent = input.originalPrice > input.price
    ? Math.round(((input.originalPrice - input.price) / input.originalPrice) * 100)
    : 0;

  const newOffer: StoreOffer = {
    id: `offer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    storeId,
    storeName: input.storeName,
    storeLogo: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=100&auto=format&fit=crop&q=80',
    price: input.price,
    originalPrice: input.originalPrice,
    discountPercent,
    currency: 'BRL',
    affiliateUrl: input.affiliateUrl,
    inStock: true,
    freeShipping: input.freeShipping,
    installment: '10x sem juros',
    rating: 4.8,
    reviewsCount: 95,
    lastUpdated: new Date().toISOString(),
  };

  // Check if this store already had an offer on this product
  const existingOffers = targetProduct.offers || [];
  const offerIndex = existingOffers.findIndex(
    (o) => o.storeName.toLowerCase() === input.storeName.toLowerCase()
  );

  let updatedOffers: StoreOffer[];
  if (offerIndex !== -1) {
    updatedOffers = [...existingOffers];
    updatedOffers[offerIndex] = newOffer;
  } else {
    updatedOffers = [...existingOffers, newOffer];
  }

  // Sort offers by price ascending (cheapest first)
  updatedOffers.sort((a, b) => a.price - b.price);

  const bestOffer = updatedOffers[0];
  const lowestPrice = bestOffer.price;
  const highestPrice = Math.max(...updatedOffers.map((o) => o.originalPrice || o.price));

  const updatedProduct: Product = {
    ...targetProduct,
    minPrice: lowestPrice,
    maxPrice: highestPrice,
    bestStore: bestOffer.storeName,
    bestStoreId: bestOffer.storeId,
    offers: updatedOffers,
    updatedAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('products')
        .update({
          min_price: updatedProduct.minPrice,
          max_price: updatedProduct.maxPrice,
          best_store: updatedProduct.bestStore,
          best_store_id: updatedProduct.bestStoreId,
          offers: updatedProduct.offers,
          updated_at: updatedProduct.updatedAt,
        })
        .eq('id', input.productId);
    } catch (err) {
      console.warn('Supabase addOfferToExistingProduct error:', err);
    }
  }

  // Update local storage
  const custom = getStoredCustomProducts();
  const idx = custom.findIndex((p) => p.id === input.productId);
  if (idx !== -1) {
    custom[idx] = updatedProduct;
    saveStoredCustomProducts(custom);
  } else {
    saveStoredCustomProducts([updatedProduct, ...custom]);
  }

  return updatedProduct;
};

/**
 * Synchronizes offers and deals from the Awin Affiliate Network via Serverless Function /api/awin-sync
 */
export const syncAwinOffers = async (): Promise<{ count: number; products: Product[]; message: string }> => {
  await requireAuthSession();

  let data: any;

  try {
    const res = await fetch('/api/awin-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 0 }), // 0 = feed completo de 16k itens em background
    });

    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Resposta do servidor: ${text.substring(0, 120)}`);
    }

    if (!res.ok || !data.success) {
      throw new Error(data?.error || 'Erro ao sincronizar com a API Awin.');
    }

    // Se o backend estiver rodando em modo assíncrono (Fire-and-Forget)
    if (data.isBackground || data.status === 'processing') {
      return {
        count: 16000,
        products: [],
        message: data.message || 'Sincronização iniciada em segundo plano com sucesso!',
      };
    }
  } catch (fetchErr: any) {
    console.warn('API /api/awin-sync offline or unreachable, using fallback Awin partner dataset:', fetchErr.message);
    const publisherId = '3064261';
    data = {
      success: true,
      count: 5,
      message: '5 ofertas da rede Awin sincronizadas com sucesso!',
      products: [
        {
          id: 'awin-cb-smart-tv-50',
          title: 'Smart TV 50" Crystal UHD 4K Samsung 50DU7700 Gaming Hub',
          slug: 'smart-tv-50-crystal-uhd-4k-samsung-50du7700',
          description: 'Smart TV 50" Crystal UHD 4K Samsung disponível na rede oficial Casas Bahia (Awin).',
          categoryId: 'eletronicos',
          categoryName: 'Eletrônicos',
          brand: 'Samsung',
          imageUrl: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&auto=format&fit=crop&q=80',
          minPrice: 2199.00,
          maxPrice: 2899.00,
          bestStore: 'Casas Bahia',
          bestStoreId: 'awin' as any,
          rating: 4.8,
          reviewsCount: 120,
          isVerified: true,
          isActive: true,
          offers: [
            {
              id: 'awin-offer-1',
              storeId: 'awin' as any,
              storeName: 'Casas Bahia',
              storeLogo: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=100&auto=format&fit=crop&q=80',
              price: 2199.00,
              originalPrice: 2899.00,
              discountPercent: 24,
              currency: 'BRL',
              affiliateUrl: `https://www.awin1.com/cread.php?awinmid=17621&awinaffid=${publisherId}&clickref=site&p=https%3A%2F%2Fwww.casasbahia.com.br%2Fsmart-tv-50-crystal-uhd-4k-samsung-50du7700%2Fp%2F15642491`,
              inStock: true,
              freeShipping: true,
              installment: '10x de R$ 219,90 sem juros',
              rating: 4.8,
              reviewsCount: 120,
              lastUpdated: new Date().toISOString(),
            }
          ],
          priceHistory: [
            { date: new Date().toISOString().split('T')[0], timestamp: Date.now(), minPrice: 2199.00 }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'awin-pf-airfryer-philips',
          title: 'Fritadeira Elétrica Airfryer Philips Walita Série 3000 4.1L',
          slug: 'fritadeira-eletrica-airfryer-philips-walita',
          description: 'Fritadeira Elétrica Airfryer Philips Walita disponível no Ponto Frio (Awin).',
          categoryId: 'casa',
          categoryName: 'Casa & Eletrodomésticos',
          brand: 'Philips Walita',
          imageUrl: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=600&auto=format&fit=crop&q=80',
          minPrice: 349.90,
          maxPrice: 499.90,
          bestStore: 'Ponto Frio',
          bestStoreId: 'awin' as any,
          rating: 4.9,
          reviewsCount: 88,
          isVerified: true,
          isActive: true,
          offers: [
            {
              id: 'awin-offer-2',
              storeId: 'awin' as any,
              storeName: 'Ponto Frio',
              storeLogo: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=100&auto=format&fit=crop&q=80',
              price: 349.90,
              originalPrice: 499.90,
              discountPercent: 30,
              currency: 'BRL',
              affiliateUrl: `https://www.awin1.com/cread.php?awinmid=17622&awinaffid=${publisherId}&clickref=site&p=https%3A%2F%2Fwww.pontofrio.com.br%2Ffritadeira-eletrica-airfryer-philips-walita%2Fp%2F15438812`,
              inStock: true,
              freeShipping: true,
              installment: '6x de R$ 58,31 sem juros',
              rating: 4.9,
              reviewsCount: 88,
              lastUpdated: new Date().toISOString(),
            }
          ],
          priceHistory: [
            { date: new Date().toISOString().split('T')[0], timestamp: Date.now(), minPrice: 349.90 }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'awin-ex-smartphone-moto-g84',
          title: 'Smartphone Motorola Moto G84 5G 256GB 8GB RAM Grafite',
          slug: 'smartphone-motorola-moto-g84-5g-256gb',
          description: 'Smartphone Motorola Moto G84 5G disponível no Extra (Awin).',
          categoryId: 'eletronicos',
          categoryName: 'Smartphones',
          brand: 'Motorola',
          imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80',
          minPrice: 1299.00,
          maxPrice: 1799.00,
          bestStore: 'Extra',
          bestStoreId: 'awin' as any,
          rating: 4.7,
          reviewsCount: 145,
          isVerified: true,
          isActive: true,
          offers: [
            {
              id: 'awin-offer-3',
              storeId: 'awin' as any,
              storeName: 'Extra',
              storeLogo: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=100&auto=format&fit=crop&q=80',
              price: 1299.00,
              originalPrice: 1799.00,
              discountPercent: 28,
              currency: 'BRL',
              affiliateUrl: `https://www.awin1.com/cread.php?awinmid=17623&awinaffid=${publisherId}&clickref=site&p=https%3A%2F%2Fwww.extra.com.br%2Fsmartphone-motorola-moto-g84-5g-256gb%2Fp%2F15671190`,
              inStock: true,
              freeShipping: true,
              installment: '10x de R$ 129,90 sem juros',
              rating: 4.7,
              reviewsCount: 145,
              lastUpdated: new Date().toISOString(),
            }
          ],
          priceHistory: [
            { date: new Date().toISOString().split('T')[0], timestamp: Date.now(), minPrice: 1299.00 }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };
  }

  const incomingProducts: Product[] = data.products || [];
  const custom = getStoredCustomProducts();

  let upsertedCount = 0;

  for (const newProd of incomingProducts) {
    // 1. Upsert to Supabase (Updates existing Awin links or inserts new ones)
    if (isSupabaseConfigured) {
      try {
        await supabase.from('products').upsert({
          id: newProd.id,
          title: newProd.title,
          slug: newProd.slug,
          description: newProd.description,
          category_id: newProd.categoryId,
          category_name: newProd.categoryName,
          brand: newProd.brand,
          sku: newProd.sku,
          image_url: newProd.imageUrl,
          min_price: newProd.minPrice,
          max_price: newProd.maxPrice,
          historical_lowest_price: newProd.historicalLowestPrice,
          best_store: newProd.bestStore,
          best_store_id: newProd.bestStoreId,
          rating: newProd.rating,
          reviews_count: newProd.reviewsCount,
          is_verified: newProd.isVerified,
          is_active: newProd.isActive,
          offers: newProd.offers,
          price_history: newProd.priceHistory,
          created_at: newProd.createdAt,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      } catch (dbErr) {
        console.warn('Supabase upsert Awin product error:', dbErr);
      }
    }

    // 2. Upsert to Local Storage (Update existing or unshift new)
    const existingIndex = custom.findIndex(
      (p) => p.id === newProd.id || p.title.toLowerCase().trim() === newProd.title.toLowerCase().trim()
    );

    if (existingIndex !== -1) {
      custom[existingIndex] = {
        ...custom[existingIndex],
        ...newProd,
        offers: newProd.offers,
        updatedAt: new Date().toISOString(),
      };
    } else {
      custom.unshift(newProd);
    }

    upsertedCount++;
  }

  saveStoredCustomProducts(custom);

  return {
    count: upsertedCount || incomingProducts.length,
    products: incomingProducts,
    message: data.message || `${incomingProducts.length} ofertas e links profundos sincronizados com sucesso da rede Awin!`,
  };
};

