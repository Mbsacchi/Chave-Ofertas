import Fuse, { IFuseOptions } from 'fuse.js';
import { Product, SearchState, StoreId } from '../../types';
import { sanitizeSearchQuery } from '../security/sanitizer';
import { checkAndCorrectTypos } from './typoDictionary';

export interface SearchResult {
  product: Product;
  score?: number;
  effectivePrice: number;
}

/**
 * Fuse.js configuration with single character support and threshold 0.4
 */
const FUSE_OPTIONS: IFuseOptions<Product> = {
  keys: [
    { name: 'title', weight: 0.4 },
    { name: 'categoryName', weight: 0.2 },
    { name: 'subcategoryName', weight: 0.15 },
    { name: 'brand', weight: 0.15 },
    { name: 'searchKeywords', weight: 0.1 },
    { name: 'description', weight: 0.05 },
  ],
  threshold: 0.4, // Adjusted sensitivity to prevent empty results on single letters / quick typing
  ignoreLocation: true,
  minMatchCharLength: 1, // Allow 1-character matching
  includeScore: true,
  findAllMatches: true,
};

function getEffectivePrice(product: Product, selectedStores?: StoreId[]): number {
  if (selectedStores && selectedStores.length > 0) {
    const matchingOffers = product.offers.filter((off) => selectedStores.includes(off.storeId));
    if (matchingOffers.length > 0) {
      return Math.min(...matchingOffers.map((o) => o.price));
    }
  }
  return product.minPrice;
}

/**
 * Executes Fuzzy Search using Fuse.js combined with Mega Menu categories & Filter Sidebar
 */
export function executeFuzzySearch(
  products: Product[],
  state: SearchState
): {
  results: Product[];
  totalMatches: number;
  correctionNotice: { hasCorrection: boolean; correctedQuery: string } | null;
} {
  // 1. Filter candidates by category, subcategory, brand, store, price, shipping, coupons, rating
  const filteredCandidates = products.filter((product) => {
    // Category (Level 1 from Mega Menu)
    if (state.selectedCategory && state.selectedCategory !== 'all') {
      if (product.categoryId !== state.selectedCategory) return false;
    }

    // Subcategory (Level 2 from Mega Menu)
    if (state.selectedSubcategory) {
      if (product.subcategoryId !== state.selectedSubcategory) return false;
    }

    // Multi-Brand checkboxes (Filter Sidebar)
    if (state.selectedBrands && state.selectedBrands.length > 0) {
      const normBrand = product.brand.toLowerCase();
      const matchesAnyBrand = state.selectedBrands.some((b) => {
        const normSelected = b.toLowerCase();
        return normBrand.includes(normSelected) || normSelected.includes(normBrand);
      });
      if (!matchesAnyBrand) return false;
    }

    // Multi-Store checkboxes (Filter Sidebar)
    if (state.selectedStores && state.selectedStores.length > 0) {
      const hasAnySelectedStore = product.offers.some((off) => state.selectedStores.includes(off.storeId));
      if (!hasAnySelectedStore) return false;
    }

    // Price filters
    const effectivePrice = getEffectivePrice(product, state.selectedStores);
    if (state.minPrice !== undefined && state.minPrice > 0 && effectivePrice < state.minPrice) return false;
    if (state.maxPrice !== undefined && state.maxPrice > 0 && effectivePrice > state.maxPrice) return false;

    // Free shipping
    if (state.onlyFreeShipping) {
      const hasFree = product.offers.some((off) => off.freeShipping);
      if (!hasFree) return false;
    }

    // Coupons
    if (state.onlyWithCoupons) {
      const hasCoupon = product.offers.some((off) => !!off.couponCode);
      if (!hasCoupon) return false;
    }

    // Min Rating
    if (state.minRating !== undefined && state.minRating > 0 && product.rating < state.minRating) {
      return false;
    }

    return true;
  });

  const sanitized = sanitizeSearchQuery(state.rawQuery || '').trim();
  const typoCheck = sanitized ? checkAndCorrectTypos(sanitized) : { hasCorrection: false, correctedQuery: sanitized };

  let matchedProducts: Product[] = [];

  if (!sanitized) {
    // If search query is empty, return normal filtered list
    matchedProducts = [...filteredCandidates];
  } else if (sanitized.length === 1) {
    // Fallback for single-character queries: native .filter() to never zero results
    const char = sanitized.toLowerCase();
    matchedProducts = filteredCandidates.filter((p) => {
      const inTitle = p.title.toLowerCase().includes(char);
      const inBrand = p.brand.toLowerCase().includes(char);
      const inCat = p.categoryName.toLowerCase().includes(char);
      const inKeywords = p.searchKeywords.some((k) => k.toLowerCase().includes(char));
      return inTitle || inBrand || inCat || inKeywords;
    });

    // If still empty (rare), try fuse.search as backup
    if (matchedProducts.length === 0) {
      const fuse = new Fuse(filteredCandidates, FUSE_OPTIONS);
      matchedProducts = fuse.search(sanitized).map((r) => r.item);
    }
  } else {
    // Multi-character queries: execute Fuse.js fuzzy search
    const fuse = new Fuse(filteredCandidates, FUSE_OPTIONS);
    let fuseResults = fuse.search(sanitized);

    // If no direct results and typo correction is detected, search with corrected term
    if (fuseResults.length === 0 && typoCheck.hasCorrection) {
      fuseResults = fuse.search(typoCheck.correctedQuery);
    }

    // Fallback if fuse returned 0: native substring / token match
    if (fuseResults.length === 0) {
      const tokens = sanitized.toLowerCase().split(/\s+/).filter(Boolean);
      matchedProducts = filteredCandidates.filter((p) => {
        const fullText = `${p.title} ${p.brand} ${p.categoryName} ${p.searchKeywords.join(' ')}`.toLowerCase();
        return tokens.some((t) => fullText.includes(t));
      });
    } else {
      matchedProducts = fuseResults.map((r) => r.item);
    }
  }

  // Apply Sorting
  matchedProducts.sort((a, b) => {
    const priceA = getEffectivePrice(a, state.selectedStores);
    const priceB = getEffectivePrice(b, state.selectedStores);

    switch (state.sortBy) {
      case 'price_asc':
        return priceA - priceB;
      case 'price_desc':
        return priceB - priceA;
      case 'discount_desc': {
        const discA = a.offers[0]?.discountPercent || 0;
        const discB = b.offers[0]?.discountPercent || 0;
        return discB - discA;
      }
      case 'rating_desc':
        return b.rating - a.rating;
      case 'relevance':
      default:
        if (!sanitized) {
          // Default sorting when no query: higher rating and review count
          return (b.rating * 10 + Math.min(b.reviewsCount / 100, 20)) - (a.rating * 10 + Math.min(a.reviewsCount / 100, 20));
        }
        // When searching, preserve Fuse.js relevance ranking
        return 0;
    }
  });

  return {
    results: matchedProducts,
    totalMatches: matchedProducts.length,
    correctionNotice: typoCheck.hasCorrection
      ? { hasCorrection: true, correctedQuery: typoCheck.correctedQuery }
      : null,
  };
}
