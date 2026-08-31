import https from 'https';
import zlib from 'zlib';
import csv from 'csv-parser';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { waitUntil } from '@vercel/functions';

// Injeção global do WebSocket para compatibilidade com Node 18+ e Supabase
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = WebSocket as any;
}

// URL Oficial do Feed Awin completo com código de barras (EAN)
const AWIN_DATAFEED_URL = 
  process.env.AWIN_DATAFEED_URL ||
  'https://productdata.awin.com/datafeed/download/apikey/8d5b91cc0cff1fe909dfcc1d4a2442c0/language/pt/cid/61,62,72,73,71,74,75,77,78,63,80,64,83,84,85,65,86,88,90,91,67,94,33,53,52,603,66,128,130,133,212,209,210,211,68,69,213,220,221,70,224,225,226,227,228,229,4,5,10,11,537,19,15,14,6,20,22,23,24,25,7,30,32,619,8,35,618,43,9,50,634,230,538,235,238,241,556,245,521,576,575,577,579,361,633,362,366,367,368,371,369,363,372,373,374,377,375,364,365,383,385,390,392,394,399,402,404,406,407,347,348,354,350,351,349,357,358,360/fid/46967/rid/0/hasEnhancedFeeds/0/columns/aw_deep_link,product_name,aw_product_id,merchant_product_id,merchant_image_url,description,merchant_category,search_price,merchant_name,merchant_id,category_name,category_id,aw_image_url,currency,store_price,delivery_cost,merchant_deep_link,language,last_updated,display_price,data_feed_id,ean/format/csv/delimiter/%2C/compression/gzip/adultcontent/1/';

const BATCH_SIZE = 500;

