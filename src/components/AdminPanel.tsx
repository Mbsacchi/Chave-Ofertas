import React, { useState, useEffect, useRef, useMemo } from 'react';
import { KeyLogo } from './KeyLogo';
import { 
  supabase, 
  isAnonKeyMissing,
  SUPABASE_SQL_SCHEMA 
} from '../lib/supabase';
import { 
  fetchDraftProducts, 
  addDraftProduct, 
  updateDraftProduct, 
  deleteDraftProduct, 
  publishDraftToVitrine, 
  deletePublishedProduct,
  updatePublishedProduct,
  removeStoreOfferFromProduct,
  addOfferToExistingProduct,
  fetchAllGlobalProducts,
  syncAwinOffers
} from '../services/adminService';
import { DraftProduct, Product, StoreId } from '../types';
import { fuzzyMatch } from '../lib/search/fuzzyMatch';
import { 
  ShieldCheck, 
  Lock, 
  Trash2, 
  UploadCloud, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  LogOut, 
  Layers, 
  RefreshCw, 
  Eye, 
  ArrowLeft, 
  ShoppingBag, 
  Sparkles, 
  ImageIcon, 
  Tag, 
  DollarSign, 
  Link as LinkIcon, 
  Truck, 
  RotateCcw, 
  Pencil, 
  Percent, 
  FileEdit, 
  Search, 
  Store as StoreIcon, 
  Plus, 
  X, 
  CheckCheck, 
  Filter, 
  ArrowUpDown 
} from 'lucide-react';
import { CATEGORIES_TREE } from '../data/mockData';

// Whitelist of authorized admin emails
const ALLOWED_ADMIN_EMAILS = [
  'murilobozolans@gmail.com',
  'chaveofertas0@gmail.com'
];

const POPULAR_STORES = [
  { id: 'mercadolivre', name: 'Mercado Livre' },
  { id: 'amazon', name: 'Amazon' },
  { id: 'shopee', name: 'Shopee' },
  { id: 'magalu', name: 'Magazine Luiza' },
  { id: 'kabum', name: 'KaBuM!' },
];

