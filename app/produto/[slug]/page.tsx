import React from 'react';
import { generateProductMetadata, generateProductJsonLd } from '../../../src/lib/seo/productSeo';
import { ProductDetails } from '../../../src/components/ProductDetails';
import { ErrorBoundary } from '../../../src/components/ErrorBoundary';
import { fetchProductBySlugOrId } from '../../../src/services/productService';
import { AlertCircle, ArrowLeft } from 'lucide-react';

interface PageProps {
  params: { slug: string } | Promise<{ slug: string }>;
}

/**
 * Geração Dinâmica e Resiliente de Meta Tags via API de metadados do Next.js
 * Suporta params síncronos e assíncronos (Next.js 15+ App Router)
 */
export async function generateMetadata({ params }: PageProps) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const rawSlug = resolvedParams?.slug;

    if (!rawSlug) {
      return {
        title: 'Produto não encontrado | Chave Ofertas',
        description: 'O item pesquisado não está disponível no comparador de preços.',
      };
    }

    const slug = decodeURIComponent(rawSlug);
    const product = await fetchProductBySlugOrId(slug);

    if (!product) {
      return {
        title: 'Produto não encontrado | Chave Ofertas',
        description: 'O item pesquisado não está disponível no comparador de preços.',
      };
    }

    const meta = generateProductMetadata(product);

    return {
      title: meta.title,
      description: meta.description,
      keywords: meta.keywords,
      alternates: {
        canonical: meta.canonicalUrl,
      },
      openGraph: {
        title: meta.ogTitle,
        description: meta.ogDescription,
        images: [{ url: meta.ogImage }],
        url: meta.canonicalUrl,
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: meta.ogTitle,
        description: meta.ogDescription,
        images: [meta.ogImage],
      },
    };
  } catch (err) {
    console.error('[ProductPage:generateMetadata] Erro ao gerar metadados:', err);
    return {
      title: 'Produto indisponível | Chave Ofertas',
      description: 'O item pesquisado não pôde ser carregado no momento.',
    };
  }
}

/**
 * Componente amigável de Fallback quando o produto não é encontrado ou ocorre erro
 */
function ProductNotFoundFallback({ message }: { message?: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-gray-50 dark:bg-slate-900">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-slate-700 shadow-xl text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-sm">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
          Produto não encontrado ou indisponível
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          {message || 'O produto procurado não foi localizado no catálogo do Chave Ofertas ou pode ter sido encerrado.'}
        </p>
        <div className="pt-3">
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs uppercase tracking-wider shadow-glow-amber transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar à Vitrine</span>
          </a>
        </div>
      </div>
    </main>
  );
}

/**
 * Página de Detalhes do Produto /produto/[slug] com Schema Markup e Semântica HTML
 * Resiliente a falhas de rede, parâmetros incompletos e erros de renderização
 */
export default async function ProductPage({ params }: PageProps) {
  try {
    // 1. Resolução segura de params (Promise em versões recentes do Next.js App Router)
    const resolvedParams = await Promise.resolve(params);
    const rawSlug = resolvedParams?.slug;

    if (!rawSlug) {
      return <ProductNotFoundFallback message="Parâmetro de produto inválido ou não informado." />;
    }

    const slug = decodeURIComponent(rawSlug);

    // 2. Busca protegida no Supabase e catálogo com tratamento de erro
    const product = await fetchProductBySlugOrId(slug);

    if (!product) {
      return <ProductNotFoundFallback message="O produto procurado não foi localizado em nosso comparador de preços." />;
    }

    // 3. Schema Markup JSON-LD (Product + AggregateOffer) protegido
    const jsonLd = generateProductJsonLd(product);

    return (
      <main className="min-h-screen p-4 sm:p-6 md:p-8 bg-gray-50 dark:bg-slate-900">
        {jsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        )}
        <div className="max-w-6xl mx-auto">
          {/* ErrorBoundary protege a árvore React contra qualquer falha interna de renderização */}
          <ErrorBoundary
            fallback={
              <ProductNotFoundFallback message="Ocorreu uma falha na renderização deste produto. Tente novamente mais tarde." />
            }
          >
            <ProductDetails product={product} />
          </ErrorBoundary>
        </div>
      </main>
    );
  } catch (error: any) {
    console.error('[ProductPage] Falha inesperada ao renderizar página de produto:', error);
    return (
      <ProductNotFoundFallback message="Ocorreu um erro temporário ao carregar as informações deste produto." />
    );
  }
}
