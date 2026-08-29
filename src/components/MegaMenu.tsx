import React, { useState, useRef } from 'react';
import { 
  ChevronDown, 
  Tag, 
  Smartphone, 
  Laptop, 
  Gamepad2, 
  Flame, 
  Headphones, 
  BookOpen,
  ArrowRight,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  Zap,
  PenTool
} from 'lucide-react';
import { CATEGORIES_TREE } from '../data/mockData';

interface MegaMenuProps {
  selectedCategory: string;
  selectedSubcategory?: string;
  onSelectCategory: (categoryId: string) => void;
  onSelectSubcategory: (categoryId: string, subcategoryId?: string) => void;
  onSelectBrand: (brand: string) => void;
  onTabChange: (tab: 'all' | 'coupons' | 'favorites') => void;
  activeTab: 'all' | 'coupons' | 'favorites';
  isMobileDrawerOpen: boolean;
  onCloseMobileDrawer: () => void;
  onOpenMobileDrawer: () => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'smartphones': <Smartphone className="w-4 h-4" />,
  'informatica': <Laptop className="w-4 h-4" />,
  'games': <Gamepad2 className="w-4 h-4" />,
  'eletro': <Flame className="w-4 h-4" />,
  'audio': <Headphones className="w-4 h-4" />,
  'livros': <BookOpen className="w-4 h-4" />,
  'papelaria': <PenTool className="w-4 h-4" />,
};