interface AdminPanelProps {
  onBackToVitrine: () => void;
  onProductPublished?: (product: Product) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  onBackToVitrine,
  onProductPublished 
}) => {
  // Auth state - generic empty string initial value
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Active view tab in admin
  const [activeTab, setActiveTab] = useState<'create' | 'staging' | 'published' | 'sql'>('create');

  // Staging Drafts & Published state
  const [drafts, setDrafts] = useState<DraftProduct[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [publishedProducts, setPublishedProducts] = useState<Product[]>([]);

  // Autocomplete Search states with Fuzzy Search support
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [selectedExistingProduct, setSelectedExistingProduct] = useState<Product | null>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  // Edit Mode state
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Form Fields
  const [manualTitle, setManualTitle] = useState('');
  const [manualStoreName, setManualStoreName] = useState('Mercado Livre');
  const [manualOriginalPrice, setManualOriginalPrice] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualImageUrl, setManualImageUrl] = useState('');
  const [manualAffiliateUrl, setManualAffiliateUrl] = useState('');
  const [manualCategoryId, setManualCategoryId] = useState(CATEGORIES_TREE[0]?.id || 'eletronicos');
  const [manualFreeShipping, setManualFreeShipping] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncingAwin, setIsSyncingAwin] = useState(false);

  // Table Filters & Sorting state (Vitrine Publicada)
  const [tableCategoryFilter, setTableCategoryFilter] = useState('all');
  const [tableStoreFilter, setTableStoreFilter] = useState('all');
  const [tableSortBy, setTableSortBy] = useState<'name-asc' | 'name-desc' | 'price-asc' | 'price-desc'>('name-asc');

  // Action status feedbacks
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  // Check initial session
  useEffect(() => {
    let mounted = true;
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setSessionUser(session?.user || null);
          setAuthLoading(false);
        }
      } catch {
        if (mounted) setAuthLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user || null);
      if (session?.user) {
        loadDraftsAndProducts();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target as Node)) {
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadDraftsAndProducts = async () => {
    setDraftsLoading(true);
    try {
      const [draftsData, prodsData] = await Promise.all([
        fetchDraftProducts(),
        fetchAllGlobalProducts(),
      ]);
      setDrafts(draftsData);
      setPublishedProducts(prodsData);
    } catch (err: any) {
      console.error('Failed to load data:', err);
    } finally {
      setDraftsLoading(false);
    }
  };

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setActionFeedback({ type, message });
    setTimeout(() => setActionFeedback(null), 4000);
  };

  // Login handler with strict email whitelist
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const normalizedEmail = email.trim().toLowerCase();

    // Strict whitelist check
    if (!ALLOWED_ADMIN_EMAILS.includes(normalizedEmail)) {
      setAuthError('Acesso Negado: Este e-mail não possui privilégios de administrador.');
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setAuthError('Senha incorreta ou usuário não cadastrado no Supabase.');
        } else {
          setAuthError(error.message);
        }
        return;
      }

      setSessionUser(data.user);
      loadDraftsAndProducts();
      showFeedback('success', 'Acesso administrativo autorizado!');
    } catch (err: any) {
      setAuthError(err.message || 'Erro ao autenticar.');
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
    }
    setSessionUser(null);
    showFeedback('success', 'Sessão encerrada com sucesso.');
  };

  // Helper to parse numeric float
  const parseNum = (str: string) => {
    const clean = str.toString().replace(/[^\d.,]/g, '').replace(',', '.');
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : val;
  };

  // Discount calculation formula
  const calcDiscountPercent = (orig: number, promo: number): number => {
    if (orig > promo && promo > 0) {
      return Math.round(((orig - promo) / orig) * 100);
    }
    return 0;
  };

  const currentParsedOriginalPrice = parseNum(manualOriginalPrice);
  const currentParsedPrice = parseNum(manualPrice);
  const calculatedDiscount = calcDiscountPercent(currentParsedOriginalPrice, currentParsedPrice);

  // Active product being edited or linked
  const activeProduct = editingProductId 
    ? publishedProducts.find(p => p.id === editingProductId) 
    : selectedExistingProduct;

  // Check if the currently selected store already has an offer in this product
  const currentStoreOffer = useMemo(() => {
    if (!activeProduct || !activeProduct.offers) return null;
    return activeProduct.offers.find(
      (o) => o.storeName.toLowerCase() === manualStoreName.trim().toLowerCase()
    ) || null;
  }, [activeProduct, manualStoreName]);

  const currentStoreHasOffer = Boolean(currentStoreOffer);

  // 1. ISOLAMENTO DE OFERTAS: Troca de loja no formulário
  const handleStoreSelect = (newStoreName: string) => {
    setManualStoreName(newStoreName);

    if (activeProduct && activeProduct.offers) {
      const match = activeProduct.offers.find(
        (o) => o.storeName.toLowerCase() === newStoreName.trim().toLowerCase()
      );

      if (match) {
        // Se a loja já existe no produto, preenche os campos com os dados dela
        setManualOriginalPrice(match.originalPrice ? match.originalPrice.toString() : '');
        setManualPrice(match.price ? match.price.toString() : '');
        setManualAffiliateUrl(match.affiliateUrl || '');
        setManualFreeShipping(match.freeShipping ?? true);
        showFeedback('success', `Carregando oferta existente da loja "${newStoreName}".`);
      } else {
        // Se não existe, limpa os campos para adicionar nova loja ao produto
        setManualOriginalPrice('');
        setManualPrice('');
        setManualAffiliateUrl('');
        setManualFreeShipping(true);
        showFeedback('success', `Loja "${newStoreName}" ainda não cadastrada. Preencha os campos para adicioná-la.`);
      }
    }
  };

  // 2. BUSCA APROXIMADA (FUZZY SEARCH COM LEVENSHTEIN) NO AUTOCOMPLETE
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (!value.trim()) {
      setSuggestions([]);
      setSelectedExistingProduct(null);
      return;
    }

    const matches = publishedProducts.filter((p) => {
      // 1. Testar título com similaridade de string (Fuzzy/Levenshtein)
      if (fuzzyMatch(p.title, value)) return true;

      // 2. Testar marca
      if (p.brand && fuzzyMatch(p.brand, value)) return true;

      // 3. Testar categoria
      if (p.categoryName && fuzzyMatch(p.categoryName, value)) return true;

      // 4. Testar nomes das lojas parceiras nas ofertas
      if (p.offers && p.offers.some(o => fuzzyMatch(o.storeName, value))) return true;

      // 5. Testar palavras-chave de busca
      if (p.searchKeywords && p.searchKeywords.some(k => fuzzyMatch(k, value))) return true;

      return false;
    });

    setSuggestions(matches);

    // If user modifies text, reset selection unless it matches title
    if (selectedExistingProduct && selectedExistingProduct.title !== value) {
      setSelectedExistingProduct(null);
    }
  };

  // Select an existing product suggestion
  const handleSelectSuggestion = (prod: Product) => {
    setSearchQuery(prod.title);
    setSelectedExistingProduct(prod);
    setSuggestions([]); // Fecha o dropdown
    setEditingProductId(null);

    // Find next store not yet added or default to primary
    const existingStores = prod.offers?.map(o => o.storeName.toLowerCase()) || [];
    const nextStore = POPULAR_STORES.find(s => !existingStores.includes(s.name.toLowerCase()))?.name || 'Amazon';
    
    handleStoreSelect(nextStore);
    showFeedback('success', `Produto "${prod.title.slice(0, 30)}..." selecionado.`);
  };

  // Clear Form inputs
  const handleClearForm = () => {
    setSelectedExistingProduct(null);
    setSearchQuery('');
    setSuggestions([]);
    setEditingProductId(null);
    setManualTitle('');
    setManualStoreName('Mercado Livre');
    setManualOriginalPrice('');
    setManualPrice('');
    setManualImageUrl('');
    setManualAffiliateUrl('');
    setManualFreeShipping(true);
  };

  // Submit Form: Add Offer to Existing Product OR Save New Draft OR Update Published Product
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validar Preço Promocional
    if (currentParsedPrice <= 0) {
      showFeedback('error', 'Por favor, informe um Preço Promocional válido.');
      return;
    }

    // 2. Validar Link de Afiliado
    if (!manualAffiliateUrl.trim()) {
      showFeedback('error', 'Por favor, informe o Link de Afiliado (URL encurtada).');
      return;
    }

    // Preço original e desconto
    let finalOriginalPrice = currentParsedOriginalPrice;
    if (finalOriginalPrice <= currentParsedPrice) {
      finalOriginalPrice = Math.round(currentParsedPrice * 1.15);
    }
    const finalDiscountPercent = calcDiscountPercent(finalOriginalPrice, currentParsedPrice) || 15;

    setIsSubmitting(true);
    try {
      // CENÁRIO A: Adicionar ou Atualizar oferta em produto existente via Comparador
      if (selectedExistingProduct) {
        const updated = await addOfferToExistingProduct({
          productId: selectedExistingProduct.id,
          storeName: manualStoreName.trim(),
          price: currentParsedPrice,
          originalPrice: finalOriginalPrice,
          affiliateUrl: manualAffiliateUrl.trim(),
          freeShipping: manualFreeShipping,
        });

        setPublishedProducts(prev => prev.map(p => (p.id === updated.id ? updated : p)));
        onProductPublished?.(updated);
        handleClearForm();
        showFeedback('success', `Oferta da loja "${manualStoreName}" salva com sucesso no comparador!`);
        setActiveTab('published');
      } 
      // CENÁRIO B: Editando um produto publicado existente (Isolando a oferta da loja selecionada)
      else if (editingProductId) {
        const selectedCategory = CATEGORIES_TREE.find(c => c.id === manualCategoryId) || CATEGORIES_TREE[0];
        const defaultSubcategory = selectedCategory.subcategories[0];

        const updated = await updatePublishedProduct(editingProductId, {
          title: manualTitle.trim(),
          price: currentParsedPrice,
          originalPrice: finalOriginalPrice,
          imageUrl: manualImageUrl.trim(),
          affiliateUrl: manualAffiliateUrl.trim(),
          storeName: manualStoreName.trim(),
          categoryId: selectedCategory.id,
          categoryName: selectedCategory.name,
          subcategoryId: defaultSubcategory?.id,
          subcategoryName: defaultSubcategory?.name,
          freeShipping: manualFreeShipping,
        });

        setPublishedProducts(prev => prev.map(p => (p.id === editingProductId ? updated : p)));
        onProductPublished?.(updated);
        handleClearForm();
        showFeedback('success', `Oferta da loja "${manualStoreName}" no produto "${updated.title.slice(0, 25)}..." salva na Vitrine!`);
        setActiveTab('published');
      } 
      // CENÁRIO C: Cadastrar NOVO produto (Fluxo de Rascunho Obrigatório)
      else {
        if (!manualTitle.trim()) {
          showFeedback('error', 'Por favor, informe o Título do Produto.');
          setIsSubmitting(false);
          return;
        }
        if (!manualImageUrl.trim()) {
          showFeedback('error', 'Por favor, informe a URL da Imagem do produto.');
          setIsSubmitting(false);
          return;
        }

        const selectedCategory = CATEGORIES_TREE.find(c => c.id === manualCategoryId) || CATEGORIES_TREE[0];
        const defaultSubcategory = selectedCategory.subcategories[0];

        const rawStore = manualStoreName.toLowerCase().replace(/\s+/g, '');
        let storeId: StoreId = 'mercadolivre';
        if (rawStore.includes('amazon')) storeId = 'amazon';
        else if (rawStore.includes('shopee')) storeId = 'shopee';
        else if (rawStore.includes('magalu') || rawStore.includes('magazine')) storeId = 'magalu';
        else if (rawStore.includes('kabum')) storeId = 'kabum';

        const newDraft = await addDraftProduct({
          externalId: `manual-${Date.now()}`,
          title: manualTitle.trim(),
          brand: manualStoreName.trim(),
          description: `${manualTitle.trim()} com garantia oficial e melhores condições na loja ${manualStoreName}.`,
          categoryId: selectedCategory.id,
          categoryName: selectedCategory.name,
          subcategoryId: defaultSubcategory?.id,
          subcategoryName: defaultSubcategory?.name,
          imageUrl: manualImageUrl.trim(),
          originalPrice: finalOriginalPrice,
          promotionalPrice: currentParsedPrice,
          discountPercent: finalDiscountPercent,
          affiliateUrl: manualAffiliateUrl.trim(),
          storeId,
          storeName: manualStoreName.trim(),
          freeShipping: manualFreeShipping,
          installment: '10x sem juros',
        });

        setDrafts(prev => [newDraft, ...prev]);
        handleClearForm();
        showFeedback('success', `"${newDraft.title.slice(0, 30)}..." salvo na Fila de Rascunhos (status: draft)!`);
        setActiveTab('staging');
      }

      loadDraftsAndProducts();
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro ao processar formulário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. EXCLUSÃO INDIVIDUAL DE LOJAS
  const handleRemoveCurrentStoreOffer = async () => {
    if (!activeProduct) return;

    if (!window.confirm(`Tem certeza que deseja remover APENAS a oferta da loja "${manualStoreName}" deste produto? As outras lojas permanecerão intactas.`)) {
      return;
    }

    try {
      setIsSubmitting(true);
      const updated = await removeStoreOfferFromProduct(activeProduct.id, manualStoreName.trim());
      setPublishedProducts(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      onProductPublished?.(updated);

      // Alterna para a primeira loja restante do produto
      const firstRemainingOffer = updated.offers[0];
      if (firstRemainingOffer) {
        setManualStoreName(firstRemainingOffer.storeName);
        setManualOriginalPrice(firstRemainingOffer.originalPrice ? firstRemainingOffer.originalPrice.toString() : '');
        setManualPrice(firstRemainingOffer.price ? firstRemainingOffer.price.toString() : '');
        setManualAffiliateUrl(firstRemainingOffer.affiliateUrl || '');
        setManualFreeShipping(firstRemainingOffer.freeShipping ?? true);
      } else {
        handleClearForm();
      }

      showFeedback('success', `Oferta da loja "${manualStoreName}" removida com sucesso!`);
      loadDraftsAndProducts();
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro ao remover loja.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start Editing Published Product
  const handleEditPublishedProduct = (product: Product) => {
    const primaryOffer = product.offers[0];
    setSelectedExistingProduct(null);
    setSearchQuery('');
    setSuggestions([]);
    setEditingProductId(product.id);
    setManualTitle(product.title);
    setManualStoreName(primaryOffer?.storeName || product.bestStore || 'Mercado Livre');
    setManualOriginalPrice(primaryOffer?.originalPrice ? primaryOffer.originalPrice.toString() : (product.maxPrice ? product.maxPrice.toString() : ''));
    setManualPrice(primaryOffer?.price ? primaryOffer.price.toString() : (product.minPrice ? product.minPrice.toString() : ''));
    setManualImageUrl(product.imageUrl);
    setManualAffiliateUrl(primaryOffer?.affiliateUrl || '');
    setManualCategoryId(product.categoryId);
    setManualFreeShipping(primaryOffer?.freeShipping ?? true);

    setActiveTab('create');
    showFeedback('success', `Carregando "${product.title.slice(0, 25)}..." para edição no formulário.`);
  };

  // Quick action from Published list to Add Another Store Offer
  const handleAddStoreOfferToProduct = (product: Product) => {
    setSelectedExistingProduct(product);
    setSearchQuery(product.title);
    setSuggestions([]);
    setEditingProductId(null);

    const existingStores = product.offers?.map(o => o.storeName.toLowerCase()) || [];
    const nextStore = POPULAR_STORES.find(s => !existingStores.includes(s.name.toLowerCase()))?.name || 'Amazon';
    
    setManualStoreName(nextStore);
    setManualOriginalPrice('');
    setManualPrice('');
    setManualAffiliateUrl('');
    setManualFreeShipping(true);
    setActiveTab('create');
    showFeedback('success', `Pronto para adicionar oferta da loja "${nextStore}" ao produto "${product.title.slice(0, 25)}...".`);
  };

  // Delete Published Product Entirely
  const handleDeletePublishedProduct = async (productId: string) => {
    if (!window.confirm('Tem certeza que deseja remover este produto completo da Vitrine Publicada?')) {
      return;
    }

    try {
      await deletePublishedProduct(productId);
      setPublishedProducts(prev => prev.filter(p => p.id !== productId));
      showFeedback('success', 'Produto removido da Vitrine com sucesso.');
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro ao excluir produto.');
    }
  };

  // Synchronize deals & coupons from Awin Affiliate Network
  const handleSyncAwin = async () => {
    setIsSyncingAwin(true);
    try {
      const result = await syncAwinOffers();
      showFeedback('success', result.message || `${result.count} ofertas da rede Awin sincronizadas com sucesso!`);
      await loadDraftsAndProducts();
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro ao sincronizar ofertas da Awin.');
    } finally {
      setIsSyncingAwin(false);
    }
  };

  // Update Draft Fields in Staging
  const handleUpdateDraftField = async (id: string, field: keyof DraftProduct, value: any) => {
    try {
      const updated = await updateDraftProduct(id, { [field]: value });
      setDrafts(prev => prev.map(d => (d.id === id ? updated : d)));
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro ao atualizar rascunho.');
    }
  };

  // Delete Draft
  const handleDeleteDraft = async (id: string) => {
    try {
      await deleteDraftProduct(id);
      setDrafts(prev => prev.filter(d => d.id !== id));
      showFeedback('success', 'Rascunho removido da fila.');
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro ao remover rascunho.');
    }
  };

  // Publish Draft from Staging to Live Vitrine
  const handlePublishDraft = async (draft: DraftProduct) => {
    if (!draft.affiliateUrl || !draft.affiliateUrl.trim()) {
      showFeedback('error', 'Por favor, insira o link de afiliado antes de publicar.');
      return;
    }

    try {
      const published = await publishDraftToVitrine(draft);
      setDrafts(prev => prev.filter(d => d.id !== draft.id));
      setPublishedProducts(prev => [published, ...prev]);
      onProductPublished?.(published);
      showFeedback('success', `"${published.title.slice(0, 30)}..." publicado com sucesso na Vitrine Oficial!`);
      setActiveTab('published');
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro ao publicar produto.');
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    showFeedback('success', 'Script SQL copiado para a área de transferência!');
    setTimeout(() => setCopiedSql(false), 3000);
  };

  // 4. FILTROS E ORDENAÇÃO NA TABELA (Vitrine Publicada)
  const uniqueCategories = useMemo(() => {
    return Array.from(
      new Set(publishedProducts.map((p) => p.categoryName || 'Geral'))
    ).filter(Boolean).sort();
  }, [publishedProducts]);

  const uniqueStores = useMemo(() => {
    const storesSet = new Set<string>();
    publishedProducts.forEach((p) => {
      if (p.offers && p.offers.length > 0) {
        p.offers.forEach((o) => storesSet.add(o.storeName));
      } else if (p.bestStore) {
        storesSet.add(p.bestStore);
      }
    });
    return Array.from(storesSet).filter(Boolean).sort();
  }, [publishedProducts]);

  const displayedPublishedProducts = useMemo(() => {
    return publishedProducts
      .filter((p) => {
        // 1. Filtrar por Categoria
        if (tableCategoryFilter !== 'all' && (p.categoryName || 'Geral') !== tableCategoryFilter) {
          return false;
        }
        // 2. Filtrar por Loja
        if (tableStoreFilter !== 'all') {
          const hasStore = p.offers?.some(
            (o) => o.storeName.toLowerCase() === tableStoreFilter.toLowerCase()
          ) || p.bestStore?.toLowerCase() === tableStoreFilter.toLowerCase();
          if (!hasStore) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Obter menor preço da lista de ofertas
        const minPriceA = a.offers && a.offers.length > 0
          ? Math.min(...a.offers.map((o) => o.price))
          : a.minPrice;
        const minPriceB = b.offers && b.offers.length > 0
          ? Math.min(...b.offers.map((o) => o.price))
          : b.minPrice;

        switch (tableSortBy) {
          case 'name-asc':
            return a.title.localeCompare(b.title, 'pt-BR');
          case 'name-desc':
            return b.title.localeCompare(a.title, 'pt-BR');
          case 'price-asc':
            return minPriceA - minPriceB;
          case 'price-desc':
            return minPriceB - minPriceA;
          default:
            return 0;
        }
      });
  }, [publishedProducts, tableCategoryFilter, tableStoreFilter, tableSortBy]);

  // Loading indicator
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 p-4">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-300">Carregando painel de administração...</p>
      </div>
    );
  }

  // LOGIN SCREEN (100% GENERIC & SECURE)
  if (!sessionUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <KeyLogo size="lg" />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-400/10 text-amber-400 border border-amber-400/20 mb-2">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-white">Painel Administrativo</h2>
              <p className="text-xs text-slate-400">
                Acesso restrito para gerenciamento de ofertas e comparador de preços.
              </p>
            </div>

            {authError && (
              <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{authError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  E-mail de Administrador
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ex: admin@seu-site.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Senha de Acesso
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-98 transition-all shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2 text-sm mt-2"
              >
                <Lock className="w-4 h-4" />
                <span>Entrar no Painel Admin</span>
              </button>

              <div className="flex items-center justify-center text-xs text-slate-400 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={onBackToVitrine}
                  className="hover:text-amber-400 transition-colors flex items-center gap-1.5 font-medium py-1 px-3 rounded-lg hover:bg-slate-800"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar para a Vitrine</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Active Preview Item
  const previewImageUrl = activeProduct ? activeProduct.imageUrl : manualImageUrl;
  const previewTitle = activeProduct ? activeProduct.title : manualTitle;

  // AUTHENTICATED ADMIN DASHBOARD
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="cursor-pointer" onClick={onBackToVitrine} title="Voltar à Vitrine">
            <KeyLogo size="sm" />
          </div>
          <div className="h-5 w-px bg-slate-800 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Painel Comparador & Ofertas
            </span>
          </div>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-bold text-white">{sessionUser.email || 'Administrador'}</span>
            <span className="text-[10px] text-emerald-400 flex items-center justify-end gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Sessão Autenticada
            </span>
          </div>

          <button
            onClick={onBackToVitrine}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ver Vitrine</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 text-xs font-bold transition-colors"
            title="Encerrar sessão"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* Global Feedback Banner */}
      {actionFeedback && (
        <div className={`fixed top-16 right-4 z-50 p-4 rounded-2xl shadow-2xl border flex items-center gap-3 text-xs font-bold animate-in slide-in-from-top-4 duration-200 ${
          actionFeedback.type === 'success'
            ? 'bg-emerald-950 text-emerald-200 border-emerald-800'
            : 'bg-rose-950 text-rose-200 border-rose-800'
        }`}>
          {actionFeedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{actionFeedback.message}</span>
        </div>
      )}

      {/* Dashboard Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Conditional Warning Banner when logged in but anon key is missing/placeholder */}
        {isAnonKeyMissing && (
          <div className="p-4 rounded-2xl bg-amber-950/70 border border-amber-500/80 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3 text-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-amber-300">Modo Local Seguro (Chave Supabase Pendente): </span>
                <span>Insira sua chave pública anon no arquivo <code className="px-1 py-0.5 rounded bg-slate-950 text-amber-300 font-mono">.env</code> para sincronizar com o banco em nuvem.</span>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('sql')}
              className="px-3.5 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs shrink-0 hover:bg-amber-300 transition-colors"
            >
              Ver Guia SQL & .env
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'create'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {selectedExistingProduct ? (
              <StoreIcon className="w-4 h-4" />
            ) : editingProductId ? (
              <FileEdit className="w-4 h-4" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>
              {selectedExistingProduct 
                ? 'Adicionar Loja a Produto Existente' 
                : editingProductId 
                  ? 'Editando Oferta' 
                  : 'Cadastrar Oferta / Comparador'}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('staging');
              loadDraftsAndProducts();
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'staging'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Fila de Rascunhos</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-950 text-amber-400">
              {drafts.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('published');
              loadDraftsAndProducts();
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'published'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Vitrine Publicada</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-950 text-emerald-400">
              {publishedProducts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('sql')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'sql'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Schema SQL & .env</span>
          </button>
        </div>

        {/* TAB 1: COMPARATOR FORM WITH AUTOCOMPLETE (FUZZY SEARCH) & ISOLATED STORE OFFERS */}
        {activeTab === 'create' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-150">
            {/* Form Section */}
            <div className="lg:col-span-8 p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl">
              
              {/* Autocomplete Search for Existing Products (Fuzzy Search Enabled) */}
              <div ref={searchDropdownRef} className="space-y-2 pb-5 border-b border-slate-800 relative">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-amber-400" />
                    <span>Buscar produto existente na Vitrine (Busca Inteligente / Fuzzy)</span>
                  </label>
                  {(searchQuery || selectedExistingProduct || editingProductId) && (
                    <button
                      type="button"
                      onClick={handleClearForm}
                      className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 transition-colors"
                    >
                      <X className="w-3 h-3" />
                      <span>Limpar busca / Cadastrar Produto Novo</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={handleSearchChange}
                      placeholder="Buscar produto existente... (Ex: playstatin, iphne, jbl, samsung...)"
                      className="w-full pl-10 pr-10 py-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors shadow-inner"
                    />
                    <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-4" />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={handleClearForm}
                        className="absolute right-3.5 top-3.5 p-1 rounded-lg text-slate-500 hover:text-white transition-colors"
                        title="Limpar campo de busca"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* BOTÃO DE SINCRONIZAÇÃO AWIN */}
                  <button
                    type="button"
                    onClick={handleSyncAwin}
                    disabled={isSyncingAwin}
                    className="py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-400/20 active:scale-98 disabled:opacity-50 shrink-0"
                    title="Sincronizar ofertas e cupons da rede de afiliados Awin"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncingAwin ? 'animate-spin' : ''}`} />
                    <span>{isSyncingAwin ? 'Sincronizando...' : 'Sincronizar Ofertas Awin'}</span>
                  </button>
                </div>

                {/* Floating Autocomplete Dropdown */}
                {suggestions.length > 0 && !selectedExistingProduct && (
                  <div className="absolute top-full left-0 right-0 z-30 mt-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden divide-y divide-gray-100 dark:divide-slate-800 max-h-80 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-4 py-2 bg-gray-50 dark:bg-slate-950/80 text-[11px] text-amber-600 dark:text-amber-400 font-bold flex items-center justify-between border-b border-gray-100 dark:border-slate-800">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{suggestions.length} produto(s) encontrado(s) (Fuzzy Match):</span>
                      </span>
                      <span className="text-[10px] text-gray-400">Clique para selecionar</span>
                    </div>

                    {suggestions.map((prod) => (
                      <div
                        key={prod.id}
                        onClick={() => handleSelectSuggestion(prod)}
                        className="p-3.5 hover:bg-amber-50/80 dark:hover:bg-slate-800/80 flex items-center gap-3.5 cursor-pointer transition-colors group"
                      >
                        <div className="w-12 h-12 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-sm border border-gray-200 dark:border-slate-700">
                          <img
                            src={prod.imageUrl}
                            alt={prod.title}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            {prod.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-extrabold">
                              Menor Preço: R$ {prod.minPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[10px] text-gray-400 dark:text-slate-400">
                              • {prod.offers?.length || 1} loja(s) vinculada(s)
                            </span>
                          </div>
                        </div>

                        <div className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 text-[11px] font-black shrink-0 group-hover:bg-amber-300 transition-colors shadow-sm">
                          + Adicionar Loja
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Existing / Editing Product Banner */}
              {activeProduct && (
                <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-800/80 flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-150 shadow-lg">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-sm border border-emerald-700">
                      <img
                        src={activeProduct.imageUrl}
                        alt={activeProduct.title}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-500 text-slate-950 uppercase tracking-wider">
                        {editingProductId ? 'Editando Ofertas do Produto' : 'Produto Vinculado'}
                      </span>
                      <h4 className="text-xs font-bold text-white truncate mt-1">
                        {activeProduct.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-emerald-300">
                          {activeProduct.offers?.length || 1} loja(s) cadastrada(s):
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {activeProduct.offers?.map((o) => (
                            <button
                              key={o.id}
                              type="button"
                              onClick={() => handleStoreSelect(o.storeName)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                                manualStoreName.toLowerCase() === o.storeName.toLowerCase()
                                  ? 'bg-amber-400 text-slate-950 border-amber-400'
                                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                              }`}
                            >
                              {o.storeName.split(' ')[0]}: R$ {o.price.toFixed(0)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleClearForm()}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold transition-colors shrink-0"
                    title="Desvincular e cadastrar novo produto"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Section Subtitle */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    {activeProduct ? (
                      <StoreIcon className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Sparkles className="w-5 h-5 text-amber-400" />
                    )}
                    <span>
                      {activeProduct 
                        ? `Oferta da Loja: ${manualStoreName}` 
                        : 'Dados do Novo Produto & Primeira Oferta'}
                    </span>
                  </h3>
                  {activeProduct && (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {currentStoreHasOffer 
                        ? `A loja "${manualStoreName}" já possui uma oferta cadastrada. Altere os valores abaixo para atualizá-la ou remova-a.`
                        : `A loja "${manualStoreName}" ainda não possui oferta. Preencha os campos para inseri-la.`}
                    </p>
                  )}
                </div>

                {(manualTitle || manualPrice || manualOriginalPrice || manualImageUrl || manualAffiliateUrl || activeProduct) && (
                  <button
                    type="button"
                    onClick={handleClearForm}
                    className="text-xs text-slate-400 hover:text-rose-400 font-bold flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Limpar Formulário</span>
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmitForm} className="space-y-5">
                {/* Título & Imagem (Ocultos se o produto já existir / estiver sendo editado) */}
                {!activeProduct && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-amber-400" />
                        <span>Título do Produto *</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={manualTitle}
                        onChange={(e) => setManualTitle(e.target.value)}
                        placeholder="Ex: Fone de Ouvido Bluetooth JBL Tune 510BT Preto"
                        className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors shadow-inner"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                        <span>URL da Imagem do Produto *</span>
                      </label>
                      <input
                        type="url"
                        required
                        value={manualImageUrl}
                        onChange={(e) => setManualImageUrl(e.target.value)}
                        placeholder="Ex: https://http2.mlstatic.com/D_NQ_NP_688327-MLA46552310340_062021-O.webp"
                        className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 font-mono transition-colors shadow-inner"
                      />
                    </div>
                  </>
                )}

                {/* Loja da Oferta (Nome da Loja com Isolamento de Ofertas ao Clicar) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <StoreIcon className="w-3.5 h-3.5 text-amber-400" />
                      <span>Selecione a Loja Parceira *</span>
                    </label>
                    {activeProduct && currentStoreHasOffer && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                        ✓ Oferta Existente
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-2">
                    {POPULAR_STORES.map(s => {
                      const isSelected = manualStoreName.toLowerCase() === s.name.toLowerCase();
                      const hasOfferInProduct = Boolean(
                        activeProduct?.offers?.some(o => o.storeName.toLowerCase() === s.name.toLowerCase())
                      );

                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleStoreSelect(s.name)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-sm'
                              : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <span>{s.name}</span>
                          {hasOfferInProduct && (
                            <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-slate-950' : 'bg-emerald-400'}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <input
                    type="text"
                    required
                    value={manualStoreName}
                    onChange={(e) => handleStoreSelect(e.target.value)}
                    placeholder="Ou digite o nome de outra loja parceira..."
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>

                {/* Preço Original / De (R$) ANTES do Preço Promocional */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                      <span>Preço Original na {manualStoreName} / "De" (R$)</span>
                    </label>
                    <input
                      type="text"
                      value={manualOriginalPrice}
                      onChange={(e) => setManualOriginalPrice(e.target.value)}
                      placeholder="Ex: 299.90"
                      className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm font-semibold text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors shadow-inner"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-amber-400 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Preço Promocional na {manualStoreName} / "Por" (R$) *</span>
                      </span>
                      {calculatedDiscount > 0 && (
                        <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                          <Percent className="w-3 h-3" />
                          <span>{calculatedDiscount}% OFF</span>
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      required
                      value={manualPrice}
                      onChange={(e) => setManualPrice(e.target.value)}
                      placeholder="Ex: 199.90"
                      className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-amber-500/40 text-sm font-black text-amber-400 placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors shadow-inner"
                    />
                  </div>
                </div>

                {/* Link de Afiliado da Loja */}
                <div>
                  <label className="block text-xs font-bold text-amber-400 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>Link de Afiliado na {manualStoreName} (URL Encurtada) *</span>
                    </span>
                    {manualAffiliateUrl && (
                      <a
                        href={manualAffiliateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-normal"
                      >
                        <span>Testar Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </label>
                  <input
                    type="url"
                    required
                    value={manualAffiliateUrl}
                    onChange={(e) => setManualAffiliateUrl(e.target.value)}
                    placeholder={`Ex: link encurtado da loja ${manualStoreName}...`}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-amber-500/50 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 font-mono transition-colors shadow-inner"
                  />
                </div>

                {/* Categoria & Frete Grátis */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {!activeProduct && (
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Categoria da Vitrine
                      </label>
                      <select
                        value={manualCategoryId}
                        onChange={(e) => setManualCategoryId(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-400 transition-colors"
                      >
                        {CATEGORIES_TREE.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className={activeProduct ? 'sm:col-span-2' : ''}>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Opções de Destaque na {manualStoreName}
                    </label>
                    <label className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                      <input
                        type="checkbox"
                        checked={manualFreeShipping}
                        onChange={(e) => setManualFreeShipping(e.target.checked)}
                        className="w-4 h-4 accent-amber-400 rounded"
                      />
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                        <Truck className="w-4 h-4 text-emerald-400" />
                        <span>Destacar Frete Grátis nesta Loja</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Action Buttons with Botão de Exclusão Individual de Loja */}
                <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting || (!activeProduct && !manualTitle) || !manualPrice || (!activeProduct && !manualImageUrl) || !manualAffiliateUrl}
                    className={`flex-1 py-3.5 px-6 rounded-2xl font-black text-slate-950 active:scale-98 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm shadow-xl ${
                      selectedExistingProduct
                        ? 'bg-emerald-400 hover:bg-emerald-300 shadow-emerald-400/20'
                        : editingProductId
                        ? 'bg-sky-400 hover:bg-sky-300 shadow-sky-400/20'
                        : 'bg-amber-400 hover:bg-amber-300 shadow-amber-400/20'
                    }`}
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : selectedExistingProduct ? (
                      <Plus className="w-4 h-4" />
                    ) : editingProductId ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Layers className="w-4 h-4" />
                    )}
                    <span>
                      {isSubmitting 
                        ? 'Processando...' 
                        : selectedExistingProduct 
                          ? `Salvar Oferta da ${manualStoreName} no Produto`
                          : editingProductId 
                            ? `Salvar Alterações da Loja ${manualStoreName}` 
                            : 'Salvar Novo Produto como Rascunho'}
                    </span>
                  </button>

                  {/* BOTÃO DE EXCLUSÃO INDIVIDUAL DE LOJAS */}
                  {activeProduct && currentStoreHasOffer && (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleRemoveCurrentStoreOffer}
                      className="py-3.5 px-4 rounded-2xl font-bold text-rose-300 bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-xs flex items-center gap-1.5 transition-all active:scale-98"
                      title={`Remover apenas a oferta da loja ${manualStoreName}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Remover esta Loja ({manualStoreName})</span>
                    </button>
                  )}

                  {activeProduct && (
                    <button
                      type="button"
                      onClick={handleClearForm}
                      className="py-3.5 px-5 rounded-2xl font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 active:scale-98 transition-all text-xs"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Live Preview Card */}
            <div className="lg:col-span-4 space-y-4">
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    <span>Prévia da Oferta</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800">
                    {manualStoreName || 'Loja'}
                  </span>
                </div>

                <div className="rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl">
                  {/* Edge-to-Edge Image Header in pure white */}
                  <div className="w-full h-44 bg-white p-3 flex items-center justify-center relative border-b border-slate-800">
                    {previewImageUrl ? (
                      <img
                        src={previewImageUrl}
                        alt="Preview"
                        className="max-h-full max-w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="text-center p-4 space-y-1 text-slate-400">
                        <ImageIcon className="w-8 h-8 mx-auto stroke-1 text-slate-400" />
                        <p className="text-[10px]">A foto do produto aparecerá aqui</p>
                      </div>
                    )}

                    {manualFreeShipping && (
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-emerald-950/90 text-emerald-400 text-[10px] font-bold border border-emerald-800 flex items-center gap-1">
                        <Truck className="w-3 h-3" />
                        <span>Frete Grátis</span>
                      </span>
                    )}

                    {calculatedDiscount > 0 && (
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-black shadow-md">
                        -{calculatedDiscount}% OFF
                      </span>
                    )}
                  </div>

                  <div className="p-4 space-y-2">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                      {manualStoreName} Oficial
                    </span>
                    <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug">
                      {previewTitle || 'Título do Produto aparecerá aqui...'}
                    </h4>

                    <div className="pt-2 flex items-baseline gap-2">
                      <span className="text-lg font-black text-emerald-400">
                        R$ {currentParsedPrice > 0 ? currentParsedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                      </span>
                      {currentParsedOriginalPrice > currentParsedPrice && (
                        <span className="text-xs text-slate-500 line-through">
                          R$ {currentParsedOriginalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800">
                      <div className="w-full py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md">
                        <span>Ver na {manualStoreName}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: STAGING DRAFTS QUEUE */}
        {activeTab === 'staging' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 border border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20 uppercase tracking-wider">
                    Status: draft (Rascunho)
                  </span>
                </div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-400" />
                  <span>Fila de Rascunhos ({drafts.length})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Novos produtos cadastrados entram aqui primeiro. Clique em <strong>Publicar</strong> para enviar à Vitrine Oficial.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadDraftsAndProducts}
                  disabled={draftsLoading}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${draftsLoading ? 'animate-spin' : ''}`} />
                  <span>Atualizar</span>
                </button>
              </div>
            </div>

            {drafts.length === 0 ? (
              <div className="p-12 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
                <Layers className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="text-base font-bold text-white">Nenhum rascunho pendente</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Cadastre novos produtos no formulário para enfileirá-los e publicá-los quando desejar.
                </p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-amber-400/20 mt-2"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Cadastrar Oferta</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-4 shadow-xl"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* Edge-to-edge style preview */}
                      <div className="lg:col-span-2 aspect-square rounded-2xl bg-white p-2 flex items-center justify-center border border-slate-700 shadow-sm overflow-hidden">
                        <img
                          src={draft.imageUrl}
                          alt={draft.title}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>

                      {/* Product Details & Inputs */}
                      <div className="lg:col-span-10 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">
                              Título do Produto
                            </label>
                            <input
                              type="text"
                              value={draft.title}
                              onChange={(e) => handleUpdateDraftField(draft.id, 'title', e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-400"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">
                              Categoria da Vitrine
                            </label>
                            <select
                              value={draft.categoryId}
                              onChange={(e) => {
                                const cat = CATEGORIES_TREE.find(c => c.id === e.target.value);
                                handleUpdateDraftField(draft.id, 'categoryId', e.target.value);
                                if (cat) {
                                  handleUpdateDraftField(draft.id, 'categoryName', cat.name);
                                }
                              }}
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-400"
                            >
                              {CATEGORIES_TREE.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Pricing Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">
                              Preço Original / "De" (R$)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={draft.originalPrice}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                handleUpdateDraftField(draft.id, 'originalPrice', val);
                                const newDiscount = calcDiscountPercent(val, draft.promotionalPrice);
                                handleUpdateDraftField(draft.id, 'discountPercent', newDiscount);
                              }}
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-amber-400 mb-1 flex items-center justify-between">
                              <span>Preço Promocional (R$)</span>
                              {draft.discountPercent > 0 && (
                                <span className="text-[10px] font-black text-emerald-400">-{draft.discountPercent}%</span>
                              )}
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={draft.promotionalPrice}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                handleUpdateDraftField(draft.id, 'promotionalPrice', val);
                                const newDiscount = calcDiscountPercent(draft.originalPrice, val);
                                handleUpdateDraftField(draft.id, 'discountPercent', newDiscount);
                              }}
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-amber-500/40 text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-400"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">
                              Loja do Produto
                            </label>
                            <input
                              type="text"
                              value={draft.storeName}
                              onChange={(e) => handleUpdateDraftField(draft.id, 'storeName', e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                            />
                          </div>
                        </div>

                        {/* Affiliate URL */}
                        <div>
                          <label className="block text-[11px] font-bold text-amber-400 mb-1 flex items-center justify-between">
                            <span>Link de Afiliado Oficial (Destino do Botão de Compra) *</span>
                            <span className="text-[10px] text-slate-500 font-normal">Ex: https://meli.la/xxxxxx</span>
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="url"
                              required
                              value={draft.affiliateUrl}
                              onChange={(e) => handleUpdateDraftField(draft.id, 'affiliateUrl', e.target.value)}
                              placeholder="Cole o link com seu ID de afiliado..."
                              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-amber-500/40 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 font-mono"
                            />
                            {draft.affiliateUrl && (
                              <a
                                href={draft.affiliateUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1 shrink-0"
                                title="Testar link de afiliado"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Testar</span>
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons: Publish or Delete */}
                        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80">
                          <button
                            onClick={() => handleDeleteDraft(draft.id)}
                            className="px-3.5 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-xs font-bold flex items-center gap-1.5 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remover Rascunho</span>
                          </button>

                          <button
                            onClick={() => handlePublishDraft(draft)}
                            className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-slate-950 font-black text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                          >
                            <UploadCloud className="w-4 h-4" />
                            <span>Publicar na Vitrine</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PUBLISHED PRODUCTS COMPARATOR TABLE WITH TOOLBAR FILTERS & SORT */}
        {activeTab === 'published' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 border border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 uppercase tracking-wider">
                    Status: published (Comparador Ativo)
                  </span>
                </div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-emerald-400" />
                  <span>Vitrine Publicada & Comparador ({displayedPublishedProducts.length} de {publishedProducts.length})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Produtos ativos no comparador. Clique em <strong>+ Loja</strong> para adicionar ofertas de outras lojas ao mesmo produto.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadDraftsAndProducts}
                  disabled={draftsLoading}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${draftsLoading ? 'animate-spin' : ''}`} />
                  <span>Atualizar Lista</span>
                </button>

                <button
                  onClick={onBackToVitrine}
                  className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-400/20"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver Vitrine</span>
                </button>
              </div>
            </div>

            {/* TOOLBAR COM 3 SELECTS (FILTRO CATEGORIA, FILTRO LOJA, ORDENAÇÃO) */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 shadow-lg">
              {/* Filtro por Categoria */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <Filter className="w-3 h-3 text-amber-400" />
                  <span>Filtrar por Categoria:</span>
                </label>
                <select
                  value={tableCategoryFilter}
                  onChange={(e) => setTableCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-400 transition-colors"
                >
                  <option value="all">Todas as Categorias ({publishedProducts.length})</option>
                  {uniqueCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat} ({publishedProducts.filter(p => (p.categoryName || 'Geral') === cat).length})
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro por Loja */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <StoreIcon className="w-3 h-3 text-emerald-400" />
                  <span>Filtrar por Loja:</span>
                </label>
                <select
                  value={tableStoreFilter}
                  onChange={(e) => setTableStoreFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-400 transition-colors"
                >
                  <option value="all">Todas as Lojas ({publishedProducts.length})</option>
                  {uniqueStores.map((store) => (
                    <option key={store} value={store}>
                      {store} ({publishedProducts.filter(p => p.offers?.some(o => o.storeName.toLowerCase() === store.toLowerCase()) || p.bestStore?.toLowerCase() === store.toLowerCase()).length})
                    </option>
                  ))}
                </select>
              </div>

              {/* Ordenação */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <ArrowUpDown className="w-3 h-3 text-sky-400" />
                  <span>Ordenar por:</span>
                </label>
                <select
                  value={tableSortBy}
                  onChange={(e) => setTableSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-400 transition-colors"
                >
                  <option value="name-asc">Nome (A-Z)</option>
                  <option value="name-desc">Nome (Z-A)</option>
                  <option value="price-asc">Menor Preço</option>
                  <option value="price-desc">Maior Preço</option>
                </select>
              </div>
            </div>

            {displayedPublishedProducts.length === 0 ? (
              <div className="p-12 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
                <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="text-base font-bold text-white">Nenhum produto corresponde aos filtros</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Tente alterar ou limpar os filtros de categoria e loja acima.
                </p>
                <button
                  onClick={() => {
                    setTableCategoryFilter('all');
                    setTableStoreFilter('all');
                    setTableSortBy('name-asc');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 hover:text-white font-bold text-xs inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Limpar Filtros</span>
                </button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider font-extrabold text-[11px]">
                        <th className="py-4 px-6">Produto</th>
                        <th className="py-4 px-4">Categoria</th>
                        <th className="py-4 px-4">Menor Preço</th>
                        <th className="py-4 px-4">Lojas no Comparador</th>
                        <th className="py-4 px-4 text-center">Status</th>
                        <th className="py-4 px-6 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {displayedPublishedProducts.map((prod) => {
                        const offersCount = prod.offers?.length || 1;

                        return (
                          <tr 
                            key={prod.id} 
                            className="hover:bg-slate-800/40 transition-colors"
                          >
                            {/* Product Info with White Container */}
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3.5 min-w-[240px] max-w-md">
                                <div className="w-12 h-12 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-sm border border-slate-700">
                                  <img
                                    src={prod.imageUrl}
                                    alt={prod.title}
                                    className="max-h-full max-w-full object-contain"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-white truncate text-xs" title={prod.title}>
                                    {prod.title}
                                  </p>
                                  <p className="text-[11px] text-slate-400 mt-0.5">
                                    Melhor Loja: <span className="text-amber-400 font-semibold">{prod.bestStore || 'Mercado Livre'}</span>
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Category */}
                            <td className="py-4 px-4 text-slate-300 font-medium whitespace-nowrap">
                              <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px]">
                                {prod.categoryName || 'Geral'}
                              </span>
                            </td>

                            {/* Best Price */}
                            <td className="py-4 px-4 whitespace-nowrap">
                              <span className="font-black text-emerald-400 text-sm">
                                R$ {prod.minPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </td>

                            {/* Multi-store offers list */}
                            <td className="py-4 px-4">
                              <div className="flex flex-wrap items-center gap-1.5 max-w-[220px]">
                                {prod.offers?.map((off) => (
                                  <button
                                    key={off.id}
                                    type="button"
                                    onClick={() => {
                                      handleEditPublishedProduct(prod);
                                      handleStoreSelect(off.storeName);
                                    }}
                                    className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[10px] font-semibold text-slate-300 hover:border-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
                                    title={`Editar oferta da ${off.storeName}`}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                    <span>{off.storeName.split(' ')[0]}: R$ {off.price.toFixed(0)}</span>
                                  </button>
                                ))}
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-4 px-4 text-center whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 text-[10px] font-black">
                                <CheckCheck className="w-3 h-3" />
                                <span>{offersCount} {offersCount === 1 ? 'Loja' : 'Lojas'}</span>
                              </span>
                            </td>

                            {/* Action Buttons: Add Store, Edit, Remove */}
                            <td className="py-4 px-6 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleAddStoreOfferToProduct(prod)}
                                  className="px-2.5 py-1.5 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 border border-amber-400/30 text-xs font-bold flex items-center gap-1 transition-colors"
                                  title="Adicionar oferta de outra loja a este produto"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>+ Loja</span>
                                </button>

                                <button
                                  onClick={() => handleEditPublishedProduct(prod)}
                                  className="px-2.5 py-1.5 rounded-xl bg-sky-950/60 hover:bg-sky-900 text-sky-300 border border-sky-800 text-xs font-bold flex items-center gap-1 transition-colors shadow-sm"
                                  title="Editar este produto"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  <span>Editar</span>
                                </button>

                                <button
                                  onClick={() => handleDeletePublishedProduct(prod.id)}
                                  className="px-2.5 py-1.5 rounded-xl bg-rose-950/50 hover:bg-rose-900 text-rose-300 border border-rose-800/80 text-xs font-bold flex items-center gap-1 transition-colors shadow-sm"
                                  title="Excluir produto completo da Vitrine"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Remover</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SQL SCHEMA & ENV CONFIG */}
        {activeTab === 'sql' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-amber-400" />
                    <span>Script de Criação de Tabelas (Supabase SQL)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Copie e execute este script no <strong>SQL Editor</strong> do seu painel do Supabase para criar as tabelas com RLS.
                  </p>
                </div>

                <button
                  onClick={handleCopySql}
                  className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-400/20"
                >
                  {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedSql ? 'Copiado!' : 'Copiar SQL'}</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 max-h-96 overflow-y-auto whitespace-pre leading-relaxed select-all">
                {SUPABASE_SQL_SCHEMA}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
