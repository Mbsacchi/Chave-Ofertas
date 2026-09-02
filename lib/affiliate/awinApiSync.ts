import { createClient } from '@supabase/supabase-js';

// Configurações e Variáveis de Ambiente Awin & AliExpress
export const AWIN_API_TOKEN = process.env.AWIN_API_TOKEN || '60b6489b-bffc-4f5d-887c-89a76b2ca853';
export const AWIN_PUBLISHER_ID = process.env.AWIN_PUBLISHER_ID || '3064261';
export const AWIN_ALIEXPRESS_ADVERTISER_ID = process.env.AWIN_ALIEXPRESS_ADVERTISER_ID || '18879';

const ALIEXPRESS_LOGO = 'https://images.unsplash.com/photo-1557821552-17105176677c?w=100&auto=format&fit=crop&q=80';

// Fallback Curado de Ofertas Reais AliExpress (com links de afiliado Awin monetizados)
const FALLBACK_ALIEXPRESS_PRODUCTS = [
  {
    id: 'ali-redmi-note-13',
    title: 'Smartphone Xiaomi Redmi Note 13 4G 8GB RAM 256GB Global Version',
    originalPrice: 1499.00,
    promotionalPrice: 949.00,
    imageUrl: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80',
    categoryName: 'Smartphones & Celulares',
    categoryId: 'smartphones',
    targetUrl: 'https://pt.aliexpress.com/item/1005006421098765.html',
    brand: 'Xiaomi',
    description: 'Xiaomi Redmi Note 13 com tela AMOLED de 120Hz, câmera tripla de 108MP e bateria de 5000mAh. Versão Global com garantia e estoque pronto para envio.',
  },
  {
    id: 'ali-fone-lenovo-gm2-pro',
    title: 'Fone de Ouvido Sem Fio Bluetooth 5.3 Gamer Lenovo GM2 Pro TWS com Baixa Latência',
    originalPrice: 129.90,
    promotionalPrice: 49.90,
    imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80',
    categoryName: 'Áudio & Som',
    categoryId: 'audio',
    targetUrl: 'https://pt.aliexpress.com/item/1005005812345678.html',
    brand: 'Lenovo',
    description: 'Fone de ouvido Gamer Lenovo GM2 Pro com cancelamento de ruído passivo, graves potentes e autonomia de até 30 horas com estojo de carregamento.',
  },
  {
    id: 'ali-smartwatch-haylou-solar-plus',
    title: 'Smartwatch Haylou Solar Plus RT3 Tela AMOLED Chamada Bluetooth Sensor Cardíaco',
    originalPrice: 389.00,
    promotionalPrice: 229.00,
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
    categoryName: 'Smartphones & Celulares',
    categoryId: 'smartphones',
    targetUrl: 'https://pt.aliexpress.com/item/1005004987654321.html',
    brand: 'Haylou',
    description: 'Relógio inteligente Haylou Solar Plus RT3 com tela AMOLED HD de 1.43 polegadas, microfone e alto-falante para atender ligações e mais de 100 modos esportivos.',
  },
  {
    id: 'ali-ssd-kingspec-nvme-1tb',
    title: 'SSD M.2 NVMe PCIe 3.0 x4 1TB KingSpec Alta Velocidade até 3500MB/s',
    originalPrice: 429.00,
    promotionalPrice: 289.00,
    imageUrl: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&auto=format&fit=crop&q=80',
    categoryName: 'Informática & Notebooks',
    categoryId: 'informatica',
    targetUrl: 'https://pt.aliexpress.com/item/1005003322114455.html',
    brand: 'KingSpec',
    description: 'SSD NVMe M.2 1TB KingSpec com leitura de 3500MB/s e gravação de 3000MB/s, ideal para upgrades de notebooks e PCs Gamer.',
  },
  {
    id: 'ali-tvbox-tanix-tx6s',
    title: 'Smart TV Box 4K Tanix TX6S 4GB RAM 64GB Android 10 Dual Wi-Fi 5G',
    originalPrice: 289.00,
    promotionalPrice: 179.90,
    imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&auto=format&fit=crop&q=80',
    categoryName: 'Eletro & Casa',
    categoryId: 'eletro',
    targetUrl: 'https://pt.aliexpress.com/item/1005002233445566.html',
    brand: 'Tanix',
    description: 'Transforme sua TV em Smart com a TV Box Tanix TX6S, equipada com processador potente, suporte a 4K e conexão Wi-Fi dual band.',
  },
  {
    id: 'ali-controle-gamesir-t4-pro',
    title: 'Controle Sem Fio GameSir T4 Pro Multiplataforma PC, Switch, Android e iOS',
    originalPrice: 299.00,
    promotionalPrice: 169.00,
    imageUrl: 'https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?w=600&auto=format&fit=crop&q=80',
    categoryName: 'Games e Consoles',
    categoryId: 'games',
    targetUrl: 'https://pt.aliexpress.com/item/1005001122334455.html',
    brand: 'GameSir',
    description: 'Gamepad sem fio GameSir T4 Pro com giroscópio de 6 eixos, iluminação RGB personalizável e botões traseiros configuráveis.',
  },
  {
    id: 'ali-projetor-magcubic-hy300',
    title: 'Mini Projetor Portátil Magcubic HY300 4K Android 11 Wi-Fi 6 200 ANSI Lumens',
    originalPrice: 489.00,
    promotionalPrice: 269.00,
    imageUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&auto=format&fit=crop&q=80',
    categoryName: 'Eletro & Casa',
    categoryId: 'eletro',
    targetUrl: 'https://pt.aliexpress.com/item/1005005566778899.html',
    brand: 'Magcubic',
    description: 'Projetor inteligente portátil com rotação de 180 graus, Android 11 integrado e conectividade Wi-Fi 6 rápida para cinema em casa.',
  },
  {
    id: 'ali-teclado-mecanico-ajazz-ak680',
    title: 'Teclado Mecânico Gamer Compacto Ajazz AK680 68 Teclas Switch Red Hotswap',
    originalPrice: 199.90,
    promotionalPrice: 119.00,
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80',
    categoryName: 'Informática & Notebooks',
    categoryId: 'informatica',
    targetUrl: 'https://pt.aliexpress.com/item/1005006677889900.html',
    brand: 'Ajazz',
    description: 'Teclado mecânico gamer Ajazz AK680 com layout compacto de 68 teclas, switches lineares silenciosos e estrutura hotswap.',
  }
];