export const MegaMenu: React.FC<MegaMenuProps> = ({
  selectedCategory,
  onSelectCategory,
  onSelectSubcategory,
  onSelectBrand,
  onTabChange,
  activeTab,
  isMobileDrawerOpen,
  onCloseMobileDrawer,
  onOpenMobileDrawer,
}) => {
  // Desktop hover state
  const [hoveredCatId, setHoveredCatId] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  // Mobile drawer expanded category
  const [expandedMobileCat, setExpandedMobileCat] = useState<string | null>('smartphones');

  const handleMouseEnter = (catId: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setHoveredCatId(catId);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = window.setTimeout(() => {
      setHoveredCatId(null);
    }, 200);
  };

  const activeHoverCategory = CATEGORIES_TREE.find((c) => c.id === hoveredCatId);

  return (
    <>
      <nav className="relative z-20 w-full bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border shadow-sm">
      <div className="max-w-[1536px] xl:max-w-[1600px] 2xl:max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex items-center justify-between h-12">
          {/* Mobile Drawer Trigger */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={onOpenMobileDrawer}
              className="flex items-center gap-2 py-1.5 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-extrabold text-xs border border-amber-200 dark:border-amber-900/50"
            >
              <Menu className="w-4 h-4 text-amber-500" />
              <span>Todos os Departamentos</span>
            </button>
          </div>

          {/* Desktop Horizontal Mega Menu Links */}
          <div className="hidden lg:flex items-center gap-1 xl:gap-2">
            {/* All Departments Button */}
            <button
              onClick={() => {
                onSelectCategory('all');
                setHoveredCatId(null);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                selectedCategory === 'all' && activeTab === 'all'
                  ? 'bg-amber-500 text-white shadow-glow-amber'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Todas as Ofertas</span>
            </button>

            {/* Category Nav Items with Mega Menu Trigger on Hover */}
            {CATEGORIES_TREE.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const isHovered = hoveredCatId === cat.id;

              return (
                <div
                  key={cat.id}
                  onMouseEnter={() => handleMouseEnter(cat.id)}
                  onMouseLeave={handleMouseLeave}
                  className="relative"
                >
                  <button
                    onClick={() => {
                      onSelectCategory(cat.id);
                      setHoveredCatId(null);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? 'text-amber-600 dark:text-amber-400 font-black bg-amber-50 dark:bg-amber-950/50'
                        : isHovered
                        ? 'text-amber-600 dark:text-amber-400 bg-gray-50 dark:bg-dark-hover'
                        : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-dark-hover'
                    }`}
                  >
                    <span className={isSelected || isHovered ? 'text-amber-500' : 'text-gray-400'}>
                      {CATEGORY_ICONS[cat.id]}
                    </span>
                    <span>{cat.name}</span>
                    <ChevronDown
                      className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${
                        isHovered ? 'rotate-180 text-amber-500' : ''
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Right Highlights: Cupons & Lojas Verificadas */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onTabChange('coupons')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'coupons'
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800 font-black'
                  : 'text-gray-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400'
              }`}
            >
              <Tag className="w-3.5 h-3.5 text-amber-500" />
              <span>Cupons do Dia</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-500 text-white">
                99% ON
              </span>
            </button>

            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-gray-500 dark:text-gray-400 pl-2 border-l border-gray-200 dark:border-dark-border">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Lojas Oficiais</span>
            </span>
          </div>
        </div>
      </div>

      {/* Desktop Mega Menu Dropdown Panel */}
      {hoveredCatId && activeHoverCategory && (
        <div
          onMouseEnter={() => handleMouseEnter(activeHoverCategory.id)}
          onMouseLeave={handleMouseLeave}
          className="hidden lg:block absolute top-full left-0 right-0 w-full bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border shadow-2xl animate-fade-in z-50 py-6"
        >
          <div className="max-w-[1536px] xl:max-w-[1600px] 2xl:max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
            <div className="grid grid-cols-12 gap-8 items-start">
              {/* Left Side: Subcategories Columns (8 cols) */}
              <div className="col-span-8 grid grid-cols-3 gap-6">
                {activeHoverCategory.subcategories.map((sub) => (
                  <div key={sub.id} className="space-y-3">
                    <button
                      onClick={() => {
                        onSelectSubcategory(activeHoverCategory.id, sub.id);
                        setHoveredCatId(null);
                      }}
                      className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1 group text-left"
                    >
                      <span>{sub.name}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>

                    <div className="space-y-1.5 pl-1 border-l-2 border-gray-100 dark:border-dark-border">
                      {sub.brands.map((brand) => (
                        <button
                          key={brand}
                          onClick={() => {
                            onSelectSubcategory(activeHoverCategory.id, sub.id);
                            onSelectBrand(brand);
                            setHoveredCatId(null);
                          }}
                          className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors text-left"
                        >
                          {brand}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Side: Promotional Category Banner (4 cols) */}
              {activeHoverCategory.promoBanner && (
                <div className="col-span-4 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200 dark:border-amber-900/50 rounded-3xl p-5 relative overflow-hidden flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-sm inline-block">
                      {activeHoverCategory.promoBanner.badge}
                    </span>
                    <h4 className="text-sm font-black text-gray-900 dark:text-white leading-tight">
                      {activeHoverCategory.promoBanner.title}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                      {activeHoverCategory.promoBanner.subtitle}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-amber-200/50 dark:border-amber-900/30">
                    <button
                      onClick={() => {
                        onSelectCategory(activeHoverCategory.id);
                        setHoveredCatId(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-glow-amber flex items-center gap-1.5 transition-all"
                    >
                      <span>{activeHoverCategory.promoBanner.actionText}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <img
                      src={activeHoverCategory.promoBanner.imageUrl}
                      alt={activeHoverCategory.promoBanner.title}
                      className="w-16 h-16 object-cover rounded-2xl border border-amber-300 dark:border-amber-800 shadow-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>

    {/* Mobile Mega Menu Drawer Overlay */}
    {isMobileDrawerOpen && (
      <div className="fixed inset-0 z-[80] lg:hidden flex">
          {/* Dark Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobileDrawer}
            aria-label="Fechar ao tocar fora"
          />

          {/* Drawer Container (Slide-in) */}
          <div
            className="relative z-10 w-[85vw] max-w-sm h-full bg-white dark:bg-dark-surface border-r border-gray-200 dark:border-dark-border p-5 sm:p-6 shadow-2xl flex flex-col animate-slide-right overflow-y-auto scrollbar-thin"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100 dark:border-dark-border">
              <span className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                <Menu className="w-4 h-4 text-amber-500" />
                <span>Departamentos & Lojas</span>
              </span>
              <button
                onClick={onCloseMobileDrawer}
                className="p-2 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white bg-gray-100 dark:bg-dark-card active:scale-90 transition-transform"
                aria-label="Fechar menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Links */}
            <div className="space-y-1 mb-4 pb-3 border-b border-gray-100 dark:border-dark-border">
              <button
                onClick={() => {
                  onSelectCategory('all');
                  onTabChange('all');
                  onCloseMobileDrawer();
                }}
                className="w-full py-2.5 px-3 rounded-xl text-left text-xs font-bold text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-hover flex items-center gap-2"
              >
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Todas as Ofertas em Destaque</span>
              </button>

              <button
                onClick={() => {
                  onTabChange('coupons');
                  onCloseMobileDrawer();
                }}
                className="w-full py-2.5 px-3 rounded-xl text-left text-xs font-bold text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-hover flex items-center gap-2"
              >
                <Tag className="w-4 h-4 text-amber-500" />
                <span>Cupons de Desconto Verificados</span>
              </button>
            </div>

            {/* Department Accordion in Mobile Drawer */}
            <div className="space-y-2 flex-1">
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-1">
                Categorias Principais
              </div>

              {CATEGORIES_TREE.map((cat) => {
                const isExpanded = expandedMobileCat === cat.id;

                return (
                  <div key={cat.id} className="rounded-2xl border border-gray-100 dark:border-dark-border/60 overflow-hidden">
                    <button
                      onClick={() => setExpandedMobileCat(isExpanded ? null : cat.id)}
                      className="w-full py-2.5 px-3 flex items-center justify-between text-xs font-bold text-gray-900 dark:text-white bg-gray-50/60 dark:bg-dark-card"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-amber-500">{CATEGORY_ICONS[cat.id]}</span>
                        <span>{cat.name}</span>
                      </div>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
                          isExpanded ? 'rotate-180 text-amber-500' : ''
                        }`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="p-3 space-y-3 bg-white dark:bg-dark-surface border-t border-gray-100 dark:border-dark-border">
                        <button
                          onClick={() => {
                            onSelectCategory(cat.id);
                            onCloseMobileDrawer();
                          }}
                          className="w-full text-left py-1.5 px-2 rounded-lg text-xs font-black text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                        >
                          Ver tudo em {cat.name} ({cat.itemCount})
                        </button>

                        {cat.subcategories.map((sub) => (
                          <div key={sub.id} className="space-y-1 pl-2">
                            <button
                              onClick={() => {
                                onSelectSubcategory(cat.id, sub.id);
                                onCloseMobileDrawer();
                              }}
                              className="text-left text-[11px] font-bold text-gray-800 dark:text-gray-200 block"
                            >
                              {sub.name}
                            </button>
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {sub.brands.map((brand) => (
                                <button
                                  key={brand}
                                  onClick={() => {
                                    onSelectSubcategory(cat.id, sub.id);
                                    onSelectBrand(brand);
                                    onCloseMobileDrawer();
                                  }}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 dark:bg-dark-card text-gray-600 dark:text-gray-400"
                                >
                                  {brand}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
