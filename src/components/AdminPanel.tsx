import React, { useState, useEffect } from 'react';
import { 
  KeyLogo 
} from './KeyLogo';
import { 
  supabase, 
  isSupabaseConfigured, 
  isAnonKeyMissing,
  supabaseUrl,
  SUPABASE_SQL_SCHEMA 
} from '../lib/supabase';
import { 
  searchMercadoLivreAPI, 
  fetchDraftProducts, 
  addDraftProduct, 
  updateDraftProduct, 
  deleteDraftProduct, 
  publishDraftToVitrine, 
  MercadoLivreSearchResult,
  fetchLiveDatabaseProducts
} from '../services/adminService';
import { DraftProduct, Product } from '../types';
import { 
  ShieldCheck, 
  Lock, 
  Search, 
  Plus, 
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
  Sparkles
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
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // Active view tab in admin
  const [activeTab, setActiveTab] = useState<'search' | 'staging' | 'published' | 'sql'>('search');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<MercadoLivreSearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Staging Drafts state
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
      } catch (err) {
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
      console.warn('Erro ao carregar dados:', err);
    } finally {
      setDraftsLoading(false);
    }
  };

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setActionFeedback({ type, message });
    setTimeout(() => setActionFeedback(null), 4500);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    if (!email || !password) {
      setAuthError('Informe e-mail e senha.');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Strict Hardcoded Administrator Email Validation
    if (!ALLOWED_ADMIN_EMAILS.includes(normalizedEmail)) {
      setAuthError('Acesso Negado: Este e-mail não possui privilégios de administrador.');
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (error) throw error;
      setSessionUser(data.user);
      showFeedback('success', `Bem-vindo de volta, ${data.user?.email}!`);
    } catch (err: any) {
      // If Supabase credentials are placeholders, allow simulated developer session
      if (!isSupabaseConfigured) {
        const mockUser = { id: 'admin-dev-local', email: normalizedEmail };
        setSessionUser(mockUser);
        showFeedback('success', 'Acesso autorizado em Modo Administrador Seguro!');
      } else {
        setAuthError(err.message || 'Falha na autenticação. Verifique seu e-mail e senha.');
      }
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setSessionUser(null);
    showFeedback('success', 'Sessão encerrada com sucesso.');
  };

  // Search Mercado Livre API
  const handleSearchML = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    try {
      const items = await searchMercadoLivreAPI(searchQuery);
      setSearchResults(items);
      if (items.length === 0) {
        setSearchError('Nenhum produto encontrado no Mercado Livre para este termo.');
      }
    } catch (err: any) {
      setSearchError(err.message || 'Erro ao consultar a API do Mercado Livre.');
    } finally {
      setIsSearching(false);
    }
  };

  // Add Item to Staging Drafts
  const handleAddSearchResultToDraft = async (item: MercadoLivreSearchResult) => {
    try {
      const defaultCategory = CATEGORIES_TREE[0];
      const defaultSubcategory = defaultCategory.subcategories[0];

      const newDraft = await addDraftProduct({
        externalId: item.id,
        title: item.title,
        brand: 'Mercado Livre Oficial',
        description: `${item.title} com garantia oficial, entrega segura e melhores condições no Mercado Livre.`,
        categoryId: defaultCategory.id,
        categoryName: defaultCategory.name,
        subcategoryId: defaultSubcategory?.id,
        subcategoryName: defaultSubcategory?.name,
        imageUrl: item.thumbnail || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80',
        originalPrice: item.original_price || Math.round(item.price * 1.15),
        promotionalPrice: item.price,
        discountPercent: item.original_price ? Math.round(((item.original_price - item.price) / item.original_price) * 100) : 15,
        affiliateUrl: '', // To be filled by admin
        storeId: 'mercadolivre',
        storeName: 'Mercado Livre',
        freeShipping: item.shipping.free_shipping,
        installment: '10x sem juros',
      });

      setDrafts(prev => [newDraft, ...prev]);
      showFeedback('success', `"${item.title.slice(0, 35)}..." adicionado à Fila de Rascunhos!`);
      setActiveTab('staging');
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro ao adicionar rascunho.');
    }
  };

  // Update Draft Fields (e.g. Affiliate Link)
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
      showFeedback('error', err.message || 'Erro ao excluir rascunho.');
    }
  };

  // Publish Draft to Live Vitrine
  const handlePublishDraft = async (draft: DraftProduct) => {
    if (!draft.affiliateUrl || !draft.affiliateUrl.trim()) {
      showFeedback('error', 'Atenção: Preencha o "Link de Afiliado" antes de publicar.');
      return;
    }

    try {
      const published = await publishDraftToVitrine(draft);
      setDrafts(prev => prev.filter(d => d.id !== draft.id));
      setPublishedProducts(prev => [published, ...prev]);
      if (onProductPublished) {
        onProductPublished(published);
      }
      showFeedback('success', `🚀 Produto "${published.title.slice(0, 30)}..." publicado com sucesso na vitrine!`);
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro ao publicar produto.');
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  // Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
          <p className="text-sm font-medium">Verificando credenciais do Supabase...</p>
        </div>
      </div>
    );
  }

  // LOGIN SCREEN (When Not Authenticated)
  if (!sessionUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="inline-block mb-4">
            <KeyLogo size="lg" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
            <span>Painel Administrativo Blindado</span>
          </h2>
          <p className="mt-2 text-xs text-slate-400">
            Acesso restrito para gestão da Fila de Rascunhos e publicação no banco de dados.
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md space-y-6">
          {/* Conditional Connection Warning Alert (Rendered ONLY if VITE_SUPABASE_ANON_KEY is missing or 'COLE_SUA_CHAVE_AQUI') */}
          {isAnonKeyMissing && (
            <div className="p-5 rounded-2xl bg-amber-950/80 border-2 border-amber-500/80 text-xs space-y-3 shadow-2xl animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-amber-300 font-black text-sm">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />
                <span>Aviso: Chave Pública do Supabase Pendente</span>
              </div>
              
              <p className="text-amber-100/90 leading-relaxed">
                A variável <code className="px-1.5 py-0.5 rounded bg-slate-950 text-amber-300 font-mono font-bold">VITE_SUPABASE_ANON_KEY</code> está vazia ou com o valor padrão <code className="px-1.5 py-0.5 rounded bg-slate-950 text-amber-300 font-mono font-bold">COLE_SUA_CHAVE_AQUI</code>.
              </p>

              <div className="p-3.5 rounded-xl bg-slate-950/90 border border-amber-900/60 font-mono text-[11px] space-y-1.5 select-all">
                <div className="text-slate-400"># Arquivo .env na raiz do projeto:</div>
                <div className="text-emerald-400 font-bold">VITE_SUPABASE_URL={supabaseUrl || 'https://axrqvtgaiikhgfihfrwz.supabase.co'}</div>
                <div className="text-amber-400 font-bold">VITE_SUPABASE_ANON_KEY=eyJhbGciOi... (Cole sua anon key aqui)</div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                <p className="font-bold text-white flex items-center gap-1">
                  <span>Onde encontrar a chave?</span>
                </p>
                <p className="text-slate-400">
                  Acesse seu painel no <strong>Supabase</strong> &gt; <strong>Project Settings</strong> &gt; <strong>API</strong> &gt; <strong>Project API keys</strong> e copie a chave <strong>anon / public</strong> para o arquivo <code className="text-amber-300">.env</code>.
                </p>
              </div>
            </div>
          )}

          {/* Login / SignUp Form */}
          <div className="bg-slate-900/80 backdrop-blur-md py-8 px-6 shadow-2xl rounded-3xl border border-slate-800 sm:px-10">
            <form className="space-y-4" onSubmit={handleAuth}>
              {authError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              {authSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{authSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  E-mail de Administrador
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@chaveofertas.com.br"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Senha
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
              Painel Staging & Database
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
                <span>Insira sua chave pública anon no arquivo <code className="px-1 py-0.5 rounded bg-slate-950 text-amber-300 font-mono">.env</code> para habilitar a sincronização em nuvem.</span>
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
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'search'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Buscador Mercado Livre API</span>
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
            <span>Fila de Rascunhos (Staging)</span>
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

        {/* TAB 1: MERCADO LIVRE API SEARCH */}
        {activeTab === 'search' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Search Bar */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Search className="w-5 h-5 text-amber-400" />
                  <span>Buscar Produtos na API Pública do Mercado Livre (MLB)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Digite o nome do produto para extrair títulos, imagens em alta resolução e preços diretamente do catálogo oficial.
                </p>
              </div>

              <form onSubmit={handleSearchML} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ex: PlayStation 5 Slim, iPhone 17, Notebook Lenovo, Sanduicheira..."
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-6 py-3 rounded-2xl font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 transition-all flex items-center gap-2 text-xs shrink-0 shadow-lg shadow-amber-400/20"
                >
                  {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>{isSearching ? 'Buscando...' : 'Buscar no Mercado Livre'}</span>
                </button>
              </form>
            </div>

            {searchError && (
              <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{searchError}</span>
              </div>
            )}

            {/* Results Grid */}
            {searchResults.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">
                    Resultados Encontrados ({searchResults.length})
                  </h4>
                  <span className="text-xs text-slate-400">
                    Clique em "+ Adicionar ao Staging" para montar sua oferta.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {searchResults.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group"
                    >
                      <div className="space-y-3">
                        <div className="relative aspect-square rounded-xl bg-slate-950 overflow-hidden flex items-center justify-center p-2">
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                            loading="lazy"
                          />
                          {item.shipping.free_shipping && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-400 text-[10px] font-bold border border-emerald-800">
                              Frete Grátis
                            </span>
                          )}
                        </div>

                        <div>
                          <p className="text-xs font-bold text-white line-clamp-2" title={item.title}>
                            {item.title}
                          </p>
                          <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-base font-black text-amber-400">
                              R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            {item.original_price && item.original_price > item.price && (
                              <span className="text-xs text-slate-500 line-through">
                                R$ {item.original_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800/80 mt-3 flex items-center gap-2">
                        <button
                          onClick={() => handleAddSearchResultToDraft(item)}
                          className="flex-1 py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-98 transition-all shadow-md shadow-amber-400/10"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adicionar aos Rascunhos</span>
                        </button>
                        <a
                          href={item.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="Abrir no Mercado Livre"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: STAGING DRAFTS QUEUE */}
        {activeTab === 'staging' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 border border-slate-800">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-400" />
                  <span>Fila de Rascunhos Blindada (Staging)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Insira o seu link de afiliado, ajuste os preços e clique em "Publicar na Vitrine".
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
                  Use o Buscador do Mercado Livre para adicionar novos produtos à sua fila de rascunhos.
                </p>
                <button
                  onClick={() => setActiveTab('search')}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-amber-400/20 mt-2"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Buscar Produtos Agora</span>
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

                        {/* Pricing & Installment Row */}
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

                        {/* Affiliate URL Mandatory Input */}
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
                  Itens publicados via painel administrativo ou integrados via Supabase.
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
