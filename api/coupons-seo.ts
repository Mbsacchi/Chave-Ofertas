import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';

// Injeção de WebSocket para ambiente Node.js / Supabase Realtime
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = WebSocket as any;
}

const BASE_URL = 'https://chaveofertas.com.br';
const DEFAULT_TITLE = 'Cupons de Desconto Verificados e Ativos | Chave Ofertas';
const DEFAULT_DESCRIPTION = 'Encontre os melhores cupons de desconto ativos e verificados para KaBuM!, AliExpress, Amazon, Mercado Livre e Shopee. Economize em suas compras com o Chave Ofertas.';
const DEFAULT_IMAGE = `${BASE_URL}/key-icon.svg`;

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');

  // 1. Carregar template HTML base do projeto
  let templateHtml = '';
  const possiblePaths = [
    path.join(process.cwd(), 'dist', 'index.html'),
    path.join(process.cwd(), 'index.html'),
  ];
  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        templateHtml = fs.readFileSync(p, 'utf-8');
        if (templateHtml) break;
      }
    } catch {
      // continua para o próximo caminho
    }
  }

  // Fallback caso os arquivos locais não estejam acessíveis
  if (!templateHtml) {
    templateHtml = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/key-icon.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${DEFAULT_TITLE}</title>
  <meta name="description" content="${DEFAULT_DESCRIPTION}" />
  <link rel="canonical" href="${BASE_URL}/cupons" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@600;700;800&display=swap" rel="stylesheet">
</head>
<body class="bg-gray-50 text-gray-900 dark:bg-dark-bg dark:text-gray-100 min-h-screen">
  <div id="root"></div>
</body>
</html>`;
  }

  // 2. Consulta opcional de contagem e lojas no Supabase para enriquecer os metadados
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  let totalActiveCoupons = 0;
  let topCoupons: any[] = [];

  if (supabaseUrl && serviceRoleKey) {
    try {
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        realtime: { transport: WebSocket },
      });

      const { data, count, error } = await supabase
        .from('coupons')
        .select('id, code, title, store_name, discount_value, ends_at', { count: 'exact' })
        .eq('is_active', true)
        .limit(10);

      if (!error) {
        totalActiveCoupons = count || data?.length || 0;
        topCoupons = data || [];
      }
    } catch (err: any) {
      console.warn('[api/coupons-seo] Aviso ao consultar cupons no Supabase:', err.message);
    }
  }

  const pageTitle = totalActiveCoupons > 0
    ? `Cupons de Desconto Verificados (${totalActiveCoupons} Ativos) | KaBuM!, AliExpress, Amazon | Chave Ofertas`
    : `Cupons de Desconto Verificados e Ativos | KaBuM!, AliExpress, Amazon | Chave Ofertas`;

  const pageDesc = totalActiveCoupons > 0
    ? `Economize com ${totalActiveCoupons} cupons de desconto ativos e códigos promocionais testados para KaBuM!, AliExpress, Amazon, Shopee e Mercado Livre. Atualizados diariamente no Chave Ofertas.`
    : DEFAULT_DESCRIPTION;

  const canonicalUrl = `${BASE_URL}/cupons`;

  // 3. Schema.org JSON-LD para Google Rich Snippets
  const schemaOrgData: any = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Central de Cupons de Desconto Verificados',
    description: pageDesc,
    url: canonicalUrl,
    inLanguage: 'pt-BR',
    publisher: {
      '@type': 'Organization',
      name: 'Chave Ofertas',
      url: BASE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/key-icon.svg`,
      },
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Início',
          item: BASE_URL,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Cupons de Desconto',
          item: canonicalUrl,
        },
      ],
    },
  };

  if (topCoupons.length > 0) {
    schemaOrgData.mainEntity = {
      '@type': 'ItemList',
      numberOfItems: topCoupons.length,
      itemListElement: topCoupons.map((c, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        item: {
          '@type': 'DiscountCode',
          name: c.title || `Cupom ${c.store_name}`,
          code: c.code,
          seller: {
            '@type': 'Organization',
            name: c.store_name,
          },
        },
      })),
    };
  }

  // 4. Montar bloco de Meta Tags e OpenGraph
  const seoTags = `
  <!-- SEO & Social OpenGraph / Twitter (Injetado via Serverless Chave Ofertas) -->
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(pageDesc)}" />
  <link rel="canonical" href="${canonicalUrl}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />

  <!-- OpenGraph / Facebook / WhatsApp -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Chave Ofertas" />
  <meta property="og:title" content="${escapeHtml(pageTitle)}" />
  <meta property="og:description" content="${escapeHtml(pageDesc)}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:image" content="${DEFAULT_IMAGE}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:locale" content="pt_BR" />

  <!-- Twitter Cards -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(pageTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(pageDesc)}" />
  <meta name="twitter:image" content="${DEFAULT_IMAGE}" />

  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json">
${JSON.stringify(schemaOrgData, null, 2)}
  </script>
`;

  // 5. Injetar metadados no template HTML
  let finalHtml = templateHtml;

  // Substitui título existente
  if (/<title>.*?<\/title>/i.test(finalHtml)) {
    finalHtml = finalHtml.replace(/<title>.*?<\/title>/i, '');
  }

  // Substitui meta description existente
  if (/<meta name="description" content=".*?"\s*\/?>/i.test(finalHtml)) {
    finalHtml = finalHtml.replace(/<meta name="description" content=".*?"\s*\/?>/i, '');
  }

  // Remove canonical anterior se houver
  finalHtml = finalHtml.replace(/<link rel="canonical".*?>/gi, '');

  // Insere novo bloco antes do fechamento de </head>
  finalHtml = finalHtml.replace('</head>', `${seoTags}\n</head>`);

  return res.status(200).send(finalHtml);
}
