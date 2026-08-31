export type StoreId = 'amazon' | 'mercadolivre' | 'shopee' | 'magalu' | 'kabum';

export interface Store {
  id: StoreId;
  name: string;
  logo: string;
  accentColor: string;
  badgeBg: string;
  affiliateTag: string;
}

export interface StoreOffer {
  id: string;
  storeId: StoreId;
  storeName: string;
  storeLogo: string;
  price: number;
  originalPrice: number;
  discountPercent: number;
  currency: string;
  affiliateUrl: string;
  inStock: boolean;
  freeShipping: boolean;
  installment: string;
  couponCode?: string;
  couponDiscount?: number;
  rating: number;
  reviewsCount: number;
  lastUpdated: string;
}

export interface PriceHistoryPoint {
  date: string;
  timestamp: number;
  amazonPrice?: number;
  mercadolivrePrice?: number;
  shopeePrice?: number;
  magaluPrice?: number;
  kabumPrice?: number;
  minPrice: number;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  categoryId: string;
  categoryName: string;
  subcategoryId?: string;
  subcategoryName?: string;
  brand: string;
  sku: string;
  ean?: string;
  imageUrl: string;
  galleryUrls?: string[];
  searchKeywords: string[];
  minPrice: number;
  maxPrice: number;
  historicalLowestPrice: number;
  bestStore: string;
  bestStoreId: StoreId;
  offers: StoreOffer[];
  priceHistory: PriceHistoryPoint[];
  rating: number;
  reviewsCount: number;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  title: string;
  description: string;
  storeId: StoreId;
  storeName: string;
  storeLogo: string;
  discountType: 'percentage' | 'fixed' | 'shipping';
  discountValue: number;
  minPurchase: number;
  affiliateUrl: string;
  categoryId?: string;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  isExclusive: boolean;
  isVerified: boolean;
  usageCount: number;
  successRate: number;
  verifiedAt: string;
}

// 3-Level Hierarchical Tree
export interface SubcategoryNode {
  id: string;
  name: string;
  slug: string;
  itemCount: number;
  brands: string[];
}

export interface CategoryPromoBanner {
  title: string;
  subtitle: string;
  badge: string;
  imageUrl: string;
  actionText: string;
}

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  icon: string;
  itemCount: number;
  subcategories: SubcategoryNode[];
  promoBanner?: CategoryPromoBanner;
}

export interface PriceAlert {
  id: string;
  userId: string;
  userEmail: string;
  productId: string;
  productTitle: string;
  targetPrice?: number | null;
  currentMinPrice: number;
  notifyOnAnyDrop?: boolean;
  createdAt: string;
  isActive: boolean;
}

export interface SearchState {
  rawQuery: string;
  sanitizedQuery: string;
  correctedQuery: string | null;
  selectedCategory: string;
  selectedSubcategory?: string;
  selectedBrands: string[];
  selectedStores: StoreId[];
  minPrice?: number;
  maxPrice?: number;
  onlyFreeShipping?: boolean;
  onlyWithCoupons?: boolean;
  minRating?: number;
  sortBy: 'relevance' | 'price_asc' | 'price_desc' | 'discount_desc' | 'rating_desc';
}

export interface DraftProduct {
  id: string;
  externalId?: string;
  title: string;
  brand: string;
  description: string;
  categoryId: string;
  categoryName: string;
  subcategoryId?: string;
  subcategoryName?: string;
  imageUrl: string;
  originalPrice: number;
  promotionalPrice: number;
  discountPercent: number;
  affiliateUrl: string;
  storeId: StoreId;
  storeName: string;
  freeShipping: boolean;
  installment: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

