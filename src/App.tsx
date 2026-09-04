import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { MegaMenu } from './components/MegaMenu';
import { SearchBar } from './components/SearchBar';
import { FilterSidebar } from './components/FilterSidebar';
import { ProductCard } from './components/ProductCard';
import { CouponCard } from './components/CouponCard';
import { Pagination } from './components/Pagination';
import { PriceComparisonModal } from './components/PriceComparisonModal';
import { PriceAlertModal } from './components/PriceAlertModal';
import { AuthModal } from './components/AuthModal';
import { AdSensePlaceholder } from './components/AdSensePlaceholder';
import { SeoFooterContent } from './components/SeoFooterContent';
import { Footer } from './components/Footer';
import { SortDropdown } from './components/SortDropdown';
import { AdminPanel, ALLOWED_ADMIN_EMAILS } from './components/AdminPanel';
import { MOCK_PRODUCTS, CATEGORIES_TREE } from './data/mockData';
import { executeFuzzySearch } from './lib/search/fuzzySearch';
import { groupAndConsolidateProducts } from './lib/comparator/productGrouper';
import { Product, StoreId, SearchState, Coupon } from './types';
import { fetchLiveDatabaseProducts } from './services/adminService';
import { fetchActiveCoupons } from './services/couponService';
import { useAuth } from './context/AuthContext';
import { useBodyScrollLock } from './lib/hooks/useBodyScrollLock';
import { useHardwareBackNavigation } from './lib/hooks/useHardwareBackNavigation';
import {
  Tag,
  Zap,
  Heart,
  Flame,
  ChevronRight,
  X,
  SlidersHorizontal,
  ArrowLeft
} from 'lucide-react';

const ITEMS_PER_PAGE = 16;