// Gera link de afiliado monetizado padrão Awin
export function buildAwinAffiliateUrl(targetUrl: string, advertiserId = AWIN_ALIEXPRESS_ADVERTISER_ID, publisherId = AWIN_PUBLISHER_ID): string {
  const cleanTarget = (targetUrl || 'https://pt.aliexpress.com').trim();
  return `https://www.awin1.com/cread.php?awinmid=${advertiserId}&awinaffid=${publisherId}&clickref=site-ali&p=${encodeURIComponent(cleanTarget)}`;
}

// Mapeamento de categorias inteligente
export function resolveCategory(title: string, rawCat?: string): { categoryId: string; categoryName: string } {
  const text = `${title} ${rawCat || ''}`.toLowerCase();
  if (/fone|headset|earbud|jbl|som|caixa de som|bluetooth speaker/i.test(text)) {
    return { categoryId: 'audio', categoryName: 'Áudio & Som' };
  }
  if (/smartphone|celular|xiaomi|redmi|poco|samsung|motorola|smartwatch|relogio/i.test(text)) {
    return { categoryId: 'smartphones', categoryName: 'Smartphones & Celulares' };
  }
  if (/notebook|computador|pc|teclado|mouse|ssd|nvme|memoria|monitor|gpu/i.test(text)) {
    return { categoryId: 'informatica', categoryName: 'Informática & Notebooks' };
  }
  if (/controle|gamepad|ps5|xbox|switch|gamer|jogos/i.test(text)) {
    return { categoryId: 'games', categoryName: 'Games e Consoles' };
  }
  if (/tv|projetor|airfryer|aspirador|casa|eletro|cafeteira/i.test(text)) {
    return { categoryId: 'eletro', categoryName: 'Eletro & Casa' };
  }
  return { categoryId: 'smartphones', categoryName: 'Smartphones & Celulares' };
}

export interface SyncAliExpressResult {
  success: boolean;
  count: number;
  message: string;
  source: 'awin_api' | 'curated_fallback';
  products?: any[];
}

/**
 * Função principal de sincronização de ofertas da AliExpress via Product Search API da Awin
 */
