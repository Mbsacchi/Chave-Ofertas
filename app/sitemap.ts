import { fetchLiveDatabaseProducts } from '../src/services/adminService';
import { CATEGORIES_TREE } from '../src/data/mockData';

const BASE_URL = 'https://chaveofertas.com.br';

export interface SitemapEntry {
  url: string;
  lastModified?: string | Date;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

/**
 * Rota app/sitemap.ts compatível com Next.js Metadata Route
 */
export default async function sitemap(): Promise<SitemapEntry[]> {
  const staticRoutes: SitemapEntry[] = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/cupons`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  // 1. URLs de Categorias
  const categoryRoutes: SitemapEntry[] = CATEGORIES_TREE.map((cat) => ({
    url: `${BASE_URL}/categoria/${cat.id}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  // 2. URLs de Produtos ativos no Supabase
  let productRoutes: SitemapEntry[] = [];
  try {
    const products = await fetchLiveDatabaseProducts();
    productRoutes = products
      .filter((p) => p.isActive !== false)
      .map((p) => ({
        url: `${BASE_URL}/produto/${p.slug || p.id}`,
        lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
        changeFrequency: 'hourly',
        priority: 0.9,
      }));
  } catch (err) {
    console.warn('Erro ao gerar rotas de produtos para o sitemap:', err);
  }

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