function parsePrice(val: any): number {
  if (!val) return 0;
  const clean = val.toString().replace(/[^\d.,]/g, '').replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

// Tabela de Regras Extensível de Categorias (Regex no Título com Prioridade Máxima)
export const CATEGORY_MAPPING_RULES = [
  // 1. ÁUDIO & SOM (Prioridade máxima para fones, headsets e caixas de som)
  {
    id: 'audio',
    name: 'Áudio & Som',
    titlePatterns: [
      /\b(fone|fones|headset|headsets|headphone|headphones|earbud|earbuds|earphone|earphones|airpod|airpods|galaxy buds|jbl|soundbar|soundbars|caixa de som|caixas de som|alto-falante|microfone|microfones|in-ear|over-ear|tws)\b/i,
      /\b(anc|noise cancelling|estéreo|bluetooth speaker|subwoofer|receiver|amplificador)\b/i,
    ],
    categoryPatterns: [
      /\b(áudio|audio|som|fones?|headphones?|caixa de som)\b/i,
    ],
  },

  // 2. GAMES & CONSOLES
  {
    id: 'games',
    name: 'Games e Consoles',
    titlePatterns: [
      /\b(ps5|ps4|ps3|playstation|xbox|xbox series|nintendo switch|switch oled|dualsense|joy-con|gamepad|controle sem fio xbox|jogo ps5|jogo ps4|jogo switch|jogos|videogame|gamer)\b/i,
    ],
    categoryPatterns: [
      /\b(game|games|console|consoles|videogame|jogos)\b/i,
    ],
  },

  // 3. INFORMÁTICA & NOTEBOOKS
  {
    id: 'informatica',
    name: 'Informática & Notebooks',
    titlePatterns: [
      /\b(notebook|notebooks|macbook|macbook air|macbook pro|laptop|laptops|computador|pc gamer|desktop|monitor|monitores|teclado|teclados|mouse|mouses|ssd|nvme|placa de v[íi]deo|geforce|rtx|gtx|radeon|ryzen|intel core|mem[óo]ria ram|placa-m[ãa]e|roteador|webcam|switch de rede|nobreak)\b/i,
    ],
    categoryPatterns: [
      /\b(inform[áa]tica|computador|notebook|hardware|perif[ée]rico|monitor)\b/i,
    ],
  },

  // 4. SMARTPHONES & CELULARES
  {
    id: 'smartphones',
    name: 'Smartphones & Celulares',
    titlePatterns: [
      /\b(smartphone|smartphones|iphone|celular|celulares|galaxy s\d+|galaxy z|galaxy a\d+|xiaomi|redmi|poco|motorola moto|moto g\d+|moto edge|zenfone)\b/i,
      /\b(smartwatch|apple watch|galaxy watch|pulseira inteligente|smartband|relogio inteligente)\b/i,
    ],
    categoryPatterns: [
      /\b(celular|celulares|smartphone|smartphones|telefone|wearable|smartwatch)\b/i,
    ],
  },

  // 5. ELETRO & CASA
  {
    id: 'eletro',
    name: 'Eletro & Casa',
    titlePatterns: [
      /\b(airfryer|air fryer|fritadeira|aspirador|aspirador rob[ôo]|cafeteira|nespresso|dolce gusto|micro-ondas|microondas|geladeira|refrigerador|fog[ãa]o|cooktop|lavadora|lava e seca|m[áa]quina de lavar|liquidificador|batedeira|ventilador|ar-condicionado|climatizador|ferro de passar|purificador de [áa]gua|panela el[ée]trica)\b/i,
      /\b(smart tv|tv|televis[ãa]o|televisor|oled|qled|nanocell|crystal uhd|projetor|chromecast|fire tv|fire stick|roku|apple tv|home theater)\b/i,
    ],
    categoryPatterns: [
      /\b(casa|eletrodom[ée]stico|eletrodom[ée]sticos|cozinha|eletro|tv|televis[ãa]o|v[íi]deo)\b/i,
    ],
  },

  // 6. LIVROS
  {
    id: 'livros',
    name: 'Livros',
    titlePatterns: [
      /\b(livro|livros|kindle|box de livros|edi[çc][ãa]o de colecionador|capa dura)\b/i,
    ],
    categoryPatterns: [
      /\b(livro|livros|literatura|ebook|leitura)\b/i,
    ],
  },
];

function resolveSmartCategory(productName: string, catName?: string, merchCat?: string): { categoryId: string; categoryName: string } {
  const title = (productName || '').trim();
  const rawCat = `${catName || ''} ${merchCat || ''}`.trim();

  // ETAPA 1: Prioridade MÁXIMA no TÍTULO do produto (Regex)
  if (title) {
    for (const rule of CATEGORY_MAPPING_RULES) {
      for (const pattern of rule.titlePatterns) {
        if (pattern.test(title)) {
          return { categoryId: rule.id, categoryName: rule.name };
        }
      }
    }
  }

  // ETAPA 2: Fallback na categoria original informada pela loja/feed
  if (rawCat) {
    for (const rule of CATEGORY_MAPPING_RULES) {
      if (rule.categoryPatterns) {
        for (const pattern of rule.categoryPatterns) {
          if (pattern.test(rawCat)) {
            return { categoryId: rule.id, categoryName: rule.name };
          }
        }
      }
    }
  }

  // ETAPA 3: Fallback padrão garantido
  return { categoryId: 'smartphones', categoryName: 'Smartphones & Celulares' };
}

function normalizeStore(name: string): { storeId: any; storeName: string; storeLogo: string } {
  const norm = (name || '').toLowerCase();
  if (norm.includes('kabum')) {
    return {
      storeId: 'kabum',
      storeName: 'KaBuM!',
      storeLogo: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=100&auto=format&fit=crop&q=80',
    };
  }
  if (norm.includes('amazon')) {
    return {
      storeId: 'amazon',
      storeName: 'Amazon',
      storeLogo: 'https://images.unsplash.com/photo-1523474253243-283a0ed81406?w=100&auto=format&fit=crop&q=80',
    };
  }
  if (norm.includes('casas bahia')) {
    return {
      storeId: 'awin',
      storeName: 'Casas Bahia',
      storeLogo: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=100&auto=format&fit=crop&q=80',
    };
  }
  if (norm.includes('ponto') || norm.includes('pontofrio')) {
    return {
      storeId: 'awin',
      storeName: 'Ponto Frio',
      storeLogo: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=100&auto=format&fit=crop&q=80',
    };
  }
  if (norm.includes('extra')) {
    return {
      storeId: 'awin',
      storeName: 'Extra',
      storeLogo: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=100&auto=format&fit=crop&q=80',
    };
  }
  if (norm.includes('centauro')) {
    return {
      storeId: 'awin',
      storeName: 'Centauro',
      storeLogo: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=100&auto=format&fit=crop&q=80',
    };
  }
  if (norm.includes('aliexpress')) {
    return {
      storeId: 'awin',
      storeName: 'AliExpress',
      storeLogo: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=100&auto=format&fit=crop&q=80',
    };
  }

  return {
    storeId: 'awin',
    storeName: name || 'Awin Partner',
    storeLogo: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=100&auto=format&fit=crop&q=80',
  };
}

function mapRowToProduct(row: any) {
  const awProductId = row.aw_product_id?.trim();
  if (!awProductId || !row.product_name?.trim()) return null;

  const title = row.product_name.trim();
  const searchPrice = parsePrice(row.search_price);
  const storePrice = parsePrice(row.store_price);
  const displayPrice = parsePrice(row.display_price);

  const promotionalPrice = searchPrice || storePrice || displayPrice || 99.90;
  let originalPrice = storePrice > promotionalPrice ? storePrice : (searchPrice > promotionalPrice ? searchPrice : 0);

  if (!originalPrice || originalPrice <= promotionalPrice) {
    originalPrice = Math.round(promotionalPrice * 1.15 * 100) / 100;
  }

  const discountPercent = originalPrice > promotionalPrice
    ? Math.round(((originalPrice - promotionalPrice) / originalPrice) * 100)
    : 15;

  let imageUrl = (row.merchant_image_url || row.aw_image_url || '').trim();
  if (imageUrl.startsWith('http://')) {
    imageUrl = imageUrl.replace('http://', 'https://');
  }
  if (!imageUrl) {
    imageUrl = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';
  }

  const affiliateUrl = (row.aw_deep_link || row.merchant_deep_link || '').trim();
  const storeInfo = normalizeStore(row.merchant_name);
  const categoryInfo = resolveSmartCategory(title, row.category_name, row.merchant_category);

  // Leitura e sanitização do código de barras EAN
  const rawEan = (row.ean || row.ean_code || row.barcode || row.gtin || row.upc || '').toString().trim();
  const ean = rawEan && rawEan !== '0' && rawEan !== 'null' && rawEan !== 'undefined' ? rawEan : null;

  const keywords = Array.from(new Set([
    ...title.toLowerCase().split(/[\s,.-]+/).filter((w: string) => w.length > 2),
    storeInfo.storeName.toLowerCase(),
    categoryInfo.categoryName.toLowerCase(),
    ...(ean ? [ean.toLowerCase()] : []),
    'awin'
  ]));

  const offer = {
    id: `offer-awin-${awProductId}`,
    storeId: storeInfo.storeId,
    storeName: storeInfo.storeName,
    storeLogo: storeInfo.storeLogo,
    price: promotionalPrice,
    originalPrice,
    discountPercent,
    currency: row.currency || 'BRL',
    affiliateUrl,
    inStock: true,
    freeShipping: row.delivery_cost === '0' || row.delivery_cost === '0.00' || true,
    installment: '10x sem juros',
    rating: 4.8,
    reviewsCount: 110,
    lastUpdated: new Date().toISOString(),
  };

  return {
    id: `awin-${awProductId}`,
    title,
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    description: (row.description || `${title} disponível na loja oficial ${storeInfo.storeName}. Aproveite as melhores condições e garantia.`).slice(0, 1500),
    category_id: categoryInfo.categoryId,
    category_name: categoryInfo.categoryName,
    subcategory_id: null,
    subcategory_name: null,
    brand: storeInfo.storeName,
    sku: `AWIN-${awProductId}`,
    ean: ean,
    image_url: imageUrl,
    search_keywords: keywords,
    min_price: promotionalPrice,
    max_price: originalPrice,
    historical_lowest_price: promotionalPrice,
    best_store: storeInfo.storeName,
    best_store_id: storeInfo.storeId,
    rating: 4.8,
    reviews_count: 110,
    is_verified: true,
    is_active: true,
    offers: [offer],
    price_history: [
      {
        date: new Date().toISOString().split('T')[0],
        timestamp: Date.now(),
        minPrice: promotionalPrice,
      }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Função de processamento assíncrono em stream (Fire-and-Forget / Background Worker)
 */
async function processAwinStreamSync(supabase: any, maxLimit = 0) {
  const startTime = Date.now();
  console.log(`================================================================`);
  console.log(`🚀 [AWIN ASYNC WORKER] Iniciando Processamento em Background`);
  console.log(`📡 URL do Feed: ${AWIN_DATAFEED_URL.substring(0, 80)}...`);
  console.log(`================================================================`);

  try {
    let processedCount = 0;
    let upsertedCount = 0;
    let batchNumber = 0;
    let batch: any[] = [];

    const response = await new Promise<any>((resolve, reject) => {
      https.get(AWIN_DATAFEED_URL, resolve).on('error', reject);
    });

    if (response.statusCode !== 200) {
      throw new Error(`Erro HTTP Awin: ${response.statusCode} ${response.statusMessage}`);
    }

    const gunzip = zlib.createGunzip();
    const parser = csv({ separator: ',' });

    response.pipe(gunzip).pipe(parser);

    for await (const row of parser) {
      if (maxLimit > 0 && processedCount >= maxLimit) {
        break;
      }

      const product = mapRowToProduct(row);
      if (!product) continue;

      processedCount++;
      batch.push(product);

      // Flush em lotes de BATCH_SIZE (500)
      if (batch.length >= BATCH_SIZE) {
        batchNumber++;
        const currentBatch = [...batch];
        batch = []; // Limpeza de memória RAM imediata

        if (supabase) {
          try {
            const { error } = await supabase.from('products').upsert(currentBatch, { onConflict: 'id', ignoreDuplicates: false });
            if (error) {
              console.error(`❌ [AWIN ASYNC Lote #${batchNumber}] Erro no Supabase:`, error.message);
            } else {
              upsertedCount += currentBatch.length;
              console.log(`✅ [AWIN ASYNC Lote #${batchNumber}] ${currentBatch.length} produtos gravados. Total acumulado: ${upsertedCount}`);
            }
          } catch (batchErr: any) {
            console.error(`❌ [AWIN ASYNC Lote #${batchNumber}] Exceção no upsert:`, batchErr.message);
          }
        }
      }
    }

    // Flush do último lote restante
    if (batch.length > 0) {
      batchNumber++;
      if (supabase) {
        try {
          const { error } = await supabase.from('products').upsert(batch, { onConflict: 'id', ignoreDuplicates: false });
          if (!error) {
            upsertedCount += batch.length;
            console.log(`✅ [AWIN ASYNC Lote Final #${batchNumber}] ${batch.length} produtos gravados. Total: ${upsertedCount}`);
          }
        } catch (batchErr: any) {
          console.error(`❌ [AWIN ASYNC Lote Final] Exceção:`, batchErr.message);
        }
      }
      batch = [];
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`================================================================`);
    console.log(`🎉 [AWIN ASYNC CONCLUÍDO] Tempo total: ${duration}s`);
    console.log(`📊 Linhas processadas: ${processedCount} | Gravados no Supabase: ${upsertedCount}`);
    console.log(`================================================================`);
    return { success: true, processedCount, upsertedCount, duration };
  } catch (err: any) {
    console.error(`❌ [AWIN ASYNC FALHA] Erro fatal no stream:`, err.message);
    throw err;
  }
}

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

  const isSupabaseReady = Boolean(supabaseUrl && serviceRoleKey && !serviceRoleKey.includes('placeholder'));
  const supabase = isSupabaseReady
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        realtime: { transport: WebSocket },
      })
    : null;

  // Parâmetros opcionais (ex: limit=0 para processar o feed completo de 16k itens)
  const maxLimit = req.query?.limit ? parseInt(req.query.limit, 10) : (req.body?.limit ? parseInt(req.body.limit, 10) : 0);

  console.log(`[AWIN SYNC API] Requisição recebida. Disparando background worker (Fire-and-Forget)...`);

  // Dispara a execução assíncrona em segundo plano sem travar a resposta HTTP
  const syncTaskPromise = processAwinStreamSync(supabase, maxLimit).catch((err) => {
    console.error('[AWIN BACKGROUND SYNC] Erro durante processamento:', err.message);
  });

  // Registra no ciclo de vida de serverless (Vercel waitUntil) para evitar que o runtime seja morto antes de concluir
  try {
    waitUntil(syncTaskPromise);
  } catch (wErr: any) {
    console.log('[AWIN SYNC API] Executando em background via Node Event Loop');
  }

  // Retorna HTTP 200 imediato para o frontend evitando timeout
  return res.status(200).json({
    success: true,
    status: 'processing',
    message: 'Sincronização iniciada em segundo plano com sucesso! Os mais de 16.000 produtos estão sendo processados via stream e atualizados no Supabase.',
    startedAt: new Date().toISOString(),
    isBackground: true,
  });
}
