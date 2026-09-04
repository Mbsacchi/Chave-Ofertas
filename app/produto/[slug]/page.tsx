import React from 'react';
import { generateProductMetadata, generateProductJsonLd } from '../../../src/lib/seo/productSeo';
import { ProductDetails } from '../../../src/components/ProductDetails';
import { fetchLiveDatabaseProducts } from '../../../src/services/adminService';

interface PageProps {
  params: { slug: string };
}

/**
 * Geração Dinâmica de Meta Tags via API de metadados do Next.js
 */
export async function generateMetadata({ params }: PageProps) {
  const products = await fetchLiveDatabaseProducts();
  const product = products.find((p) => p.slug === params.slug || p.id === params.slug);

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
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.ogTitle,
      description: meta.ogDescription,
      images: [meta.ogImage],
    },
  };
}

/**
 * Página de Detalhes do Produto /produto/[slug] com Schema Markup e Semântica HTML
 */
export default async function ProductPage({ params }: PageProps) {
  const products = await fetchLiveDatabaseProducts();
  const product = products.find((p) => p.slug === params.slug || p.id === params.slug);

  if (!product) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-gray-50 dark:bg-slate-900">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Produto não encontrado</h1>
          <p className="text-gray-500">O produto procurado não foi localizado no catálogo do Chave Ofertas.</p>
          <a href="/" className="inline-block py-2.5 px-5 rounded-xl bg-amber-500 text-white font-bold">
            Voltar para a Vitrine
          </a>
        </div>
      </main>
    );
  }

  const jsonLd = generateProductJsonLd(product);

  return (
    <main className="min-h-screen p-4 sm:p-6 md:p-8 bg-gray-50 dark:bg-slate-900">
      {/* Schema Markup JSON-LD injetado no HTML */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-6xl mx-auto">
        <ProductDetails product={product} />
      </div>
    </main>
  );
}
