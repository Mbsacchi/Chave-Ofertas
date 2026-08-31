import https from 'https';
import zlib from 'zlib';
import csv from 'csv-parser';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Carregar variáveis de ambiente do arquivo .env
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

const AWIN_DATAFEED_URL =
  process.env.AWIN_DATAFEED_URL ||
  'https://productdata.awin.com/datafeed/download/apikey/8d5b91cc0cff1fe909dfcc1d4a2442c0/language/pt/cid/61,62,72,73,71,74,75,77,78,63,80,64,83,84,85,65,86,88,90,91,67,94,33,53,52,603,66,128,130,133,212,209,210,211,68,69,213,220,221,70,224,225,226,227,228,229,4,5,10,11,537,19,15,14,6,20,22,23,24,25,7,30,32,619,8,35,618,43,9,50,634,230,538,235,238,241,556,245,521,576,575,577,579,361,633,362,366,367,368,371,369,363,372,373,374,377,375,364,365,383,385,390,392,394,399,402,404,406,407,347,348,354,350,351,349,357,358,360/fid/46967/rid/0/hasEnhancedFeeds/0/columns/aw_deep_link,product_name,aw_product_id,merchant_product_id,merchant_image_url,description,merchant_category,search_price,merchant_name,merchant_id,category_name,category_id,aw_image_url,currency,store_price,delivery_cost,merchant_deep_link,language,last_updated,display_price,data_feed_id/format/csv/delimiter/%2C/compression/gzip/adultcontent/1/';

const BATCH_SIZE = 500;

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey || supabaseKey.includes('placeholder')) {
  console.error('[ERRO] Credenciais do Supabase não configuradas no .env');
  console.error('Certifique-se de configurar VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function parsePrice(val) {
  if (!val) return 0;
  const clean = val.toString().replace(/[^\d.,]/g, '').replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

function resolveCategory(catName, merchCat) {
  const combined = `${catName || ''} ${merchCat || ''}`.toLowerCase();

  if (combined.includes('celular') || combined.includes('smartphone') || combined.includes('phone') || combined.includes('wearable') || combined.includes('smartwatch')) {
    return { categoryId: 'smartphones', categoryName: 'Smartphones & Celulares' };
  }
  if (combined.includes('gamer') || combined.includes('console') || combined.includes('playstation') || combined.includes('xbox') || combined.includes('nintendo') || combined.includes('jogos')) {
    return { categoryId: 'games', categoryName: 'Games e Consoles' };
  }
  if (combined.includes('informática') || combined.includes('teclado') || combined.includes('mouse') || combined.includes('notebook') || combined.includes('computador') || combined.includes('monitor') || combined.includes('hardware') || combined.includes('periférico') || combined.includes('input devices')) {
    return { categoryId: 'informatica', categoryName: 'Informática & Notebooks' };
  }
  if (combined.includes('áudio') || combined.includes('fone') || combined.includes('headphone') || combined.includes('headset') || combined.includes('soundbar') || combined.includes('som')) {
    return { categoryId: 'audio', categoryName: 'Áudio & Som' };
  }
  if (combined.includes('casa') || combined.includes('eletrodoméstic') || combined.includes('airfryer') || combined.includes('aspirador') || combined.includes('cozinha')) {
    return { categoryId: 'casa', categoryName: 'Casa & Eletrodomésticos' };
  }
  if (combined.includes('tv') || combined.includes('televis') || combined.includes('vídeo') || combined.includes('eletrônic')) {
    return { categoryId: 'eletronicos', categoryName: 'TV & Vídeo' };
  }

  return { 
    categoryId: 'eletronicos', 
    categoryName: catName || merchCat || 'Eletrônicos & Tecnologia' 
  };
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
  const categoryInfo = resolveCategory(row.category_name, row.merchant_category);

  const keywords = Array.from(new Set([
    ...title.toLowerCase().split(/[\s,.-]+/).filter((w) => w.length > 2),
    storeInfo.storeName.toLowerCase(),
    categoryInfo.categoryName.toLowerCase(),
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

  return new Promise((resolve, reject) => {
    https.get(AWIN_DATAFEED_URL, (response) => {
      if (response.statusCode !== 200) {
        return reject(new Error(`Erro HTTP Awin: ${response.statusCode} ${response.statusMessage}`));
      }

      const gunzip = zlib.createGunzip();
      const parser = csv({ separator: ',' });

      response.pipe(gunzip).pipe(parser)
        .on('data', async (row) => {
          const product = mapRowToProduct(row);
          if (!product) return;

          totalProcessed++;
          batch.push(product);

          // Flush em lotes de BATCH_SIZE (500)
          if (batch.length >= BATCH_SIZE) {
            batchNumber++;
            const currentBatch = [...batch];
            batch = []; // Limpeza de memória imediata

            parser.pause();
            try {
              const { error } = await supabase.from('products').upsert(currentBatch, { onConflict: 'id' });
              if (error) {
                console.error(`❌ [Lote #${batchNumber}] Erro ao gravar ${currentBatch.length} itens:`, error.message);
              } else {
                totalUpserted += currentBatch.length;
                console.log(`✅ [Lote #${batchNumber}] ${currentBatch.length} produtos gravados no Supabase. Total acumulado: ${totalUpserted}`);
              }
            } catch (err) {
              console.error(`❌ [Lote #${batchNumber}] Exceção no upsert:`, err.message);
            } finally {
              parser.resume();
            }
          }
        })
        .on('end', async () => {
          // Gravação do último lote restante
          if (batch.length > 0) {
            batchNumber++;
            try {
              const { error } = await supabase.from('products').upsert(batch, { onConflict: 'id' });
              if (!error) {
                totalUpserted += batch.length;
                console.log(`✅ [Lote Final #${batchNumber}] ${batch.length} produtos gravados. Total acumulado: ${totalUpserted}`);
              }
            } catch (err) {
              console.error(`❌ [Lote Final] Erro:`, err.message);
            }
            batch = [];
          }

          const duration = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log('================================================================');
          console.log(`🎉 [CONCLUÍDO COM SUCESSO] Tempo total: ${duration}s`);
          console.log(`📊 Linhas processadas: ${totalProcessed}`);
          console.log(`💾 Produtos gravados/atualizados no banco: ${totalUpserted}`);
          console.log('================================================================');
          resolve({ totalProcessed, totalUpserted, duration });
        })
        .on('error', (err) => {
          console.error('❌ Erro no stream do CSV/Gzip:', err);
          reject(err);
        });
    }).on('error', (err) => {
      console.error('❌ Erro na requisição HTTP:', err);
      reject(err);
    });
  });
}

runWorker()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Falha fatal no Worker Awin:', err);
    process.exit(1);
  });
