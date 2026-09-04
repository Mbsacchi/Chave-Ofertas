import { generateProductMetadata, generateProductJsonLd } from './productSeo';

/**
 * Compatibilidade com a API generateMetadata do Next.js (App Router)
 */
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const slug = params.slug;

  // Carrega produtos dinâmicos do Supabase ou cache
  const { fetchLiveDatabaseProducts } = await import('../../services/adminService');
  const products = await fetchLiveDatabaseProducts();
  const product = products.find((p) => p.slug === slug || p.id === slug);

  if (!product) {
    return {
      title: 'Produto não encontrado | Chave Ofertas',
      description: 'O produto solicitado não foi encontrado no comparador Chave Ofertas.',
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
}

export { generateProductMetadata, generateProductJsonLd };
