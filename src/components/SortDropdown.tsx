import React, { useState, useEffect, useRef } from 'react';
import { ArrowUpDown, ChevronDown, Check, Sparkles, TrendingDown, TrendingUp, Percent, Star, Flame } from 'lucide-react';
import { SearchState } from '../types';

interface SortOption {
  value: SearchState['sortBy'];
  label: string;
  icon: React.ReactNode;
}

const SORT_OPTIONS: SortOption[] = [
  { 
    value: 'relevance', 
    label: 'Mais Relevantes',
    icon: <Sparkles className="w-3.5 h-3.5 text-amber-500" />
  },
  { 
    value: 'trending', 
    label: '🔥 Em Alta (Mais Clicados)',
    icon: <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
  },
  { 
    value: 'price_asc', 
    label: 'Menor Preço',
    icon: <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
  },
  { 
    value: 'price_desc', 
    label: 'Maior Preço',
    icon: <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
  },
  { 
    value: 'discount_desc', 
    label: 'Maior Desconto (%)',
    icon: <Percent className="w-3.5 h-3.5 text-rose-500" />
  },
  { 
    value: 'rating_desc', 
    label: 'Melhores Avaliados',
    icon: <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
  },
];

interface SortDropdownProps {
  value: SearchState['sortBy'];
  onChange: (newValue: SearchState['sortBy']) => void;
}

export const SortDropdown: React.FC<SortDropdownProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOption = SORT_OPTIONS.find((opt) => opt.value === value) || SORT_OPTIONS[0];

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (sortValue: SearchState['sortBy']) => {
    onChange(sortValue);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative z-20 shrink-0">
      {/* Sorter Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`py-2 px-2.5 sm:px-3.5 rounded-xl bg-white dark:bg-dark-card border transition-all duration-200 text-xs font-bold text-gray-800 dark:text-gray-200 shadow-sm flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0 ${
          isOpen
            ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-glow-amber'
            : 'border-gray-200 dark:border-dark-border hover:border-amber-300 dark:hover:border-dark-hover hover:bg-gray-50 dark:hover:bg-dark-hover'
        }`}
      >
        <span className="text-gray-400 dark:text-gray-500 hidden md:flex items-center gap-1 font-semibold">
          <ArrowUpDown className="w-3 h-3 text-amber-500" />
          <span>Ordenar por:</span>
        </span>
        
        <span className="flex items-center gap-1.5 text-gray-900 dark:text-white font-extrabold text-xs">
          {currentOption.icon}
          <span className="truncate max-w-[130px] sm:max-w-none">{currentOption.label}</span>
        </span>

        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 dark:text-gray-500 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-amber-500' : ''
          }`}
        />
      </button>

      {/* Floating Custom Menu Dropdown */}
      {isOpen && (
        <div 
          className="absolute right-0 top-full mt-1.5 z-30 w-52 sm:w-56 max-w-[calc(100vw-2rem)] bg-white dark:bg-obsidian border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden animate-fade-in"
          role="listbox"
        >
          <div className="px-3.5 py-2 bg-gray-50/80 dark:bg-dark-surface border-b border-gray-100 dark:border-dark-border text-[10px] font-extrabold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center justify-between">
            <span>Opções de Classificação</span>
          </div>

          <ul className="py-1">
            {SORT_OPTIONS.map((option) => {
              const isSelected = option.value === value;
              return (
                <li key={option.value} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`w-full px-3.5 py-2.5 text-left text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-extrabold border-l-4 border-amber-500 pl-2.5'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-amber-50/80 dark:hover:bg-gray-800 hover:text-amber-600 dark:hover:text-amber-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="shrink-0">{option.icon}</span>
                      <span>{option.label}</span>
                    </div>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-amber-500 shrink-0 stroke-[3]" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
