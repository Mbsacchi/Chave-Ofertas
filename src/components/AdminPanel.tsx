import React, { useState, useEffect, useRef } from 'react';
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
  addOfferToExistingProduct,
  fetchLiveDatabaseProducts
} from '../services/adminService';
import { DraftProduct, Product, StoreId } from '../types';
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
  CheckCheck 
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
  // Auth state
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

  // Autocomplete Search states
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
        fetchLiveDatabaseProducts(),
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

  // Real-time search and filter existing products
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (!value.trim()) {
      setSuggestions([]);
      setSelectedExistingProduct(null);
      return;
    }

    const term = value.toLowerCase();
    const matches = publishedProducts.filter(
      (p) =>
        p.title.toLowerCase().includes(term) ||
        p.brand?.toLowerCase().includes(term) ||
        p.categoryName?.toLowerCase().includes(term)
    );

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

    // Default to a different popular store for multi-store comparison
    const existingStores = prod.offers?.map(o => o.storeName.toLowerCase()) || [];
    const nextStore = POPULAR_STORES.find(s => !existingStores.includes(s.name.toLowerCase()))?.name || 'Amazon';
    setManualStoreName(nextStore);

    setManualOriginalPrice('');
    setManualPrice('');
    setManualAffiliateUrl('');
    setManualFreeShipping(true);

    showFeedback('success', `Produto "${prod.title.slice(0, 30)}..." selecionado. Preencha os dados da nova loja.`);
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
      // CENÁRIO A: Adicionar nova loja/oferta a um produto existente no Comparador
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
        showFeedback('success', `Nova oferta da loja "${manualStoreName}" adicionada com sucesso ao comparador!`);
        setActiveTab('published');
      } 
      // CENÁRIO B: Editando um produto publicado existente
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
        showFeedback('success', `Produto "${updated.title.slice(0, 30)}..." atualizado com sucesso na Vitrine!`);
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

  // Start Editing Published Product
  const handleEditPublishedProduct = (product: Product) => {
    const primaryOffer = product.offers[0];
    setSelectedExistingProduct(null);
    setSearchQuery('');
    setSuggestions([]);
    setEditingProductId(product.id);
    setManualTitle(product.title);
    setManualStoreName(primaryOffer?.storeName || product.bestStore || 'Mercado Livre');
    setManualOriginalPrice(product.maxPrice ? product.maxPrice.toString() : '');
    setManualPrice(product.minPrice ? product.minPrice.toString() : '');
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
    setManualStoreName('Amazon');
    setManualOriginalPrice('');
    setManualPrice('');
    setManualAffiliateUrl('');
    setManualFreeShipping(true);
    setActiveTab('create');
    showFeedback('success', `Pronto para adicionar uma nova loja ao produto "${product.title.slice(0, 25)}...".`);
  };

  // Delete Published Product
  const handleDeletePublishedProduct = async (productId: string) => {
    if (!window.confirm('Tem certeza que deseja remover este produto da Vitrine Publicada?')) {
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

  // Loading indicator
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 p-4">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-300">Carregando painel de administração...</p>
      </div>
    );
  }

  // LOGIN SCREEN
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
                  placeholder="murilobozolans@gmail.com"
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
  const previewImageUrl = selectedExistingProduct ? selectedExistingProduct.imageUrl : manualImageUrl;
  const previewTitle = selectedExistingProduct ? selectedExistingProduct.title : manualTitle;

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

        {/* TAB 1: COMPARATOR FORM WITH AUTOCOMPLETE (SEARCHQUERY & SUGGESTIONS) */}
        {activeTab === 'create' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-150">
            {/* Form Section */}
            <div className="lg:col-span-8 p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl">
              
              {/* Autocomplete Search for Existing Products */}
              <div ref={searchDropdownRef} className="space-y-2 pb-5 border-b border-slate-800 relative">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-amber-400" />
                    <span>Buscar produto existente na Vitrine</span>
                  </label>
                  {(searchQuery || selectedExistingProduct) && (
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

                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Buscar produto existente... (Digite o nome do produto)"
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

                {/* Floating Autocomplete Dropdown */}
                {suggestions.length > 0 && !selectedExistingProduct && (
                  <div className="absolute top-full left-0 right-0 z-30 mt-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden divide-y divide-gray-100 dark:divide-slate-800 max-h-80 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-4 py-2 bg-gray-50 dark:bg-slate-950/80 text-[11px] text-amber-600 dark:text-amber-400 font-bold flex items-center justify-between border-b border-gray-100 dark:border-slate-800">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{suggestions.length} produto(s) encontrado(s):</span>
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

              {/* Selected Existing Product Banner */}
              {selectedExistingProduct && (
                <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-800/80 flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-150 shadow-lg">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-sm border border-emerald-700">
                      <img
                        src={selectedExistingProduct.imageUrl}
                        alt={selectedExistingProduct.title}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-500 text-slate-950 uppercase tracking-wider">
                        Produto Vinculado
                      </span>
                      <h4 className="text-xs font-bold text-white truncate mt-1">
                        {selectedExistingProduct.title}
                      </h4>
                      <p className="text-[11px] text-emerald-300">
                        Preencha apenas os dados da nova loja abaixo para expandir o comparador de preços deste produto.
                      </p>
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
                    {selectedExistingProduct ? (
                      <StoreIcon className="w-5 h-5 text-emerald-400" />
                    ) : editingProductId ? (
                      <Pencil className="w-5 h-5 text-sky-400" />
                    ) : (
                      <Sparkles className="w-5 h-5 text-amber-400" />
                    )}
                    <span>
                      {selectedExistingProduct 
                        ? 'Campos da Nova Oferta / Loja' 
                        : editingProductId 
                          ? 'Editar Produto Publicado' 
                          : 'Campos do Novo Produto & Oferta'}
                    </span>
                  </h3>
                </div>

                {(manualTitle || manualPrice || manualOriginalPrice || manualImageUrl || manualAffiliateUrl || selectedExistingProduct || editingProductId) && (
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
                {/* Título & Imagem (Ocultos se o produto já existir e estiver selecionado) */}
                {!selectedExistingProduct && (
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

                {/* Loja da Oferta (Nome da Loja) */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <StoreIcon className="w-3.5 h-3.5 text-amber-400" />
                    <span>Nome da Loja Parceira *</span>
                  </label>
                  
                  <div className="flex flex-wrap gap-2 mb-2">
                    {POPULAR_STORES.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setManualStoreName(s.name)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border ${
                          manualStoreName.toLowerCase() === s.name.toLowerCase()
                            ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-sm'
                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    required
                    value={manualStoreName}
                    onChange={(e) => setManualStoreName(e.target.value)}
                    placeholder="Ou digite o nome da loja (Ex: Mercado Livre, Amazon, Shopee...)"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>

                {/* Preço Original / De (R$) ANTES do Preço Promocional */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                      <span>Preço Original / "De" (R$)</span>
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
                        <span>Preço Promocional / "Por" (R$) *</span>
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
                    placeholder="Ex: https://meli.la/xxxx ou https://amzn.to/xxxx..."
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-amber-500/50 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 font-mono transition-colors shadow-inner"
                  />
                </div>

                {/* Categoria & Frete Grátis (Exibidos apenas para produto novo) */}
                {!selectedExistingProduct && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
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

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Opções de Destaque
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
                          <span>Destacar Frete Grátis</span>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting || (!selectedExistingProduct && !manualTitle) || !manualPrice || (!selectedExistingProduct && !manualImageUrl) || !manualAffiliateUrl}
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
                          ? `Adicionar Oferta da ${manualStoreName} ao Produto`
                          : editingProductId 
                            ? 'Salvar Alterações na Vitrine' 
                            : 'Salvar Novo Produto como Rascunho'}
                    </span>
                  </button>

                  {(selectedExistingProduct || editingProductId) && (
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
                    <span>Prévia em Tempo Real</span>
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

        {/* TAB 3: PUBLISHED PRODUCTS COMPARATOR TABLE */}
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
                  <span>Vitrine Publicada & Comparador ({publishedProducts.length})</span>
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

            {publishedProducts.length === 0 ? (
              <div className="p-12 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
                <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="text-base font-bold text-white">Nenhum produto publicado</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Cadastre ofertas no formulário e publique-as na Fila de Rascunhos.
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
                      {publishedProducts.map((prod) => {
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
                                  <span
                                    key={off.id}
                                    className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[10px] font-semibold text-slate-300 flex items-center gap-1"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                    <span>{off.storeName.split(' ')[0]}: R$ {off.price.toFixed(0)}</span>
                                  </span>
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
                                  title="Excluir produto da Vitrine"
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
