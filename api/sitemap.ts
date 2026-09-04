import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

// Injeção de WebSocket para ambiente Node.js
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = WebSocket as any;
}

const BASE_URL = 'https://chaveofertas.com.br';

const CATEGORY_SLUGS = [
  'smartphones',
  'informatica',
  'games',
  'eletro',
  'audio',
  'livros',
  'papelaria',
];

export default async function handler(req: any, res: any) {
  // CORS & Caching
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

  let products: any[] = [];

  if (supabaseUrl && anonKey) {
    try {
      const supabase = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        realtime: { transport: WebSocket },
      });

      const { data, error } = await supabase
        .from('products')
        .select('slug, id, updated_at, is_active')
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (!error && data) {
        products = data;
      }
    } catch (err: any) {
      console.warn('Erro ao consultar produtos no Supabase para sitemap:', err.message);
    }
  }

  const currentDate = new Date().toISOString();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // 1. Home
  xml += `  <url>\n`;
  xml += `    <loc>${BASE_URL}/</loc>\n`;
  xml += `    <lastmod>${currentDate}</lastmod>\n`;
  xml += `    <changefreq>hourly</changefreq>\n`;
  xml += `    <priority>1.0</priority>\n`;
  xml += `  </url>\n`;

  // 2. Cupons
  xml += `  <url>\n`;
  xml += `    <loc>${BASE_URL}/cupons</loc>\n`;
  xml += `    <lastmod>${currentDate}</lastmod>\n`;
  xml += `    <changefreq>daily</changefreq>\n`;
  xml += `    <priority>0.9</priority>\n`;
  xml += `  </url>\n`;

  // 3. Categorias
  for (const cat of CATEGORY_SLUGS) {
    xml += `  <url>\n`;
    xml += `    <loc>${BASE_URL}/categoria/${cat}</loc>\n`;
    xml += `    <lastmod>${currentDate}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `  </url>\n`;
  }

  // 4. Produtos Dinâmicos
  for (const prod of products) {
    const slug = prod.slug || prod.id;
    const lastMod = prod.updated_at ? new Date(prod.updated_at).toISOString() : currentDate;
    xml += `  <url>\n`;
    xml += `    <loc>${BASE_URL}/produto/${slug}</loc>\n`;
    xml += `    <lastmod>${lastMod}</lastmod>\n`;
    xml += `    <changefreq>hourly</changefreq>\n`;
    xml += `    <priority>0.9</priority>\n`;
    xml += `  </url>\n`;
  }

  xml += `</urlset>`;

  return res.status(200).send(xml);
}
