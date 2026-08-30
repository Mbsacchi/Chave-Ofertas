import React, { useState, useEffect } from 'react';
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
  createAndPublishManualProduct,
  fetchLiveDatabaseProducts
} from '../services/adminService';
import { DraftProduct, Product } from '../types';
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
  PlusCircle 
} from 'lucide-react';
import { CATEGORIES_TREE } from '../data/mockData';

// Whitelist of authorized admin emails
const ALLOWED_ADMIN_EMAILS = [
  'murilobozolans@gmail.com',
  'chaveofertas0@gmail.com'
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

  // Manual 4 Required Form Fields
  const [manualTitle, setManualTitle] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualImageUrl, setManualImageUrl] = useState('');
  const [manualAffiliateUrl, setManualAffiliateUrl] = useState('');
  const [manualCategoryId, setManualCategoryId] = useState(CATEGORIES_TREE[0]?.id || 'eletronicos');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Staging Drafts & Published state
  const [drafts, setDrafts] = useState<DraftProduct[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [publishedProducts, setPublishedProducts] = useState<Product[]>([]);

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

  // Clear Form inputs
  const handleClearForm = () => {
    setManualTitle('');
    setManualPrice('');
    setManualImageUrl('');
    setManualAffiliateUrl('');
  };

  // Submit Manual Form directly to Vitrine
  const handleCreateProductToVitrine = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Validar Título
    if (!manualTitle.trim()) {
      showFeedback('error', 'Por favor, preencha o Título do Produto.');
      return;
    }

    // 2. Validar Preço
    const cleanPriceStr = manualPrice.toString().replace(/[^\d.,]/g, '').replace(',', '.');
    const numericPrice = parseFloat(cleanPriceStr);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      showFeedback('error', 'Por favor, informe um Preço numérico válido.');
      return;
    }

    // 3. Validar URL da Imagem
    if (!manualImageUrl.trim()) {
      showFeedback('error', 'Por favor, informe a URL da Imagem do produto.');
      return;
    }

    // 4. Validar Link de Afiliado
    if (!manualAffiliateUrl.trim()) {
      showFeedback('error', 'Por favor, informe o Link de Afiliado (URL encurtada).');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedCategory = CATEGORIES_TREE.find(c => c.id === manualCategoryId) || CATEGORIES_TREE[0];
      const defaultSubcategory = selectedCategory.subcategories[0];
      const estimatedOriginalPrice = Math.round(numericPrice * 1.15);

      const newProduct = await createAndPublishManualProduct({
        title: manualTitle.trim(),
        price: numericPrice,
        originalPrice: estimatedOriginalPrice,
        imageUrl: manualImageUrl.trim(),
        affiliateUrl: manualAffiliateUrl.trim(),
        brand: 'Mercado Livre',
        categoryId: selectedCategory.id,
        categoryName: selectedCategory.name,
        subcategoryId: defaultSubcategory?.id,
        subcategoryName: defaultSubcategory?.name,
        storeName: 'Mercado Livre',
        storeId: 'mercadolivre',
        freeShipping: true,
      });

      // Update state & notify app
      setPublishedProducts(prev => [newProduct, ...prev]);
      onProductPublished?.(newProduct);

      // Limpar os 4 campos
      handleClearForm();

      showFeedback('success', `"${newProduct.title.slice(0, 30)}..." adicionado à Vitrine com sucesso!`);
      loadDraftsAndProducts();
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro ao adicionar produto à vitrine.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save as Draft in Staging Queue
  const handleSaveAsDraft = async () => {
    if (!manualTitle.trim()) {
      showFeedback('error', 'Por favor, preencha pelo menos o Título do Produto.');
      return;
    }
    const cleanPriceStr = manualPrice.toString().replace(/[^\d.,]/g, '').replace(',', '.');
    const numericPrice = parseFloat(cleanPriceStr) || 0;

    setIsSubmitting(true);
    try {
      const selectedCategory = CATEGORIES_TREE.find(c => c.id === manualCategoryId) || CATEGORIES_TREE[0];
      const defaultSubcategory = selectedCategory.subcategories[0];
      const estimatedOriginalPrice = Math.round(numericPrice * 1.15);

      const newDraft = await addDraftProduct({
        externalId: `manual-${Date.now()}`,
        title: manualTitle.trim(),
        brand: 'Mercado Livre',
        description: `${manualTitle.trim()} com garantia oficial e melhores condições no Mercado Livre.`,
        categoryId: selectedCategory.id,
        categoryName: selectedCategory.name,
        subcategoryId: defaultSubcategory?.id,
        subcategoryName: defaultSubcategory?.name,
        imageUrl: manualImageUrl.trim() || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80',
        originalPrice: estimatedOriginalPrice,
        promotionalPrice: numericPrice,
        discountPercent: 15,
        affiliateUrl: manualAffiliateUrl.trim(),
        storeId: 'mercadolivre',
        storeName: 'Mercado Livre',
        freeShipping: true,
        installment: '10x sem juros',
      });

      setDrafts(prev => [newDraft, ...prev]);
      handleClearForm();
      showFeedback('success', `"${newDraft.title.slice(0, 30)}..." salvo na Fila de Rascunhos!`);
      setActiveTab('staging');
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro ao salvar rascunho.');
    } finally {
      setIsSubmitting(false);
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
      showFeedback('success', `"${published.title.slice(0, 30)}..." publicado com sucesso na Vitrine!`);
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
                Acesso restrito para gerenciamento de ofertas e produtos afiliados.
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

  // Live preview helpers
  const parsedPrice = parseFloat(manualPrice.replace(',', '.')) || 0;

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
              Painel de Ofertas & Afiliados
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
            <PlusCircle className="w-4 h-4" />
            <span>Cadastrar Oferta Manual</span>
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

        {/* TAB 1: CLEAN MANUAL 4-FIELD REGISTRATION */}
        {activeTab === 'create' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-150">
            {/* Form Section (4 Fields) */}
            <div className="lg:col-span-8 p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span>Cadastro Direto de Oferta</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Preencha os 4 campos abaixo com as informações do seu painel de afiliados.
                  </p>
                </div>

                {(manualTitle || manualPrice || manualImageUrl || manualAffiliateUrl) && (
                  <button
                    type="button"
                    onClick={handleClearForm}
                    className="text-xs text-slate-400 hover:text-rose-400 font-bold flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Limpar</span>
                  </button>
                )}
              </div>

              <form onSubmit={handleCreateProductToVitrine} className="space-y-5">
                {/* 1. Título do Produto */}
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-400" />
                    <span>1. Título do Produto *</span>
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

                {/* 2. Preço */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-amber-400 mb-1.5 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>2. Preço Promocional (R$) *</span>
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
                </div>

                {/* 3. URL da Imagem */}
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                    <span>3. URL da Imagem (Link da foto) *</span>
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

                {/* 4. Link de Afiliado (URL encurtada) */}
                <div>
                  <label className="block text-xs font-bold text-amber-400 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>4. Link de Afiliado (URL Encurtada / Destino de Compra) *</span>
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
                    placeholder="Ex: https://meli.la/1Uet23y ou https://mercadolivre.com/sec/xxxx"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-amber-500/50 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 font-mono transition-colors shadow-inner"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting || !manualTitle || !manualPrice || !manualImageUrl || !manualAffiliateUrl}
                    className="flex-1 py-3.5 px-6 rounded-2xl font-black text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-98 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm shadow-xl shadow-amber-400/20"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <PlusCircle className="w-4 h-4" />
                    )}
                    <span>{isSubmitting ? 'Salvando Oferta...' : 'Adicionar à Vitrine'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAsDraft}
                    disabled={isSubmitting || !manualTitle}
                    className="py-3.5 px-5 rounded-2xl font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 active:scale-98 disabled:opacity-50 transition-all flex items-center gap-2 text-xs"
                  >
                    <Layers className="w-4 h-4 text-amber-400" />
                    <span>Salvar Rascunho</span>
                  </button>
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
                    Mercado Livre
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 shadow-2xl">
                  <div className="relative aspect-square rounded-xl bg-slate-900 overflow-hidden flex items-center justify-center p-2 border border-slate-800/80">
                    {manualImageUrl ? (
                      <img
                        src={manualImageUrl}
                        alt="Preview"
                        className="max-h-full max-w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="text-center p-4 space-y-2 text-slate-600">
                        <ImageIcon className="w-10 h-10 mx-auto stroke-1" />
                        <p className="text-[11px]">A foto do produto aparecerá aqui</p>
                      </div>
                    )}

                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-emerald-950/90 text-emerald-400 text-[10px] font-bold border border-emerald-800 flex items-center gap-1">
                      <Truck className="w-3 h-3" />
                      <span>Frete Grátis</span>
                    </span>

                    {parsedPrice > 0 && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-black shadow-md">
                        -15%
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                      Mercado Livre Oficial
                    </span>
                    <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug">
                      {manualTitle || 'Título do Produto aparecerá aqui...'}
                    </h4>

                    <div className="pt-2 flex items-baseline gap-2">
                      <span className="text-lg font-black text-amber-400">
                        R$ {parsedPrice > 0 ? parsedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                      </span>
                      {parsedPrice > 0 && (
                        <span className="text-xs text-slate-500 line-through">
                          R$ {(parsedPrice * 1.15).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <div className="w-full py-2.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md">
                      <span>Ver no Mercado Livre</span>
                      <ExternalLink className="w-3.5 h-3.5" />
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
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-400" />
                  <span>Fila de Rascunhos (Staging)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Itens salvos como rascunho para ajuste de preços, categoria e publicação posterior na vitrine.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadDraftsAndProducts}
                  disabled={draftsLoading}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${draftsLoading ? 'animate-spin' : ''}`} />
                  <span>Atualizar Fila</span>
                </button>
              </div>
            </div>

            {drafts.length === 0 ? (
              <div className="p-12 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
                <Layers className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="text-base font-bold text-white">Nenhum rascunho pendente</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Cadastre novas ofertas na aba principal para publicá-las instantaneamente ou salvá-las como rascunho.
                </p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-amber-400/20 mt-2"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Cadastrar Nova Oferta</span>
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
                      {/* Product Image */}
                      <div className="lg:col-span-2 aspect-square rounded-2xl bg-slate-950 p-2 flex items-center justify-center border border-slate-800">
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
                              Preço Promocional (R$)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={draft.promotionalPrice}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                handleUpdateDraftField(draft.id, 'promotionalPrice', val);
                              }}
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-400"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">
                              Preço Original / De (R$)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={draft.originalPrice}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                handleUpdateDraftField(draft.id, 'originalPrice', val);
                              }}
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">
                              Parcelamento
                            </label>
                            <input
                              type="text"
                              value={draft.installment}
                              onChange={(e) => handleUpdateDraftField(draft.id, 'installment', e.target.value)}
                              placeholder="Ex: 10x de R$ 99,90 sem juros"
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
                              placeholder="Cole o link com seu ID de afiliado do Mercado Livre..."
                              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-amber-500/40 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
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

                        {/* Action Buttons */}
                        <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                          <button
                            onClick={() => handleDeleteDraft(draft.id)}
                            className="px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-xs font-bold flex items-center gap-1.5 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remover da Fila</span>
                          </button>

                          <button
                            onClick={() => handlePublishDraft(draft)}
                            className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-slate-950 font-black text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                          >
                            <UploadCloud className="w-4 h-4" />
                            <span>Publicar na Vitrine Oficial</span>
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

        {/* TAB 3: PUBLISHED PRODUCTS */}
        {activeTab === 'published' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-emerald-400" />
                  <span>Produtos Ativos na Vitrine</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Itens publicados via painel administrativo ou sincronizados com o Supabase.
                </p>
              </div>

              <button
                onClick={onBackToVitrine}
                className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Visualizar na Vitrine</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {publishedProducts.map((prod) => (
                <div
                  key={prod.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={prod.imageUrl}
                      alt={prod.title}
                      className="w-14 h-14 object-contain rounded-xl bg-slate-950 p-1 border border-slate-800"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{prod.title}</p>
                      <p className="text-[11px] text-slate-400">{prod.categoryName}</p>
                      <p className="text-sm font-black text-amber-400 mt-0.5">
                        R$ {prod.minPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 text-[11px] flex items-center justify-between text-slate-400">
                    <span>Loja: {prod.bestStore}</span>
                    <span className="text-emerald-400 font-bold">● Ativo</span>
                  </div>
                </div>
              ))}
            </div>
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
