import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Sparkles, ArrowRight, AlertCircle, TrendingUp, Zap, Tag } from 'lucide-react';
import { sanitizeSearchQuery } from '../lib/security/sanitizer';
import { searchRateLimiter } from '../lib/security/rateLimiter';
import { MOCK_PRODUCTS } from '../data/mockData';

interface SearchBarProps {
  query: string;
  onSearchChange: (newQuery: string) => void;
  correctionNotice: { hasCorrection: boolean; correctedQuery: string } | null;
  onApplyCorrection: (corrected: string) => void;
  availableBrands?: string[];
}

const TRENDING_SEARCHES = [
  'Grand Theft Auto VI',
  'iPhone 15 Pro',
  'PlayStation 5 Slim',
  'Samsung Galaxy S24',
  'Air Fryer Walita',
  'MacBook Air M2',
  'Fone Sony WH-1000XM5',
];

export const SearchBar: React.FC<SearchBarProps> = ({
  query,
  onSearchChange,
  correctionNotice,
  onApplyCorrection,
  availableBrands,
}) => {
  const [inputValue, setInputValue] = useState(query);
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [rateLimitWarning, setRateLimitWarning] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract unique brands from products
  const uniqueBrands = React.useMemo(() => {
    if (availableBrands && availableBrands.length > 0) return availableBrands;
    return Array.from(new Set(MOCK_PRODUCTS.map((p) => p.brand).filter(Boolean))).sort();
  }, [availableBrands]);

  useEffect(() => {
    setInputValue(query);
  }, [query]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputValue(raw);

    // Rate limit check
    const rateCheck = searchRateLimiter.checkLimit();
    if (!rateCheck.allowed) {
      setRateLimitWarning(`Muitas buscas seguidas. Aguarde ${rateCheck.retryAfterSeconds}s.`);
      return;
    } else {
      setRateLimitWarning(null);
    }

    const sanitized = sanitizeSearchQuery(raw);
    onSearchChange(sanitized);

    // Autocomplete Brand Suggestions filter
    const trimmed = sanitized.trim().toLowerCase();
    if (trimmed.length > 0) {
      const matched = uniqueBrands.filter((brand) =>
        brand.toLowerCase().includes(trimmed)
      );
      setSuggestions(matched);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleClear = () => {
    setInputValue('');
    onSearchChange('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleSelectBrand = (brand: string) => {
    setInputValue(brand);
    onSearchChange(brand);
    setShowSuggestions(false);
    setIsFocused(false);
  };

  const handleSelectTrending = (term: string) => {
    setInputValue(term);
    onSearchChange(term);
    setShowSuggestions(false);
    setIsFocused(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="w-full max-w-3xl mx-auto relative z-20">
      {/* Search Input Container */}
      <div
        className={`relative flex items-center bg-white dark:bg-dark-card rounded-2xl sm:rounded-3xl border-2 transition-all duration-300 shadow-md ${
          isFocused
            ? 'border-amber-500 ring-4 ring-amber-500/20 shadow-glow-amber'
            : 'border-gray-200 dark:border-dark-border hover:border-amber-300 dark:hover:border-dark-hover'
        }`}
      >
        <div className="pl-4 sm:pl-6 text-amber-500">
          <Search className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>

        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            setIsFocused(true);
            if (inputValue.trim().length > 0 && suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder="O que você deseja comprar hoje? (ex: iPhone 15, S24, PS5, Air Fryer)..."
          maxLength={64}
          className="w-full py-4 sm:py-5 px-3 sm:px-4 bg-transparent text-sm sm:text-base font-semibold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
        />

        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="p-2 mr-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
            title="Limpar busca"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* User-friendly smart badge */}
        <div className="pr-3 sm:pr-4 hidden sm:flex items-center">
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-900/50">
            <Zap className="w-3 h-3 text-amber-500 fill-current" />
            <span>Busca Inteligente</span>
          </span>
        </div>
      </div>

      {/* Autocomplete Brand Suggestions Dropdown (Rendered when typing & matches found) */}
      {showSuggestions && inputValue.trim().length > 0 && suggestions.length > 0 && (
        <div className="absolute z-30 w-full bg-white dark:bg-obsidian border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl mt-1.5 overflow-hidden animate-fade-in divide-y divide-gray-100 dark:divide-dark-border/40">
          <div className="px-4 py-2 bg-gray-50/80 dark:bg-dark-surface flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-amber-500" />
              Sugestões de Marcas ({suggestions.length})
            </span>
            <span className="text-[10px] text-gray-400">Clique para filtrar</span>
          </div>
          <ul className="max-h-[145px] overflow-y-auto py-1 divide-y divide-gray-50 dark:divide-dark-border/20">
            {suggestions.map((brand) => (
              <li key={brand}>
                <button
                  type="button"
                  onMouseDown={() => handleSelectBrand(brand)}
                  className="w-full px-4 py-2.5 text-left text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 dark:hover:text-amber-400 flex items-center justify-between transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-dark-card group-hover:bg-amber-100 dark:group-hover:bg-amber-900/40 text-gray-600 group-hover:text-amber-600 dark:text-gray-300 flex items-center justify-center text-xs font-black">
                      {brand.charAt(0)}
                    </span>
                    <span className="font-bold">{brand}</span>
                  </div>
                  <span className="text-[11px] text-gray-400 group-hover:text-amber-500 font-medium flex items-center gap-1">
                    Filtrar por marca
                    <ArrowRight className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Rate Limiting Alert */}
      {rateLimitWarning && (
        <div className="mt-2.5 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2 animate-fade-in shadow-sm">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
          <span>{rateLimitWarning}</span>
        </div>
      )}

      {/* Typo Correction Banner */}
      {correctionNotice && correctionNotice.hasCorrection && (
        <div className="mt-3 p-3.5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 text-xs sm:text-sm text-gray-800 dark:text-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              Você quis dizer:{' '}
              <strong className="font-extrabold text-amber-600 dark:text-amber-400 underline decoration-amber-500/40">
                "{correctionNotice.correctedQuery}"
              </strong>
              ?
            </span>
          </div>
          <button
            type="button"
            onClick={() => onApplyCorrection(correctionNotice.correctedQuery)}
            className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition-all active:scale-95 shrink-0 self-end sm:self-auto"
          >
            Buscar termo corrigido
          </button>
        </div>
      )}

      {/* Trending Searches Dropdown on Focus (when search is empty) */}
      {isFocused && !inputValue && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-obsidian border border-gray-200 dark:border-gray-700 rounded-3xl p-5 shadow-2xl animate-fade-in z-30">
          <div className="flex items-center gap-2 text-xs font-extrabold text-gray-500 dark:text-gray-400 mb-3.5 uppercase tracking-wider">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            <span>Produtos Mais Buscados Hoje</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {TRENDING_SEARCHES.map((term) => (
              <button
                key={term}
                type="button"
                onMouseDown={() => handleSelectTrending(term)}
                className="px-3.5 py-2 rounded-2xl bg-gray-100 dark:bg-dark-surface hover:bg-amber-50 dark:hover:bg-amber-950/60 hover:text-amber-600 dark:hover:text-amber-400 text-xs font-bold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-dark-border transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>{term}</span>
                <ArrowRight className="w-3 h-3 opacity-60" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