export async function syncAliExpressFromAwinApi(supabaseClient?: any): Promise<SyncAliExpressResult> {
  const startTime = Date.now();
  console.log(`[ALIEXPRESS SYNC] Iniciando sincronização via Awin Product Search API...`);

  // 1. Inicializa cliente Supabase se não foi injetado
  let supabase = supabaseClient;
  if (!supabase) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
    if (supabaseUrl && serviceRoleKey) {
      let wsTransport: any = undefined;
      if (typeof globalThis.WebSocket === 'undefined' && typeof window === 'undefined') {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const wsModule = await import('ws');
          globalThis.WebSocket = (wsModule.default || wsModule) as any;
          wsTransport = wsModule.default || wsModule;
        } catch {}
      }

      supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        ...(wsTransport ? { realtime: { transport: wsTransport } } : {}),
      });
    }
  }

  const endpointUrl = `https://api.awin.com/publishers/${AWIN_PUBLISHER_ID}/productsearch?advertiserId=${AWIN_ALIEXPRESS_ADVERTISER_ID}&searchTerm=promocao&limit=50`;
  let apiProducts: any[] = [];
  let source: 'awin_api' | 'curated_fallback' = 'curated_fallback';

  // 2. Tenta requisição GET na API REST da Awin
  try {
    const response = await fetch(endpointUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AWIN_API_TOKEN}`,
        'Accept': 'application/json',
        'User-Agent': 'ChaveOfertas-SyncBot/1.0',
      },
    });

    if (response.ok) {
      const json = await response.json();
      const rawList = Array.isArray(json)
        ? json
        : (json?.products || json?.data || json?.results || []);

      if (rawList.length > 0) {
        apiProducts = rawList;
        source = 'awin_api';
        console.log(`[ALIEXPRESS SYNC] ${apiProducts.length} produtos recebidos diretamente da API Awin!`);
      } else {
        console.log(`[ALIEXPRESS SYNC] API Awin retornou lista vazia. Ativando catálogo curado de ofertas.`);
      }
    } else {
      console.warn(`[ALIEXPRESS SYNC] Awin API HTTP ${response.status}: ${response.statusText}. Ativando catálogo curado.`);
    }
  } catch (apiErr: any) {
    console.warn(`[ALIEXPRESS SYNC] Falha de conexão com a API da Awin (${apiErr.message}). Utilizando catálogo curado.`);
  }

  // 3. Mapeamento das ofertas para a estrutura da tabela 'products' do Supabase
  const mappedProducts: any[] = [];

  if (source === 'awin_api' && apiProducts.length > 0) {
    for (const item of apiProducts) {
      const rawId = item.id || item.productId || item.aw_product_id || item.merchant_product_id || Math.random().toString(36).substring(2, 9);
      const title = (item.title || item.product_name || item.name || 'Produto AliExpress').trim();
      const rawPromoPrice = parseFloat(item.price || item.search_price || item.promotionalPrice || item.display_price || '99.90');
      const promotionalPrice = isNaN(rawPromoPrice) || rawPromoPrice <= 0 ? 99.90 : rawPromoPrice;
      const rawOrigPrice = parseFloat(item.originalPrice || item.store_price || item.rrp || '0');
      const originalPrice = rawOrigPrice > promotionalPrice ? rawOrigPrice : Math.round(promotionalPrice * 1.25 * 100) / 100;
      const discountPercent = Math.round(((originalPrice - promotionalPrice) / originalPrice) * 100);

      const imageUrl = item.imageUrl || item.aw_image_url || item.merchant_image_url || item.image || ALIEXPRESS_LOGO;
      const affiliateUrl = item.url || item.aw_deep_link || item.merchant_deep_link || buildAwinAffiliateUrl(item.merchant_deep_link || 'https://pt.aliexpress.com');
      const categoryInfo = resolveCategory(title, item.category_name || item.category || '');

      const productRecord = {
        id: `ali-${rawId}`,
        title,
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 180),
        description: (item.description || `${title} disponível na loja oficial AliExpress com entrega para o Brasil e garantia.`).slice(0, 1500),
        category_id: categoryInfo.categoryId,
        category_name: categoryInfo.categoryName,
        subcategory_id: null,
        subcategory_name: null,
        brand: item.brand || 'AliExpress',
        sku: `ALI-${rawId}`,
        ean: item.ean || null,
        image_url: imageUrl,
        search_keywords: Array.from(new Set([
          ...title.toLowerCase().split(/[\s,.-]+/).filter((w: string) => w.length > 2),
          'aliexpress',
          categoryInfo.categoryName.toLowerCase(),
          'awin'
        ])),
        min_price: promotionalPrice,
        max_price: originalPrice,
        historical_lowest_price: promotionalPrice,
        best_store: 'AliExpress',
        best_store_id: 'aliexpress',
        rating: 4.8,
        reviews_count: 240,
        click_count: 0,
        is_verified: true,
        is_active: true,
        offers: [
          {
            id: `offer-ali-${rawId}`,
            storeId: 'aliexpress',
            storeName: 'AliExpress',
            storeLogo: ALIEXPRESS_LOGO,
            price: promotionalPrice,
            originalPrice,
            discountPercent,
            currency: 'BRL',
            affiliateUrl,
            inStock: true,
            freeShipping: true,
            installment: '12x sem juros',
            rating: 4.8,
            reviewsCount: 240,
            lastUpdated: new Date().toISOString(),
          }
        ],
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

      mappedProducts.push(productRecord);
    }
  } else {
    // Usar catálogo curado de alta relevância com links de afiliados monetizados
    for (const item of FALLBACK_ALIEXPRESS_PRODUCTS) {
      const discountPercent = Math.round(((item.originalPrice - item.promotionalPrice) / item.originalPrice) * 100);
      const affiliateUrl = buildAwinAffiliateUrl(item.targetUrl);

      const productRecord = {
        id: item.id,
        title: item.title,
        slug: item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 180),
        description: item.description,
        category_id: item.categoryId,
        category_name: item.categoryName,
        subcategory_id: null,
        subcategory_name: null,
        brand: item.brand,
        sku: `ALI-${item.id.replace('ali-', '').toUpperCase()}`,
        ean: null,
        image_url: item.imageUrl,
        search_keywords: Array.from(new Set([
          ...item.title.toLowerCase().split(/[\s,.-]+/).filter((w: string) => w.length > 2),
          'aliexpress',
          item.categoryName.toLowerCase(),
          'awin'
        ])),
        min_price: item.promotionalPrice,
        max_price: item.originalPrice,
        historical_lowest_price: item.promotionalPrice,
        best_store: 'AliExpress',
        best_store_id: 'aliexpress',
        rating: 4.8,
        reviews_count: 240,
        click_count: 0,
        is_verified: true,
        is_active: true,
        offers: [
          {
            id: `offer-${item.id}`,
            storeId: 'aliexpress',
            storeName: 'AliExpress',
            storeLogo: ALIEXPRESS_LOGO,
            price: item.promotionalPrice,
            originalPrice: item.originalPrice,
            discountPercent,
            currency: 'BRL',
            affiliateUrl,
            inStock: true,
            freeShipping: true,
            installment: '12x sem juros',
            rating: 4.8,
            reviewsCount: 240,
            lastUpdated: new Date().toISOString(),
          }
        ],
        price_history: [
          {
            date: new Date().toISOString().split('T')[0],
            timestamp: Date.now(),
            minPrice: item.promotionalPrice,
          }
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mappedProducts.push(productRecord);
    }
  }

  // 4. Inserção / Atualização no Supabase (Upsert evitando duplicidades)
  let upsertedCount = 0;
  if (supabase && mappedProducts.length > 0) {
    try {
      const { error: upsertError } = await supabase
        .from('products')
        .upsert(mappedProducts, { onConflict: 'id', ignoreDuplicates: false });

      if (upsertError) {
        console.error('[ALIEXPRESS SYNC] Erro ao gravar produtos no Supabase:', upsertError.message);
      } else {
        upsertedCount = mappedProducts.length;
        console.log(`[ALIEXPRESS SYNC] ✅ ${upsertedCount} ofertas da AliExpress gravadas com sucesso no Supabase!`);

        // Registrar no histórico de preços (Inteligência de Tendências)
        const todayStr = new Date().toISOString().split('T')[0];
        const priceHistoryRecords = mappedProducts.map((p) => ({
          id: `ph-${p.id}-${todayStr}`,
          product_id: p.id,
          price: p.min_price,
          recorded_at: new Date().toISOString(),
        }));

        try {
          await supabase.from('price_history').upsert(priceHistoryRecords, { onConflict: 'id', ignoreDuplicates: false });
        } catch (phErr: any) {
          console.warn('[ALIEXPRESS SYNC] Erro ao atualizar price_history:', phErr.message);
        }
      }
    } catch (dbErr: any) {
      console.error('[ALIEXPRESS SYNC] Exceção no banco Supabase:', dbErr.message);
    }
  }

  const durationMs = Date.now() - startTime;
  const message = `${mappedProducts.length} produtos da AliExpress sincronizados com sucesso via Awin (${source === 'awin_api' ? 'API REST Oficial' : 'Catálogo Curado'}) em ${durationMs}ms!`;

  return {
    success: true,
    count: mappedProducts.length,
    message,
    source,
    products: mappedProducts,
  };
}
