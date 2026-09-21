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

// URL Oficial do Feed KaBuM! (Awin fid 46967) completo com 4.996 produtos, código de barras (EAN), marcas e parcelamento
const AWIN_DATAFEED_URL = 
  process.env.AWIN_DATAFEED_URL ||
  'https://productdata.awin.com/datafeed/download/apikey/8d5b91cc0cff1fe909dfcc1d4a2442c0/fid/46967/format/csv/language/pt/delimiter/%2C/compression/gzip/columns/aw_deep_link%2Cproduct_name%2Caw_product_id%2Cmerchant_product_id%2Cmerchant_image_url%2Cdescription%2Cmerchant_category%2Csearch_price%2Cmerchant_name%2Cmerchant_id%2Ccategory_name%2Ccategory_id%2Caw_image_url%2Ccurrency%2Cstore_price%2Cdelivery_cost%2Cmerchant_deep_link%2Clanguage%2Clast_updated%2Cdisplay_price%2Cdata_feed_id%2Cean%2Cbrand_name%2Ccustom_1%2Ccustom_2%2Ccustom_3/';

const BATCH_SIZE = 100;

function parsePrice(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') {
    if (isNaN(val)) return 0;
    const strVal = val.toString();
    const parts = strVal.split('.');
    if (parts.length === 2 && parts[1].length === 3 && val < 100) {
      return Math.round(val * 1000);
    }
    return val;
  }
  let str = val.toString().trim();
  if (!str) return 0;
  str = str.replace(/[^\d.,]/g, '');
  if (!str) return 0;
  const hasComma = str.includes(',');
  const hasDot = str.includes('.');
  if (hasComma && hasDot) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      const clean = str.replace(/\./g, '').replace(',', '.');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    } else {
      const clean = str.replace(/,/g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    }
  }
  if (hasComma) {
    const clean = str.replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }
  if (hasDot) {
    const dotCount = (str.match(/\./g) || []).length;
    if (dotCount > 1) {
      const clean = str.replace(/\./g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    }
    const parts = str.split('.');
    const decimalPart = parts[1] || '';
    if (decimalPart.length === 3) {
      const clean = str.replace('.', '');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    }
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  }
  const num = parseFloat(str);
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
  const storePrice = parsePrice(row.custom_3 || row.store_price);
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

  // Marca detectada do feed oficial ou fallback
  const brand = (row.brand_name || '').trim() || storeInfo.storeName;

  // Condição de parcelamento informada pelo KaBuM!
  let installment = '10x sem juros';
  if (row.custom_1) {
    const cleanMonths = row.custom_1.replace(/installament months:\s*/i, '').trim();
    if (cleanMonths && cleanMonths !== '0') {
      installment = `${cleanMonths}x sem juros`;
    }
  }

  // Renovação de validade garantida: 10 dias a partir da data atual de sincronização
  const endsAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

  const keywords = Array.from(new Set([
    ...title.toLowerCase().split(/[\s,.-]+/).filter((w: string) => w.length > 2),
    storeInfo.storeName.toLowerCase(),
    categoryInfo.categoryName.toLowerCase(),
    brand.toLowerCase(),
    ...(ean ? [ean.toLowerCase()] : []),
    'awin',
    'kabum'
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
    installment,
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
    brand,
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
    ends_at: endsAt,
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
 * Função de processamento de stream do Feed KaBuM! / Awin
 */
export async function processAwinStreamSync(supabase: any, maxLimit = 0) {
  const startTime = Date.now();
  console.log(`================================================================`);
  console.log(`🚀 [KABUM / AWIN WORKER] Iniciando processamento do feed`);
  console.log(`📡 URL do Feed: ${AWIN_DATAFEED_URL.substring(0, 80)}...`);
  console.log(`================================================================`);

  try {
    let processedCount = 0;
    let upsertedCount = 0;
    let batchNumber = 0;
    let batch: any[] = [];
    const collectedProducts: any[] = [];

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
      if (collectedProducts.length < 200) {
        collectedProducts.push(product);
      }

      // Flush em lotes de BATCH_SIZE (100)
      if (batch.length >= BATCH_SIZE) {
        batchNumber++;
        const currentBatch = [...batch];
        batch = []; // Limpeza de memória RAM imediata

        if (supabase) {
          try {
            const { error } = await supabase.from('products').upsert(currentBatch, { onConflict: 'id', ignoreDuplicates: false });
            if (error) {
              console.error(`❌ [AWIN Lote #${batchNumber}] Erro no Supabase:`, error.message);
            } else {
              upsertedCount += currentBatch.length;
              console.log(`✅ [AWIN Lote #${batchNumber}] ${currentBatch.length} produtos gravados. Total acumulado: ${upsertedCount}`);

              // Inserção no histórico de preços (Inteligência de Tendências)
              const todayStr = new Date().toISOString().split('T')[0];
              const priceHistoryBatch = currentBatch.map((p) => ({
                id: `ph-${p.id}-${todayStr}`,
                product_id: p.id,
                price: p.min_price,
                recorded_at: new Date().toISOString(),
              }));

              try {
                await supabase.from('price_history').upsert(priceHistoryBatch, { onConflict: 'id', ignoreDuplicates: false });
              } catch (phErr) {
                // Silencioso se tabela estiver sendo provisionada
              }
            }
          } catch (batchErr: any) {
            console.error(`❌ [AWIN Lote #${batchNumber}] Exceção no upsert:`, batchErr.message);
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
            console.log(`✅ [AWIN Lote Final #${batchNumber}] ${batch.length} produtos gravados. Total: ${upsertedCount}`);

            const todayStr = new Date().toISOString().split('T')[0];
            const priceHistoryBatch = batch.map((p) => ({
              id: `ph-${p.id}-${todayStr}`,
              product_id: p.id,
              price: p.min_price,
              recorded_at: new Date().toISOString(),
            }));

            try {
              await supabase.from('price_history').upsert(priceHistoryBatch, { onConflict: 'id', ignoreDuplicates: false });
            } catch (phErr) {
              // Silencioso
            }
          }
        } catch (batchErr: any) {
          console.error(`❌ [AWIN Lote Final] Exceção:`, batchErr.message);
        }
      }
      batch = [];
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`================================================================`);
    console.log(`🎉 [KABUM / AWIN CONCLUÍDO] Tempo total: ${duration}s`);
    console.log(`📊 Linhas processadas: ${processedCount} | Gravados no Supabase: ${upsertedCount}`);
    console.log(`================================================================`);
    return { success: true, processedCount, upsertedCount, duration, products: collectedProducts };
  } catch (err: any) {
    console.error(`❌ [KABUM / AWIN FALHA] Erro fatal no stream:`, err.message);
    throw err;
  }
}

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-cron-secret');

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

  // Parâmetros opcionais (ex: limit=100 para botão do painel, limit=0 para cron background completo)
  const maxLimit = req.query?.limit !== undefined 
    ? parseInt(req.query.limit, 10) 
    : (req.body?.limit !== undefined ? parseInt(req.body.limit, 10) : 100);

  console.log(`[KABUM SYNC API] Requisição recebida com maxLimit=${maxLimit}`);

  // Se limit for maior que 0 (ex: 100 itens acionado pelo botão do admin), processa diretamente para resposta instantânea
  if (maxLimit > 0) {
    try {
      const result = await processAwinStreamSync(supabase, maxLimit);
      return res.status(200).json({
        success: true,
        status: 'completed',
        count: result.upsertedCount || result.processedCount,
        products: result.products || [],
        duration: result.duration,
        message: `${result.upsertedCount || result.processedCount} ofertas da KaBuM! sincronizadas e atualizadas com sucesso!`,
      });
    } catch (err: any) {
      console.error('[KABUM SYNC API] Erro no processamento síncrono:', err.message);
      return res.status(500).json({
        success: false,
        error: err.message || 'Erro ao sincronizar ofertas da KaBuM!.',
      });
    }
  }

  // Se limit === 0 (Cron diário completo com 4.996 itens em background):
  console.log(`[KABUM SYNC API] Disparando worker completo em background (Fire-and-Forget)...`);
  const syncTaskPromise = processAwinStreamSync(supabase, 0).catch((err) => {
    console.error('[KABUM BACKGROUND SYNC] Erro durante processamento:', err.message);
  });

  try {
    waitUntil(syncTaskPromise);
  } catch (wErr: any) {
    console.log('[KABUM SYNC API] Executando em background via Node Event Loop');
  }

  return res.status(200).json({
    success: true,
    status: 'processing',
    message: 'Sincronização completa de todas as ofertas da KaBuM! iniciada em segundo plano!',
    startedAt: new Date().toISOString(),
    isBackground: true,
  });
}
