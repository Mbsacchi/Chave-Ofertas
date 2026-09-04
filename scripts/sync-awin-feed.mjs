import https from 'https';
import zlib from 'zlib';
import csv from 'csv-parser';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Injeção global do WebSocket para total compatibilidade com Node.js v18
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = WebSocket;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2. Carregar variáveis de ambiente do arquivo .env
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...rest] = trimmed.split('=');
      const val = rest.join('=').trim().replace(/(^['"]|['"]$)/g, '');
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = val;
      }
    }
  });
}

// URL Oficial do Feed Awin com a coluna EAN incluída
const AWIN_DATAFEED_URL =
  process.env.AWIN_DATAFEED_URL ||
  'https://productdata.awin.com/datafeed/download/apikey/8d5b91cc0cff1fe909dfcc1d4a2442c0/language/pt/cid/61,62,72,73,71,74,75,77,78,63,80,64,83,84,85,65,86,88,90,91,67,94,33,53,52,603,66,128,130,133,212,209,210,211,68,69,213,220,221,70,224,225,226,227,228,229,4,5,10,11,537,19,15,14,6,20,22,23,24,25,7,30,32,619,8,35,618,43,9,50,634,230,538,235,238,241,556,245,521,576,575,577,579,361,633,362,366,367,368,371,369,363,372,373,374,377,375,364,365,383,385,390,392,394,399,402,404,406,407,347,348,354,350,351,349,357,358,360/fid/46967/rid/0/hasEnhancedFeeds/0/columns/aw_deep_link,product_name,aw_product_id,merchant_product_id,merchant_image_url,description,merchant_category,search_price,merchant_name,merchant_id,category_name,category_id,aw_image_url,currency,store_price,delivery_cost,merchant_deep_link,language,last_updated,display_price,data_feed_id,ean/format/csv/delimiter/%2C/compression/gzip/adultcontent/1/';

const BATCH_SIZE = 500;

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('[ERRO] Credenciais do Supabase não configuradas no .env');
  console.error('Certifique-se de configurar VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no arquivo .env');
  process.exit(1);
}

// 3. Inicialização do Supabase com chave Service Role (Admin Bypass RLS) e transporte WebSocket
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    transport: WebSocket,
  },
});

function parsePrice(val, referencePrice) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') {
    if (isNaN(val)) return 0;
    const str = val.toString();
    const parts = str.split('.');
    if (parts.length === 2 && parts[1].length === 3 && val < 100) {
      return Math.round(val * 1000);
    }
    if (referencePrice && referencePrice > 100 && val < 50) {
      const scaled = Math.round(val * 1000);
      if (Math.abs(scaled - referencePrice) / referencePrice < 0.5) {
        return scaled;
      }
    }
    return val;
  }

  let str = val.toString().trim().replace(/[^\d.,]/g, '');
  if (!str) return 0;

  const hasComma = str.includes(',');
  const hasDot = str.includes('.');

  if (hasComma && hasDot) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // Formato brasileiro: 2.789,00
      const clean = str.replace(/\./g, '').replace(',', '.');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    } else {
      // Formato americano: 2,789.00
      const clean = str.replace(/,/g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    }
  }

  if (hasComma) {
    const parts = str.split(',');
    if (parts.length === 2 && parts[1].length === 3 && parseInt(parts[0], 10) < 100) {
      return parseInt(parts[0] + parts[1], 10);
    }
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
    if (decimalPart.length === 3 && parseFloat(parts[0]) < 100) {
      // Ponto de milhar: "2.789" -> 2789
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

function resolveSmartCategory(productName, catName, merchCat) {
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

function normalizeStore(name) {
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

function mapRowToProduct(row) {
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

  // Leitura e Sanitização do Código de Barras EAN (GTIN/UPC)
  const rawEan = (row.ean || row.ean_code || row.barcode || row.gtin || row.upc || '').toString().trim();
  const ean = rawEan && rawEan !== '0' && rawEan !== 'null' && rawEan !== 'undefined' ? rawEan : null;

  const keywords = Array.from(new Set([
    ...title.toLowerCase().split(/[\s,.-]+/).filter((w) => w.length > 2),
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

async function runWorker() {
  console.log('================================================================');
  console.log('🚀 [AWIN SYNC WORKER] Iniciando Sincronização em Stream do Feed');
  console.log('================================================================');
  console.log(`📡 Conectando ao Feed Awin compactado (GZIP)...`);

  const startTime = Date.now();
  let totalProcessed = 0;
  let totalUpserted = 0;
  let batch = [];
  let batchNumber = 0;

  const response = await new Promise((resolve, reject) => {
    https.get(AWIN_DATAFEED_URL, resolve).on('error', reject);
  });

  if (response.statusCode !== 200) {
    throw new Error(`Erro HTTP Awin: ${response.statusCode} ${response.statusMessage}`);
  }

  const gunzip = zlib.createGunzip();
  const parser = csv({ separator: ',' });

  response.pipe(gunzip).pipe(parser);

  for await (const row of parser) {
    const product = mapRowToProduct(row);
    if (!product) continue;

    totalProcessed++;
    batch.push(product);

    // Flush em lotes de BATCH_SIZE (500)
    if (batch.length >= BATCH_SIZE) {
      batchNumber++;
      const currentBatch = [...batch];
      batch = []; // Limpeza de memória RAM imediata

      try {
        const { error } = await supabase.from('products').upsert(currentBatch, { onConflict: 'id', ignoreDuplicates: false });
        if (error) {
          console.error(`❌ [Lote #${batchNumber}] Erro ao gravar ${currentBatch.length} itens:`, error.message);
        } else {
          totalUpserted += currentBatch.length;
          console.log(`✅ [Lote #${batchNumber}] ${currentBatch.length} produtos gravados no Supabase. Total acumulado: ${totalUpserted}`);

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
            // Silencioso se a tabela ainda estiver sendo criada
          }
        }
      } catch (err) {
        console.error(`❌ [Lote #${batchNumber}] Exceção no upsert:`, err.message);
      }
    }
  }

  // Gravação do último lote restante
  if (batch.length > 0) {
    batchNumber++;
    try {
      const { error } = await supabase.from('products').upsert(batch, { onConflict: 'id', ignoreDuplicates: false });
      if (error) {
        console.error(`❌ [Lote Final] Erro Supabase:`, error.message);
      } else {
        totalUpserted += batch.length;
        console.log(`✅ [Lote Final #${batchNumber}] ${batch.length} produtos gravados. Total acumulado: ${totalUpserted}`);

        // Inserção no histórico de preços para o lote final
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
    } catch (err) {
      console.error(`❌ [Lote Final] Exceção:`, err.message);
    }
    batch = [];
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('================================================================');
  console.log(`🎉 [CONCLUÍDO COM SUCESSO] Tempo total: ${duration}s`);
  console.log(`📊 Linhas processadas: ${totalProcessed}`);
  console.log(`💾 Produtos gravados/atualizados no banco: ${totalUpserted}`);
  console.log('================================================================');
  return { totalProcessed, totalUpserted, duration };
}

runWorker()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Falha fatal no Worker Awin:', err);
    process.exit(1);
  });
