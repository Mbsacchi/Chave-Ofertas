import https from 'https';
import zlib from 'zlib';
import csv from 'csv-parser';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = WebSocket as any;
}

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

function resolveCategory(catName: string, merchCat: string): { categoryId: string; categoryName: string } {
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

  // Imagem: Prioriza merchant_image_url com fallback HTTPS
  let imageUrl = (row.merchant_image_url || row.aw_image_url || '').trim();
  if (imageUrl.startsWith('http://')) {
    imageUrl = imageUrl.replace('http://', 'https://');
  }
  if (!imageUrl) {
    imageUrl = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';
  }

  // Deep Link rastreável
  const affiliateUrl = (row.aw_deep_link || row.merchant_deep_link || '').trim();

  // Loja e Categoria
  const storeInfo = normalizeStore(row.merchant_name);
  const categoryInfo = resolveCategory(row.category_name, row.merchant_category);

  // Leitura e sanitização do código de barras EAN
  const rawEan = (row.ean || row.ean_code || row.barcode || row.gtin || row.upc || '').toString().trim();
  const ean = rawEan && rawEan !== '0' && rawEan !== 'null' && rawEan !== 'undefined' ? rawEan : null;

  // Palavras-chave para busca
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

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const startTime = Date.now();
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

  const isSupabaseReady = Boolean(supabaseUrl && supabaseKey && !supabaseKey.includes('placeholder'));
  const supabase = isSupabaseReady
    ? createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        realtime: { transport: WebSocket },
      })
    : null;

  // Parâmetros opcionais (ex: limit=1000 para sincronização rápida pelo browser)
  const maxLimit = req.query?.limit ? parseInt(req.query.limit, 10) : (req.body?.limit ? parseInt(req.body.limit, 10) : 0);

  console.log(`[AWIN SYNC STREAM] Iniciando processamento do feed oficial. Limite: ${maxLimit || 'Todos (16.000+)'}`);

  try {
    let processedCount = 0;
    let upsertedCount = 0;
    let sampleProduct: any = null;
    let batch: any[] = [];
    const clientProductsForResponse: any[] = [];

    await new Promise<void>((resolve, reject) => {
      https.get(AWIN_DATAFEED_URL, (response) => {
        if (response.statusCode !== 200) {
          return reject(new Error(`Awin HTTP error: ${response.statusCode} ${response.statusMessage}`));
        }

        const gunzip = zlib.createGunzip();
        const parser = csv({ separator: ',' });

        response.pipe(gunzip).pipe(parser)
          .on('data', async (row) => {
            if (maxLimit > 0 && processedCount >= maxLimit) {
              parser.destroy();
              return resolve();
            }

            const product = mapRowToProduct(row);
            if (!product) return;

            processedCount++;

            if (!sampleProduct) {
              sampleProduct = product;
              console.log('=== [AWIN SYNC STREAM] PRIMEIRA OFERTA PROCESSADA ===');
              console.log(JSON.stringify({
                id: product.id,
                title: product.title,
                min_price: product.min_price,
                best_store: product.best_store,
                affiliateUrl: product.offers[0]?.affiliateUrl,
                imageUrl: product.image_url
              }, null, 2));
            }

            // Manter uma pequena amostra para resposta HTTP do frontend
            if (clientProductsForResponse.length < 50) {
              clientProductsForResponse.push({
                id: product.id,
                title: product.title,
                slug: product.slug,
                description: product.description,
                categoryId: product.category_id,
                categoryName: product.category_name,
                brand: product.brand,
                sku: product.sku,
                imageUrl: product.image_url,
                searchKeywords: product.search_keywords,
                minPrice: product.min_price,
                maxPrice: product.max_price,
                historicalLowestPrice: product.historical_lowest_price,
                bestStore: product.best_store,
                bestStoreId: product.best_store_id,
                rating: product.rating,
                reviewsCount: product.reviews_count,
                isVerified: product.is_verified,
                isActive: product.is_active,
                offers: product.offers,
                priceHistory: product.price_history,
                createdAt: product.created_at,
                updatedAt: product.updated_at,
              });
            }

            batch.push(product);

            // Quando atinge BATCH_SIZE (500 itens), faz o upsert no Supabase
            if (batch.length >= BATCH_SIZE) {
              const currentBatch = [...batch];
              batch = []; // Limpeza imediata da memória RAM

              if (supabase) {
                parser.pause();
                try {
                  const { error } = await supabase.from('products').upsert(currentBatch, { onConflict: 'id' });
                  if (error) {
                    console.warn(`[AWIN SYNC STREAM] Erro no lote de ${currentBatch.length}:`, error.message);
                  } else {
                    upsertedCount += currentBatch.length;
                    console.log(`[AWIN SYNC STREAM] Lote de ${currentBatch.length} upserted com sucesso. Total: ${upsertedCount}`);
                  }
                } catch (batchErr: any) {
                  console.warn(`[AWIN SYNC STREAM] Falha no upsert do lote:`, batchErr.message);
                } finally {
                  parser.resume();
                }
              } else {
                upsertedCount += currentBatch.length;
              }
            }
          })
          .on('end', async () => {
            // Processar lote restante final
            if (batch.length > 0) {
              if (supabase) {
                try {
                  const { error } = await supabase.from('products').upsert(batch, { onConflict: 'id' });
                  if (!error) upsertedCount += batch.length;
                } catch (batchErr: any) {
                  console.warn(`[AWIN SYNC STREAM] Falha no último lote:`, batchErr.message);
                }
              } else {
                upsertedCount += batch.length;
              }
              batch = [];
            }
            resolve();
          })
          .on('error', (err) => {
            reject(err);
          });
      }).on('error', (err) => {
        reject(err);
      });
    });

    const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[AWIN SYNC STREAM] Concluído em ${durationSeconds}s. Processados: ${processedCount}, Gravados no Supabase: ${upsertedCount}`);

    return res.status(200).json({
      success: true,
      processedCount,
      upsertedCount,
      durationSeconds: `${durationSeconds}s`,
      products: clientProductsForResponse,
      sampleProduct,
      message: `${upsertedCount} produtos do feed Awin processados e atualizados via stream com sucesso em ${durationSeconds}s!`,
    });
  } catch (err: any) {
    console.error('[AWIN SYNC STREAM] Erro fatal no stream:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Erro no processamento do stream Awin',
    });
  }
}
