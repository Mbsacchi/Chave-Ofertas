import { generateProductMetadata, generateProductJsonLd } from './productSeo';
import { fetchProductBySlugOrId } from '../../services/productService';

/**
 * Compatibilidade com a API generateMetadata do Next.js (App Router)
 * Trata params como Promise se necessário (Next.js 15+) e faz try/catch
 */
export async function generateMetadata({
  params,
}: {
  params: { slug: string } | Promise<{ slug: string }>;
}) {
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
  } catch (err) {
    console.error('Erro em generateMetadata para produto:', err);
    return {
      title: 'Produto | Chave Ofertas',
      description: 'Compare preços nas melhores lojas do Brasil no Chave Ofertas.',
    };
  }
}

export { generateProductMetadata, generateProductJsonLd };
