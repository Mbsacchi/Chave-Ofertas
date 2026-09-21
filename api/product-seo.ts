import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';

// Injeção de WebSocket para ambiente Node.js / Supabase Realtime
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = WebSocket as any;
}

const BASE_URL = 'https://chaveofertas.com.br';
const DEFAULT_TITLE = 'Chave Ofertas | Comparador de Preços e Cupons Verificados';
const DEFAULT_DESCRIPTION = 'Compare preços em tempo real nas maiores lojas do Brasil: KaBuM!, AliExpress, Amazon, Mercado Livre e Shopee. Encontre o menor preço e cupons verificados.';
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

function normalizePriceNumber(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const str = String(val).trim().replace(/[R$\s]/g, '');
  const parsed = parseFloat(str.replace(/\./g, '').replace(',', '.'));
  return isNaN(parsed) ? 0 : parsed;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  // 1. Extração segura do slug
  let slug = '';
  if (req.query?.slug) {
    slug = Array.isArray(req.query.slug) ? req.query.slug[0] : req.query.slug;
  }
  if (!slug && req.url) {
    const cleanUrl = req.url.split('?')[0];
    const match = cleanUrl.match(/\/produto\/([^/?#]+)/);
    if (match) {
      slug = decodeURIComponent(match[1]);
    }
  }
  slug = String(slug || '').trim();

  // 2. Carregar template HTML base do projeto
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
  <link rel="canonical" href="${BASE_URL}/" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@600;700;800&display=swap" rel="stylesheet">
</head>
<body class="bg-gray-50 text-gray-900 dark:bg-dark-bg dark:text-gray-100 min-h-screen">
  <div id="root"></div>
</body>
</html>`;
  }

  // Se a rota não tiver slug especificado, serve o template padrão
  if (!slug) {
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(templateHtml);
  }

  // 3. Conexão ao Supabase e busca do produto
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  let product: any = null;

  if (supabaseUrl && serviceRoleKey) {
    try {
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        realtime: { transport: WebSocket },
      });

      // Busca por slug primeiro, depois por id
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(`slug.eq."${slug}",id.eq."${slug}"`)
        .limit(1);

      if (!error && data && data.length > 0) {
        product = data[0];
      }
    } catch (err: any) {
      console.warn('[api/product-seo] Erro ao buscar produto no Supabase:', err.message);
    }
  }

  // 4. Caso o produto NÃO seja encontrado (Retorna HTTP 404 para evitar Soft-404 no Google)
  if (!product) {
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.setHeader('X-Robots-Tag', 'noindex, follow');

    const notFoundTitle = 'Produto não encontrado | Chave Ofertas';
    const notFoundDesc = 'O item pesquisado não está disponível no comparador de preços do Chave Ofertas.';

    let html404 = templateHtml;
    html404 = html404.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(notFoundTitle)}</title>`);
    html404 = html404.replace(/<meta name="description" content=".*?"\s*\/?>/i, `<meta name="description" content="${escapeHtml(notFoundDesc)}" />`);
    html404 = html404.replace(/<meta name="robots" content=".*?"\s*\/?>/i, `<meta name="robots" content="noindex, follow" />`);
    
    // Injeta conteúdo semântico de 404 no root
    const notFoundContent = `
      <div style="min-height: 80vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; text-align: center; font-family: sans-serif;">
        <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 12px; color: #1f2937;">Produto não encontrado</h1>
        <p style="color: #6b7280; max-width: 480px; margin-bottom: 24px;">O produto solicitado não foi localizado em nosso catálogo ou a oferta foi finalizada.</p>
        <a href="/" style="background: #f97316; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Voltar para as Melhores Ofertas</a>
      </div>
    `;
    html404 = html404.replace('<div id="root"></div>', `<div id="root">${notFoundContent}</div>`);

    return res.status(404).send(html404);
  }

  // 5. Normalização de dados do produto localizado
  const prodTitle = String(product.title || product.name || 'Produto').trim();
  const prodDescription = String(product.description || `Compre ${prodTitle} com o menor preço garantido no Chave Ofertas.`).trim();
  const prodBrand = String(product.brand || 'Geral').trim();
  const prodCategory = String(product.category_name || product.categoryName || 'Informática').trim();
  const prodCategorySlug = String(product.category || 'informatica').toLowerCase().replace(/\s+/g, '-');
  const prodSku = String(product.sku || product.id);
  const prodEan = product.ean ? String(product.ean) : undefined;
  const bestStore = String(product.best_store || product.bestStore || 'Loja Parceira').trim();

  const rawMin = product.min_price ?? product.minPrice ?? 0;
  const minPrice = normalizePriceNumber(rawMin);
  const rawMax = product.max_price ?? product.maxPrice ?? minPrice;
  const maxPrice = Math.max(normalizePriceNumber(rawMax), minPrice);
  const formattedMinPrice = minPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const rawOffers = Array.isArray(product.offers) ? product.offers : (Array.isArray(product.prices) ? product.prices : []);
  const otherStoresCount = Math.max(0, (rawOffers.length || 1) - 1);
  const storeContext = otherStoresCount > 0
    ? `na ${bestStore} e mais ${otherStoresCount} loja(s)`
    : `na loja parceira ${bestStore}`;

  const pageTitle = `${prodTitle} - Menor Preço R$ ${formattedMinPrice} | Chave Ofertas`;
  const pageDescription = `Compare o Menor Preço de ${prodTitle} a partir de R$ ${formattedMinPrice} ${storeContext}. Histórico de preços, cupons de desconto e entrega garantida no Chave Ofertas.`;
  const canonicalUrl = `${BASE_URL}/produto/${product.slug || product.id}`;

  const imageList = Array.isArray(product.images)
    ? product.images
    : (Array.isArray(product.gallery_urls) ? product.gallery_urls : []);
  const ogImage = product.image_url || product.imageUrl || imageList[0] || DEFAULT_IMAGE;

  // 6. Construção do Schema JSON-LD Product (Rich Snippets Google e GEO para LLMs)
  const defaultReturnPolicy = {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: 'BR',
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: 7,
    returnMethod: 'https://schema.org/ReturnByMail',
    returnFees: 'https://schema.org/FreeReturn',
  };

  const defaultShippingDetails = {
    '@type': 'OfferShippingDetails',
    shippingRate: {
      '@type': 'MonetaryAmount',
      value: 0,
      currency: 'BRL',
    },
    shippingDestination: [{
      '@type': 'DefinedRegion',
      addressCountry: 'BR',
    }],
  };

  const offersSchemaList = rawOffers.map((off: any) => {
    const offPrice = normalizePriceNumber(off?.price || minPrice);
    return {
      '@type': 'Offer',
      price: offPrice,
      priceCurrency: 'BRL',
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      itemCondition: 'https://schema.org/NewCondition',
      availability: off?.in_stock !== false && off?.inStock !== false ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: off?.affiliate_url || off?.affiliateUrl || canonicalUrl,
      seller: {
        '@type': 'Organization',
        name: String(off?.store_name || off?.storeName || bestStore),
      },
      hasMerchantReturnPolicy: defaultReturnPolicy,
      shippingDetails: defaultShippingDetails,
    };
  });

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: prodTitle,
    image: [ogImage, ...imageList].filter(Boolean),
    description: prodDescription,
    sku: prodSku,
    ...(prodEan ? { gtin13: prodEan } : {}),
    brand: {
      '@type': 'Brand',
      name: prodBrand,
    },
    category: prodCategory,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: (Number(product.rating) || 4.8).toFixed(1),
      reviewCount: Number(product.reviews_count || product.reviewsCount) || 100,
      bestRating: '5',
      worstRating: '1',
    },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'BRL',
      lowPrice: minPrice,
      highPrice: maxPrice,
      offerCount: Math.max(offersSchemaList.length, 1),
      offers: offersSchemaList.length > 0 ? offersSchemaList : undefined,
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: BASE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: prodCategory,
        item: `${BASE_URL}/categoria/${prodCategorySlug}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: prodTitle,
        item: canonicalUrl,
      },
    ],
  };

  // 7. Injeção dinâmica no HTML
  let finalHtml = templateHtml;

  // Title
  finalHtml = finalHtml.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(pageTitle)}</title>`);

  // Description & Canonical
  finalHtml = finalHtml.replace(/<meta name="description" content=".*?"\s*\/?>/i, `<meta name="description" content="${escapeHtml(pageDescription)}" />`);
  
  if (finalHtml.includes('<link rel="canonical"')) {
    finalHtml = finalHtml.replace(/<link rel="canonical" href=".*?"\s*\/?>/i, `<link rel="canonical" href="${canonicalUrl}" />`);
  } else {
    finalHtml = finalHtml.replace('</head>', `  <link rel="canonical" href="${canonicalUrl}" />\n</head>`);
  }

  // Open Graph
  const ogTags = `
  <!-- Open Graph Dinâmico / SEO & GEO -->
  <meta property="og:type" content="product" />
  <meta property="og:site_name" content="Chave Ofertas" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:title" content="${escapeHtml(pageTitle)}" />
  <meta property="og:description" content="${escapeHtml(pageDescription)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="product:price:amount" content="${minPrice}" />
  <meta property="product:price:currency" content="BRL" />

  <!-- Twitter Card Dinâmico -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(pageTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(pageDescription)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />

  <!-- Schema.org JSON-LD para Google Rich Snippets e Motores de IA (GEO) -->
  <script type="application/ld+json">${JSON.stringify(productJsonLd)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbJsonLd)}</script>
`;

  finalHtml = finalHtml.replace('</head>', `${ogTags}\n</head>`);

  // 8. Conteúdo Semântico Pré-renderizado para Motores de Busca e Modelos de IA
  const offersListHtml = (rawOffers.length > 0 ? rawOffers : [{ storeName: bestStore, price: minPrice }])
    .map((o: any) => {
      const sName = escapeHtml(String(o?.store_name || o?.storeName || bestStore));
      const sPrice = normalizePriceNumber(o?.price || minPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      return `<li>Loja: <strong>${sName}</strong> - Preço: R$ ${sPrice}</li>`;
    })
    .join('');

  const semanticContent = `
    <main id="seo-product-preview" style="max-width: 1000px; margin: 0 auto; padding: 20px; font-family: sans-serif;">
      <nav aria-label="Breadcrumb" style="font-size: 14px; margin-bottom: 16px; color: #6b7280;">
        <a href="/" style="color: #f97316; text-decoration: none;">Home</a> &gt; 
        <a href="/categoria/${prodCategorySlug}" style="color: #f97316; text-decoration: none;">${escapeHtml(prodCategory)}</a> &gt; 
        <span>${escapeHtml(prodTitle)}</span>
      </nav>
      <header>
        <h1 style="font-size: 26px; font-weight: 800; color: #111827; margin-bottom: 8px;">${escapeHtml(prodTitle)}</h1>
        <p style="font-size: 14px; color: #4b5563;">Marca: <strong>${escapeHtml(prodBrand)}</strong> | Categoria: <strong>${escapeHtml(prodCategory)}</strong></p>
      </header>
      <section style="margin: 20px 0; padding: 20px; background: #fff7ed; border-radius: 12px; border: 1px solid #fed7aa;">
        <span style="font-size: 14px; color: #c2410c; font-weight: bold; text-transform: uppercase;">Menor Preço Encontrado</span>
        <div style="font-size: 32px; font-weight: 900; color: #ea580c; margin: 8px 0;">R$ ${formattedMinPrice}</div>
        <p style="font-size: 14px; color: #374151;">Melhor oferta disponível na loja <strong>${escapeHtml(bestStore)}</strong>.</p>
      </section>
      <section style="margin: 20px 0;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 12px;">Comparação de Preços em Lojas Confiáveis</h2>
        <ul style="line-height: 1.8; color: #374151;">
          ${offersListHtml}
        </ul>
      </section>
      <section style="margin: 20px 0; line-height: 1.6; color: #4b5563;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">Descrição do Produto</h2>
        <p>${escapeHtml(prodDescription)}</p>
      </section>
    </main>
  `;

  finalHtml = finalHtml.replace('<div id="root"></div>', `<div id="root">${semanticContent}</div>`);

  // Cache: 1 minuto no CDN, servindo stale por até 1 hora enquanto revalida
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=3600');
  return res.status(200).send(finalHtml);
}