export const AppContent: React.FC = () => {
  const { user, favorites, showAuthModal, closeAuthModal } = useAuth();
  const productSectionRef = useRef<HTMLDivElement>(null);

  // Admin View State & Route Sync
  const [viewMode, setViewMode] = useState<'vitrine' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname.startsWith('/admin') || window.location.hash === '#admin'
        ? 'admin'
        : 'vitrine';
    }
    return 'vitrine';
  });

  const isAdminUser = Boolean(
    user?.email &&
    ALLOWED_ADMIN_EMAILS.includes(user.email.trim().toLowerCase())
  );

  // Proteção da rota /admin: Redireciona usuários comuns para a vitrine sem destruir a sessão
  useEffect(() => {
    if (viewMode === 'admin' && user && !isAdminUser) {
      window.history.replaceState({}, '', '/');
      setViewMode('vitrine');
    }
  }, [viewMode, user, isAdminUser]);

  // Fechamento automático do popup caso esta tela tenha sido carregada dentro da janela de autenticação
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      ((window.opener && window.opener !== window) ||
        window.name === 'supabase-google-auth-popup')
    ) {
      if (window.opener && window.opener !== window) {
        try {
          window.opener.postMessage(
            { type: 'SUPABASE_AUTH_SUCCESS', user },
            window.location.origin
          );
        } catch {}
      }
      window.close();
    }
  }, [user]);

  // Dynamic Live Database Products
  const [liveCustomProducts, setLiveCustomProducts] = useState<Product[]>([]);
  // Dynamic Real Coupons from Supabase (sem mock)
  const [realCoupons, setRealCoupons] = useState<Coupon[]>([]);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      const isAdmin = window.location.pathname.startsWith('/admin') || window.location.hash === '#admin';
      setViewMode(isAdmin ? 'admin' : 'vitrine');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch products and real coupons from database on initial load
  useEffect(() => {
    let isMounted = true;

    const loadDbData = async () => {
      try {
        const dbProds = await fetchLiveDatabaseProducts();
        if (isMounted) setLiveCustomProducts(dbProds);
      } catch (err) {
        console.warn('Erro ao carregar produtos do banco:', err);
      }

      try {
        if (isMounted) setIsLoadingCoupons(true);
        const couponsData = await fetchActiveCoupons();
        if (isMounted) setRealCoupons(couponsData);
      } catch (err) {
        console.warn('Erro ao carregar cupons reais do banco:', err);
      } finally {
        if (isMounted) setIsLoadingCoupons(false);
      }
    };

    loadDbData();

    return () => {
      isMounted = false;
    };
  }, []);

  const navigateToAdmin = () => {
    window.history.pushState({}, '', '/admin');
    setViewMode('admin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToVitrine = () => {
    window.history.pushState({}, '', '/');
    setViewMode('vitrine');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProductPublished = (newProd: Product) => {
    setLiveCustomProducts(prev => [newProd, ...prev]);
  };

  // Combined product catalog with Multi-Store Comparator Consolidation (EAN, SKU, Slug)
  const allProducts = useMemo(() => {
    let rawList: Product[];
    if (liveCustomProducts.length === 0) {
      rawList = MOCK_PRODUCTS;
    } else {
      const existingIds = new Set(liveCustomProducts.map(p => p.id));
      const remainingMock = MOCK_PRODUCTS.filter(p => !existingIds.has(p.id));
      rawList = [...liveCustomProducts, ...remainingMock];
    }
    return groupAndConsolidateProducts(rawList);
  }, [liveCustomProducts]);

  // Trending products ordered by clickCount descending for the '🔥 Em Alta' showcase
  const trendingProducts = useMemo(() => {
    return [...allProducts]
      .sort((a, b) => (b.clickCount || 0) - (a.clickCount || 0))
      .slice(0, 4);
  }, [allProducts]);

  // Search & Navigation State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | undefined>(undefined);

  // Filter Sidebar State
  const [selectedStores, setSelectedStores] = useState<StoreId[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [onlyFreeShipping, setOnlyFreeShipping] = useState(false);
  const [onlyWithCoupons, setOnlyWithCoupons] = useState(false);
  const [minRating, setMinRating] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<SearchState['sortBy']>('relevance');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'all' | 'coupons' | 'favorites'>('all');

  // Mobile Drawer & Bottom Sheet states
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Modals
  const [comparingProduct, setComparingProduct] = useState<Product | null>(null);
  const [alertProduct, setAlertProduct] = useState<Product | null>(null);

  const handleOpenProduct = (prod: Product) => {
    setComparingProduct(prod);
    const slug = prod.slug || prod.id;
    if (slug) {
      window.history.pushState({ slug }, '', `/produto/${slug}`);
    }
  };

  const handleCloseProduct = () => {
    setComparingProduct(null);
    if (window.location.pathname.startsWith('/produto/')) {
      window.history.pushState({}, '', '/');
    }
  };

  // Sincronização de URL deep-linking e popstate para /produto/[slug]
  useEffect(() => {
    const handleProductRoute = () => {
      const pathname = window.location.pathname;
      if (pathname.startsWith('/produto/')) {
        const slug = pathname.replace(/^\/produto\//, '').replace(/\/$/, '');
        const matched = allProducts.find((p) => p.slug === slug || p.id === slug);
        if (matched) {
          setComparingProduct(matched);
        }
      }
    };

    window.addEventListener('popstate', handleProductRoute);
    handleProductRoute();

    return () => window.removeEventListener('popstate', handleProductRoute);
  }, [allProducts]);

  // Lock body scroll whenever any drawer, bottom sheet, or modal is open
  const isAnyOverlayOpen =
    isMobileDrawerOpen ||
    isMobileFilterOpen ||
    Boolean(comparingProduct) ||
    Boolean(alertProduct) ||
    showAuthModal;

  useBodyScrollLock(isAnyOverlayOpen);

  // Handle hardware back button and popstate events
  useHardwareBackNavigation({
    isMobileDrawerOpen,
    onCloseMobileDrawer: () => setIsMobileDrawerOpen(false),
    isMobileFilterOpen,
    onCloseMobileFilter: () => setIsMobileFilterOpen(false),
    comparingProduct,
    onCloseComparingProduct: handleCloseProduct,
    alertProduct,
    onCloseAlertProduct: () => setAlertProduct(null),
    showAuthModal,
    onCloseAuthModal: closeAuthModal,
    activeTab,
    onResetTab: () => setActiveTab('all'),
  });

  // Reset page to 1 whenever filters or search query change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    selectedCategory,
    selectedSubcategory,
    selectedBrands,
    selectedStores,
    minPrice,
    maxPrice,
    onlyFreeShipping,
    onlyWithCoupons,
    minRating,
    sortBy,
  ]);

  // Toggle helpers for multi-selection
  const handleToggleStore = (storeId: StoreId) => {
    setSelectedStores((prev) =>
      prev.includes(storeId) ? prev.filter((id) => id !== storeId) : [...prev, storeId]
    );
  };

  const handleToggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const handleSetPriceRange = (min?: number, max?: number) => {
    setMinPrice(min);
    setMaxPrice(max);
  };

  // Search execution
  const searchResult = useMemo(() => {
    const state: SearchState = {
      rawQuery: searchQuery,
      sanitizedQuery: searchQuery,
      correctedQuery: null,
      selectedCategory,
      selectedSubcategory,
      selectedBrands,
      selectedStores,
      minPrice,
      maxPrice,
      onlyFreeShipping,
      onlyWithCoupons,
      minRating,
      sortBy,
    };
    return executeFuzzySearch(allProducts, state);
  }, [
    allProducts,
    searchQuery,
    selectedCategory,
    selectedSubcategory,
    selectedBrands,
    selectedStores,
    minPrice,
    maxPrice,
    onlyFreeShipping,
    onlyWithCoupons,
    minRating,
    sortBy,
  ]);

  // Pagination calculation
  const totalPages = Math.ceil(searchResult.totalMatches / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return searchResult.results.slice(start, start + ITEMS_PER_PAGE);
  }, [searchResult.results, currentPage]);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    if (productSectionRef.current) {
      productSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Filtered real coupons (Direto do Supabase - Cupons expirados nunca são exibidos)
  const filteredCoupons = useMemo(() => {
    const now = new Date();
    return realCoupons.filter((coupon) => {
      // Invalida cupons inativos ou vencidos
      if (coupon.isActive === false || coupon.is_active === false) return false;
      const expiry = coupon.ends_at || coupon.validUntil;
      if (expiry) {
        const expDate = new Date(expiry);
        if (!isNaN(expDate.getTime()) && expDate < now) return false;
      }
      const start = coupon.starts_at || coupon.validFrom;
      if (start) {
        const startDate = new Date(start);
        if (!isNaN(startDate.getTime()) && startDate > now) return false;
      }

      if (selectedStores.length > 0 && coupon.storeId && !selectedStores.includes(coupon.storeId as StoreId)) return false;
      if (selectedCategory !== 'all' && coupon.categoryId && coupon.categoryId !== selectedCategory) return false;
      return true;
    });
  }, [realCoupons, selectedStores, selectedCategory]);

  // Favorited products
  const favoritedProducts = useMemo(() => {
    return allProducts.filter((p) => favorites.includes(p.id));
  }, [allProducts, favorites]);

  const handleApplyCorrection = (corrected: string) => {
    setSearchQuery(corrected);
  };

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedSubcategory(undefined);
    setSelectedStores([]);
    setSelectedBrands([]);
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setOnlyFreeShipping(false);
    setOnlyWithCoupons(false);
    setMinRating(undefined);
    setSearchQuery('');
    setActiveTab('all');
    setCurrentPage(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Active filter count for mobile indicator
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedStores.length > 0) count += selectedStores.length;
    if (selectedBrands.length > 0) count += selectedBrands.length;
    if (minPrice !== undefined || maxPrice !== undefined) count++;
    if (onlyFreeShipping) count++;
    if (onlyWithCoupons) count++;
    if (minRating !== undefined && minRating > 0) count++;
    return count;
  }, [selectedStores, selectedBrands, minPrice, maxPrice, onlyFreeShipping, onlyWithCoupons, minRating]);

  // Breadcrumb labels
  const activeCategoryNode = CATEGORIES_TREE.find((c) => c.id === selectedCategory);
  const activeSubcategoryNode = activeCategoryNode?.subcategories.find((s) => s.id === selectedSubcategory);

  // If in Admin route, render secure AdminPanel (ou redireciona caso não seja admin)
  if (viewMode === 'admin') {
    if (user && !isAdminUser) {
      return null;
    }
    return (
      <AdminPanel
        onBackToVitrine={navigateToVitrine}
        onProductPublished={handleProductPublished}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-dark-bg text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {/* 1. Main Header / Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenMobileMenu={() => setIsMobileDrawerOpen(true)}
        onLogoClick={handleResetFilters}
      />

      {/* 2. Mega Menu Horizontal Navigation Bar with Hover Dropdowns */}
      <MegaMenu
        selectedCategory={selectedCategory}
        selectedSubcategory={selectedSubcategory}
        onSelectCategory={(catId) => {
          setSelectedCategory(catId);
          setSelectedSubcategory(undefined);
          setActiveTab('all');
        }}
        onSelectSubcategory={(catId, subId) => {
          setSelectedCategory(catId);
          setSelectedSubcategory(subId);
          setActiveTab('all');
        }}
        onSelectBrand={(brand) => {
          if (!selectedBrands.includes(brand)) {
            setSelectedBrands((prev) => [...prev, brand]);
          }
          setActiveTab('all');
        }}
        onTabChange={setActiveTab}
        activeTab={activeTab}
        isMobileDrawerOpen={isMobileDrawerOpen}
        onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
        onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
      />

      {/* 3. Top Leaderboard Banner */}
      <div className="max-w-[1536px] xl:max-w-[1600px] 2xl:max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 w-full pt-3">
        <AdSensePlaceholder slotType="leaderboard" />
      </div>

      {/* 4. Clean E-commerce Hero & Smart Search */}
      <section className="relative pt-2 pb-6 px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="max-w-4xl mx-auto text-center space-y-3.5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 text-xs font-black text-amber-700 dark:text-amber-300 shadow-sm animate-pulse-subtle">
            <Zap className="w-3.5 h-3.5 fill-current text-amber-500" />
            <span>Encontramos o menor preço para você não perder tempo</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-gray-900 dark:text-white leading-tight">
            Desbloqueie a <span className="text-amber-500 dark:text-amber-400">economia máxima</span> nas suas compras.
          </h1>

          {/* Search Bar */}
          <div className="pt-1">
            <SearchBar
              query={searchQuery}
              onSearchChange={setSearchQuery}
              correctionNotice={searchResult.correctionNotice}
              onApplyCorrection={handleApplyCorrection}
            />
          </div>
        </div>
      </section>

      {/* 5. Main Layout: 2-Column Clean E-commerce with Strict Responsive Grid */}
      <main className="flex-1 max-w-[1536px] xl:max-w-[1600px] 2xl:max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 w-full pb-10">
        <div className="flex items-start gap-6 xl:gap-8">
          {/* A. Left Filter Sidebar with Independent Scroll and Isolated Header */}
          <FilterSidebar
            selectedStores={selectedStores}
            onToggleStore={handleToggleStore}
            selectedBrands={selectedBrands}
            onToggleBrand={handleToggleBrand}
            minPrice={minPrice}
            maxPrice={maxPrice}
            onSetPriceRange={handleSetPriceRange}
            onlyFreeShipping={onlyFreeShipping}
            onToggleFreeShipping={() => setOnlyFreeShipping(!onlyFreeShipping)}
            onlyWithCoupons={onlyWithCoupons}
            onToggleWithCoupons={() => setOnlyWithCoupons(!onlyWithCoupons)}
            minRating={minRating}
            onSetMinRating={setMinRating}
            onResetFilters={handleResetFilters}
            isOpenMobileBottomSheet={isMobileFilterOpen}
            onCloseMobileBottomSheet={() => setIsMobileFilterOpen(false)}
            totalFilteredCount={searchResult.totalMatches}
          />

          {/* B. Central Wide Product Listing Area with min-w-0 and flex-1 */}
          <div ref={productSectionRef} className="flex-1 min-w-0 space-y-6">
            {/* View Selection: All Products View */}
            {activeTab === 'all' && (
              <>
                {/* Top Toolbar: Breadcrumbs, Mobile Filter Trigger, and Sorter */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border shadow-sm">
                  {/* Breadcrumbs & Active Filter Pills */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                    <button
                      onClick={handleResetFilters}
                      className="font-bold hover:text-amber-500 transition-colors cursor-pointer"
                    >
                      Início
                    </button>

                    {activeCategoryNode && (
                      <>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-bold text-gray-900 dark:text-white">
                          {activeCategoryNode.name}
                        </span>
                      </>
                    )}

                    {activeSubcategoryNode && (
                      <>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          {activeSubcategoryNode.name}
                        </span>
                      </>
                    )}

                    {/* Selected Brand Tags */}
                    {selectedBrands.map((brand) => (
                      <span
                        key={brand}
                        className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-extrabold text-[11px] flex items-center gap-1"
                      >
                        <span>{brand}</span>
                        <button onClick={() => handleToggleBrand(brand)} className="cursor-pointer">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Mobile Action Controls: Filtros & SortDropdown */}
                  <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-dark-border/60">
                    {/* Mobile Filter Button */}
                    <button
                      onClick={() => setIsMobileFilterOpen(true)}
                      className="flex sm:hidden items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-extrabold text-xs border border-amber-300 dark:border-amber-800 shrink-0 active:scale-95 transition-all cursor-pointer"
                    >
                      <SlidersHorizontal className="w-4 h-4 text-amber-500" />
                      <span>Filtros</span>
                      {activeFilterCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center">
                          {activeFilterCount}
                        </span>
                      )}
                    </button>

                    {/* Sorter Dropdown */}
                    <div className="shrink-0">
                      <SortDropdown value={sortBy} onChange={setSortBy} />
                    </div>
                  </div>
                </div>

                {/* Vitrine '🔥 Em Alta' (Produtos Mais Populares e Mais Clicados) */}
                {selectedCategory === 'all' && selectedBrands.length === 0 && !searchQuery.trim() && currentPage === 1 && (
                  <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-300/60 dark:border-amber-500/30 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-glow-amber">
                          <Flame className="w-5 h-5 fill-current animate-pulse" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">
                              🔥 Em Alta na Comunidade
                            </h3>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500 text-white tracking-wider">
                              Mais Clicados
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Produtos com maior volume de cliques e interesse em tempo real
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => setSortBy('trending')}
                        className="text-xs font-black text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <span>Ordenar vitrine por popularidade</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
                      {trendingProducts.map((trendProd, rankIdx) => (
                        <div key={`trend-${trendProd.id}`} className="relative h-full flex flex-col">
                          <ProductCard
                            product={trendProd}
                            isFeatured={rankIdx === 0}
                            onOpenCompare={handleOpenProduct}
                            onOpenAlert={setAlertProduct}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <Flame className="w-6 h-6 text-amber-500 fill-amber-500" />
                        <span>
                          {activeCategoryNode ? activeCategoryNode.name : 'Melhores Ofertas em Destaque'}
                        </span>
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {searchResult.totalMatches} produtos encontrados com menor preço verificado
                      </p>
                    </div>
                  </div>

                  {searchResult.results.length === 0 ? (
                    <div className="p-16 text-center bg-white dark:bg-dark-card rounded-3xl border border-gray-200 dark:border-dark-border space-y-3 shadow-sm">
                      <p className="text-base font-bold text-gray-800 dark:text-gray-200">
                        Nenhum produto encontrado para estes filtros.
                      </p>
                      <p className="text-xs text-gray-400 max-w-md mx-auto">
                        Tente desmarcar algumas marcas, lojas ou ampliar a faixa de preço.
                      </p>
                      <button
                        onClick={handleResetFilters}
                        className="px-5 py-2.5 rounded-xl bg-amber-500 text-white text-xs font-bold shadow-md hover:bg-amber-600 transition-colors cursor-pointer"
                      >
                        Limpar Filtros
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Strict Responsive Product Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
                        {paginatedProducts.map((product, index) => {
                          return (
                            <React.Fragment key={product.id}>
                              <div className="w-full flex flex-col">
                                <ProductCard
                                  product={product}
                                  isFeatured={index === 0 && currentPage === 1 && selectedCategory === 'all' && selectedBrands.length === 0 && !searchQuery}
                                  onOpenCompare={handleOpenProduct}
                                  onOpenAlert={setAlertProduct}
                                />
                              </div>

                              {/* Insert full-width in-feed banner dynamically every 4 products */}
                              {(index + 1) % 4 === 0 && (
                                <div className="col-span-full w-full my-2">
                                  <AdSensePlaceholder slotType="infeed" />
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>

                      {/* Pagination Controls */}
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={searchResult.totalMatches}
                        itemsPerPage={ITEMS_PER_PAGE}
                        onPageChange={handlePageChange}
                      />
                    </>
                  )}
                </div>
              </>
            )}

            {/* Coupons View */}
            {activeTab === 'coupons' && (
              <div className="space-y-6">
                {/* Header with Prominent Return Button and Breadcrumb */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border shadow-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <button
                        onClick={() => setActiveTab('all')}
                        className="font-bold hover:text-amber-500 transition-colors cursor-pointer"
                      >
                        Início
                      </button>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-bold text-gray-900 dark:text-white">Central de Cupons</span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2.5">
                      <Tag className="w-6 h-6 text-amber-500" />
                      <span>Central de Cupons Verificados</span>
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Economize com códigos de desconto reais e ativos nas lojas parceiras (KaBuM!, Amazon, Mercado Livre, Shopee e mais).
                    </p>
                  </div>

                  {/* Return Button */}
                  <button
                    onClick={() => setActiveTab('all')}
                    className="flex items-center gap-2 py-2.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-glow-amber transition-all active:scale-95 shrink-0 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar para as Ofertas</span>
                  </button>
                </div>

                {/* Loading State */}
                {isLoadingCoupons && (
                  <div className="py-20 text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm font-extrabold text-gray-600 dark:text-gray-300">
                      Carregando cupons verificados em tempo real...
                    </p>
                  </div>
                )}

                {/* Empty State */}
                {!isLoadingCoupons && filteredCoupons.length === 0 && (
                  <div className="text-center py-16 px-4 bg-white dark:bg-dark-surface rounded-3xl border border-gray-200 dark:border-dark-border space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                      <Tag className="w-8 h-8" />
                    </div>
                    <div className="max-w-md mx-auto space-y-1.5">
                      <h3 className="text-lg font-black text-gray-900 dark:text-white">
                        Nenhum cupom ativo no momento
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Nossos robôs estão monitorando os feeds da Awin e das lojas parceiras. Novos cupons verificados aparecerão aqui assim que forem liberados.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('all')}
                      className="px-6 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs transition-all shadow-glow-amber active:scale-95 cursor-pointer"
                    >
                      Explorar Vitrine de Ofertas
                    </button>
                  </div>
                )}

                {/* Coupons Grid */}
                {!isLoadingCoupons && filteredCoupons.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                    {filteredCoupons.map((coupon) => (
                      <CouponCard key={coupon.id} coupon={coupon} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Favorites View */}
            {activeTab === 'favorites' && (
              <div className="space-y-6">
                {/* Header with Return Button and Breadcrumb */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border shadow-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <button
                        onClick={() => setActiveTab('all')}
                        className="font-bold hover:text-amber-500 transition-colors cursor-pointer"
                      >
                        Início
                      </button>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-bold text-gray-900 dark:text-white">Meus Favoritos</span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2.5">
                      <Heart className="w-6 h-6 text-rose-500 fill-current" />
                      <span>Meus Produtos Favoritos ({favoritedProducts.length})</span>
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Acompanhe o preço dos itens salvos e receba avisos quando atingirem o valor desejado.
                    </p>
                  </div>

                  {/* Return Button */}
                  <button
                    onClick={() => setActiveTab('all')}
                    className="flex items-center gap-2 py-2.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-glow-amber transition-all active:scale-95 shrink-0 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar para as Ofertas</span>
                  </button>
                </div>

                {favoritedProducts.length === 0 ? (
                  <div className="p-16 text-center bg-white dark:bg-dark-card rounded-3xl border border-gray-200 dark:border-dark-border space-y-4 shadow-sm">
                    <Heart className="w-12 h-12 text-gray-300 dark:text-dark-hover mx-auto" />
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                      Você ainda não favoritou nenhum produto.
                    </p>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto">
                      Clique no ícone de coração em qualquer card de produto para salvar nesta lista.
                    </p>
                    <button
                      onClick={() => setActiveTab('all')}
                      className="mt-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-glow-amber transition-all cursor-pointer"
                    >
                      Explorar Ofertas
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
                    {favoritedProducts.map((product) => (
                      <div key={product.id} className="w-full flex flex-col">
                        <ProductCard
                          product={product}
                          onOpenCompare={handleOpenProduct}
                          onOpenAlert={setAlertProduct}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Structured SEO Editorial Section */}
      <SeoFooterContent />

      {/* Footer */}
      <Footer
        onLogoClick={handleResetFilters}
        onOpenAdmin={navigateToAdmin}
      />

      {/* Modals */}
      <PriceComparisonModal
        product={comparingProduct}
        onClose={handleCloseProduct}
        onOpenAlert={(p) => {
          handleCloseProduct();
          setAlertProduct(p);
        }}
      />

      <PriceAlertModal
        product={alertProduct}
        onClose={() => setAlertProduct(null)}
      />

      <AuthModal />
    </div>
  );
};

export function App() {
  return <AppContent />;
}

export default App;
