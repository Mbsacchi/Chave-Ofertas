import React, { useState, useMemo } from 'react';
import { 
  Filter, 
  RotateCcw, 
  Search, 
  Check, 
  Star, 
  Truck, 
  Tag, 
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { StoreId } from '../types';
import { STORES, ALL_BRANDS } from '../data/mockData';

interface FilterSidebarProps {
  selectedStores: StoreId[];
  onToggleStore: (storeId: StoreId) => void;
  selectedBrands: string[];
  onToggleBrand: (brand: string) => void;
  minPrice?: number;
  maxPrice?: number;
  onSetPriceRange: (min?: number, max?: number) => void;
  onlyFreeShipping?: boolean;
  onToggleFreeShipping: () => void;
  onlyWithCoupons?: boolean;
  onToggleWithCoupons: () => void;
  minRating?: number;
  onSetMinRating: (rating?: number) => void;
  onResetFilters: () => void;
  isOpenMobileBottomSheet?: boolean;
  onCloseMobileBottomSheet?: () => void;
  totalFilteredCount: number;
}

const QUICK_PRICE_RANGES = [
  { label: 'Até R$ 500', min: undefined, max: 500 },
  { label: 'R$ 500 a R$ 1.500', min: 500, max: 1500 },
  { label: 'R$ 1.500 a R$ 3.000', min: 1500, max: 3000 },
  { label: 'Acima de R$ 3.000', min: 3000, max: undefined },
];

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  selectedStores,
  onToggleStore,
  selectedBrands,
  onToggleBrand,
  minPrice,
  maxPrice,
  onSetPriceRange,
  onlyFreeShipping,
  onToggleFreeShipping,
  onlyWithCoupons,
  onToggleWithCoupons,
  minRating,
  onSetMinRating,
  onResetFilters,
  isOpenMobileBottomSheet = false,
  onCloseMobileBottomSheet,
  totalFilteredCount,
}) => {
  // Brand search query inside sidebar
  const [brandSearch, setBrandSearch] = useState('');
  
  // Custom price input local states
  const [inputMin, setInputMin] = useState(minPrice !== undefined ? String(minPrice) : '');
  const [inputMax, setInputMax] = useState(maxPrice !== undefined ? String(maxPrice) : '');

  // Section collapse state
  const [openSections, setOpenSections] = useState({
    stores: true,
    brands: true,
    price: true,
    options: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const filteredBrands = useMemo(() => {
    if (!brandSearch.trim()) return ALL_BRANDS;
    return ALL_BRANDS.filter((b) =>
      b.toLowerCase().includes(brandSearch.toLowerCase().trim())
    );
  }, [brandSearch]);

  const handleApplyCustomPrice = (e: React.FormEvent) => {
    e.preventDefault();
    const min = inputMin ? parseFloat(inputMin) : undefined;
    const max = inputMax ? parseFloat(inputMax) : undefined;
    onSetPriceRange(min, max);
  };

  const hasActiveFilters = 
    selectedStores.length > 0 || 
    selectedBrands.length > 0 || 
    minPrice !== undefined || 
    maxPrice !== undefined || 
    onlyFreeShipping || 
    onlyWithCoupons || 
    (minRating !== undefined && minRating > 0);

  // Reusable scrollable filter sections
  const filterSections = (
    <div className="space-y-6 text-xs">
      {/* 1. Lojas (Stores Checkboxes) */}
      <div className="space-y-2.5">
        <button
          onClick={() => toggleSection('stores')}
          className="w-full flex items-center justify-between font-extrabold uppercase text-[11px] tracking-wider text-gray-800 dark:text-gray-200"
        >
          <span>Lojas Parceiras</span>
          {openSections.stores ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {openSections.stores && (
          <div className="space-y-1.5 pt-1">
            {STORES.map((store) => {
              const isChecked = selectedStores.includes(store.id);

              return (
                <label
                  key={store.id}
                  onClick={() => onToggleStore(store.id)}
                  className={`flex items-center justify-between py-1.5 px-2.5 rounded-xl cursor-pointer transition-colors ${
                    isChecked
                      ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 font-bold'
                      : 'hover:bg-gray-100 dark:hover:bg-dark-hover text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                        isChecked
                          ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                          : 'border-gray-300 dark:border-dark-border bg-white dark:bg-dark-surface'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="text-xs">{store.name}</span>
                  </div>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: store.accentColor }} />
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Marcas (Scrollable Brand list with Search Input) */}
      <div className="pt-3 border-t border-gray-100 dark:border-dark-border space-y-2.5">
        <button
          onClick={() => toggleSection('brands')}
          className="w-full flex items-center justify-between font-extrabold uppercase text-[11px] tracking-wider text-gray-800 dark:text-gray-200"
        >
          <span>Marcas Homologadas</span>
          {openSections.brands ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {openSections.brands && (
          <div className="space-y-2 pt-1">
            {/* Internal Brand Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                placeholder="Buscar marca..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Scrollable list */}
            <div className="max-h-44 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
              {filteredBrands.map((brand) => {
                const isChecked = selectedBrands.includes(brand);

                return (
                  <label
                    key={brand}
                    onClick={() => onToggleBrand(brand)}
                    className={`flex items-center justify-between py-1 px-2 rounded-lg cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 font-bold'
                        : 'hover:bg-gray-100 dark:hover:bg-dark-hover text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                          isChecked
                            ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                            : 'border-gray-300 dark:border-dark-border bg-white dark:bg-dark-surface'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="text-xs truncate">{brand}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. Faixa de Preço (Quick Buttons + Min/Max Inputs) */}
      <div className="pt-3 border-t border-gray-100 dark:border-dark-border space-y-2.5">
        <button
          onClick={() => toggleSection('price')}
          className="w-full flex items-center justify-between font-extrabold uppercase text-[11px] tracking-wider text-gray-800 dark:text-gray-200"
        >
          <span>Faixa de Preço</span>
          {openSections.price ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {openSections.price && (
          <div className="space-y-2.5 pt-1">
            {/* Quick Price Buttons */}
            <div className="grid grid-cols-2 gap-1.5">
              {QUICK_PRICE_RANGES.map((range, idx) => {
                const isSelected = minPrice === range.min && maxPrice === range.max;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        onSetPriceRange(undefined, undefined);
                        setInputMin('');
                        setInputMax('');
                      } else {
                        onSetPriceRange(range.min, range.max);
                        setInputMin(range.min ? String(range.min) : '');
                        setInputMax(range.max ? String(range.max) : '');
                      }
                    }}
                    className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition-all text-center ${
                      isSelected
                        ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                        : 'border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover'
                    }`}
                  >
                    {range.label}
                  </button>
                );
              })}
            </div>

            {/* Custom Min / Max Inputs */}
            <form onSubmit={handleApplyCustomPrice} className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">R$</span>
                  <input
                    type="number"
                    value={inputMin}
                    onChange={(e) => setInputMin(e.target.value)}
                    placeholder="Mínimo"
                    className="w-full pl-7 pr-2 py-1.5 rounded-xl bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <span className="text-gray-400 font-bold">-</span>
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">R$</span>
                  <input
                    type="number"
                    value={inputMax}
                    onChange={(e) => setInputMax(e.target.value)}
                    placeholder="Máximo"
                    className="w-full pl-7 pr-2 py-1.5 rounded-xl bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-sm transition-all active:scale-95"
              >
                Aplicar Preço
              </button>
            </form>
          </div>
        )}
      </div>

      {/* 4. Opções Extras (Frete Grátis, Cupons, Avaliação) */}
      <div className="pt-3 border-t border-gray-100 dark:border-dark-border space-y-2.5 pb-2">
        <button
          onClick={() => toggleSection('options')}
          className="w-full flex items-center justify-between font-extrabold uppercase text-[11px] tracking-wider text-gray-800 dark:text-gray-200"
        >
          <span>Benefícios & Avaliação</span>
          {openSections.options ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {openSections.options && (
          <div className="space-y-2 pt-1">
            {/* Free Shipping Checkbox */}
            <label
              onClick={onToggleFreeShipping}
              className={`flex items-center gap-2.5 py-1.5 px-2.5 rounded-xl cursor-pointer transition-colors ${
                onlyFreeShipping
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-bold'
                  : 'hover:bg-gray-100 dark:hover:bg-dark-hover text-gray-700 dark:text-gray-300'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                  onlyFreeShipping
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-gray-300 dark:border-dark-border bg-white dark:bg-dark-surface'
                }`}
              >
                {onlyFreeShipping && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              <div className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Frete Grátis</span>
              </div>
            </label>

            {/* Coupons Checkbox */}
            <label
              onClick={onToggleWithCoupons}
              className={`flex items-center gap-2.5 py-1.5 px-2.5 rounded-xl cursor-pointer transition-colors ${
                onlyWithCoupons
                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-bold'
                  : 'hover:bg-gray-100 dark:hover:bg-dark-hover text-gray-700 dark:text-gray-300'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                  onlyWithCoupons
                    ? 'bg-amber-500 border-amber-500 text-white'
                    : 'border-gray-300 dark:border-dark-border bg-white dark:bg-dark-surface'
                }`}
              >
                {onlyWithCoupons && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              <div className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-500" />
                <span>Com Cupom de Desconto</span>
              </div>
            </label>

            {/* 4+ Stars Rating */}
            <button
              onClick={() => onSetMinRating(minRating === 4.5 ? undefined : 4.5)}
              className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-xl transition-colors text-left ${
                minRating === 4.5
                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-bold'
                  : 'hover:bg-gray-100 dark:hover:bg-dark-hover text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-1.5 text-amber-500">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-gray-900 dark:text-white font-bold">4.5+ Estrelas</span>
              </div>
              {minRating === 4.5 && <Check className="w-3 h-3 text-amber-500" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Filter Sidebar with Isolated Fixed Header and Independent Scroll Body */}
      <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 self-start sticky top-20 h-[calc(100vh-5.5rem)] max-h-[calc(100vh-5.5rem)] bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-3xl shadow-sm overflow-hidden z-20">
        {/* Solid Opaque Header Container (Isolated from scrolling content) */}
        <div className="bg-white dark:bg-dark-surface px-5 py-4 border-b border-gray-200 dark:border-dark-border flex items-center justify-between shrink-0 z-30 shadow-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white">
              Filtrar Resultados
            </h3>
          </div>

          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpar</span>
            </button>
          )}
        </div>

        {/* Scrollable Filters Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-5">
          {filterSections}
        </div>
      </aside>

      {/* 2. Mobile Bottom Sheet Filter Overlay */}
      {isOpenMobileBottomSheet && (
        <div className="fixed inset-0 z-[80] lg:hidden flex flex-col justify-end">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobileBottomSheet}
            aria-label="Fechar ao tocar fora"
          />

          {/* Bottom Sheet Modal Container */}
          <div
            className="relative z-10 w-full max-h-[85vh] bg-white dark:bg-dark-surface rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface shrink-0 z-30">
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                <Filter className="w-4 h-4 text-amber-500" />
                <span>Filtros ({totalFilteredCount} Ofertas)</span>
              </span>

              <button
                onClick={onCloseMobileBottomSheet}
                className="p-2 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white bg-gray-100 dark:bg-dark-card active:scale-90 transition-transform"
                aria-label="Fechar filtros"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-5 sm:p-6">
              {filterSections}
            </div>

            {/* Bottom Apply Bar */}
            <div className="p-4 border-t border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface shrink-0 z-30">
              <button
                onClick={onCloseMobileBottomSheet}
                className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm shadow-glow-amber transition-all active:scale-95 text-center"
              >
                Ver {totalFilteredCount} Resultados
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
