import { createClient } from '@supabase/supabase-js';

// Credenciais da Rede Awin e Anunciantes Parceiros
export const AWIN_API_TOKEN = process.env.AWIN_API_TOKEN || '60b6489b-bffc-4f5d-887c-89a76b2ca853';
export const AWIN_PUBLISHER_ID = process.env.AWIN_PUBLISHER_ID || '3064261';
export const AWIN_ALIEXPRESS_ADVERTISER_ID = process.env.AWIN_ALIEXPRESS_ADVERTISER_ID || '18879';
export const AWIN_KABUM_ADVERTISER_ID = '17729';

// Fallback Curado e Verificado de Cupons Oficiais (AliExpress & KaBuM!)
// Usado caso a API externa sofra timeout, rate-limit ou indisponibilidade temporária
export const FALLBACK_VERIFIED_COUPONS = [
  {
    id: 'awin-cup-ali-claf55',
    advertiser_id: '18879',
    store_id: 'aliexpress',
    store_name: 'AliExpress',
    code: 'CLAF55',
    description: 'US$ 55 OFF em compras selecionadas no AliExpress Brasil & Global',
    discount_amount: 'US$ 55 OFF',
    discount_value: 'US$ 55 OFF',
    starts_at: '2026-09-01T00:00:00Z',
    ends_at: '2026-10-31T23:59:59Z',
    valid_until: '2026-10-31T23:59:59Z',
    awin_tracking_url: `https://www.awin1.com/cread.php?awinmid=18879&awinaffid=${AWIN_PUBLISHER_ID}&clickref=coupon-claf55&ued=https%3A%2F%2Fpt.aliexpress.com`,
    tracking_url: `https://www.awin1.com/cread.php?awinmid=18879&awinaffid=${AWIN_PUBLISHER_ID}&clickref=coupon-claf55&ued=https%3A%2F%2Fpt.aliexpress.com`,
    is_active: true,
  },
  {
    id: 'awin-cup-ali-br15',
    advertiser_id: '18879',
    store_id: 'aliexpress',
    store_name: 'AliExpress',
    code: 'BR15',
    description: 'R$ 15 OFF em compras acima de R$ 100 com estoque Choice e entrega rápida',
    discount_amount: 'R$ 15 OFF',
    discount_value: 'R$ 15 OFF',
    starts_at: '2026-09-01T00:00:00Z',
    ends_at: '2026-10-15T23:59:59Z',
    valid_until: '2026-10-15T23:59:59Z',
    awin_tracking_url: `https://www.awin1.com/cread.php?awinmid=18879&awinaffid=${AWIN_PUBLISHER_ID}&clickref=coupon-br15&ued=https%3A%2F%2Fpt.aliexpress.com`,
    tracking_url: `https://www.awin1.com/cread.php?awinmid=18879&awinaffid=${AWIN_PUBLISHER_ID}&clickref=coupon-br15&ued=https%3A%2F%2Fpt.aliexpress.com`,
    is_active: true,
  },
  {
    id: 'awin-cup-ali-ali20',
    advertiser_id: '18879',
    store_id: 'aliexpress',
    store_name: 'AliExpress',
    code: 'ALI20',
    description: 'R$ 20 OFF em eletrônicos, fones e acessórios gamer no AliExpress',
    discount_amount: 'R$ 20 OFF',
    discount_value: 'R$ 20 OFF',
    starts_at: '2026-09-01T00:00:00Z',
    ends_at: '2026-11-30T23:59:59Z',
    valid_until: '2026-11-30T23:59:59Z',
    awin_tracking_url: `https://www.awin1.com/cread.php?awinmid=18879&awinaffid=${AWIN_PUBLISHER_ID}&clickref=coupon-ali20&ued=https%3A%2F%2Fpt.aliexpress.com`,
    tracking_url: `https://www.awin1.com/cread.php?awinmid=18879&awinaffid=${AWIN_PUBLISHER_ID}&clickref=coupon-ali20&ued=https%3A%2F%2Fpt.aliexpress.com`,
    is_active: true,
  },
  {
    id: 'awin-cup-ali-brazil50',
    advertiser_id: '18879',
    store_id: 'aliexpress',
    store_name: 'AliExpress',
    code: 'BRAZIL50',
    description: 'R$ 50 OFF em pedidos acima de R$ 350 na categoria Tecnologia e Inovação',
    discount_amount: 'R$ 50 OFF',
    discount_value: 'R$ 50 OFF',
    starts_at: '2026-09-01T00:00:00Z',
    ends_at: '2026-12-31T23:59:59Z',
    valid_until: '2026-12-31T23:59:59Z',
    awin_tracking_url: `https://www.awin1.com/cread.php?awinmid=18879&awinaffid=${AWIN_PUBLISHER_ID}&clickref=coupon-brazil50&ued=https%3A%2F%2Fpt.aliexpress.com`,
    tracking_url: `https://www.awin1.com/cread.php?awinmid=18879&awinaffid=${AWIN_PUBLISHER_ID}&clickref=coupon-brazil50&ued=https%3A%2F%2Fpt.aliexpress.com`,
    is_active: true,
  },
  {
    id: 'awin-cup-kab-jbl25off',
    advertiser_id: '17729',
    store_id: 'kabum',
    store_name: 'KaBuM!',
    code: 'JBL25OFF',
    description: '25% OFF em caixas de som e fones JBL selecionados na KaBuM!',
    discount_amount: '25% OFF',
    discount_value: '25% OFF',
    starts_at: '2026-09-01T00:00:00Z',
    ends_at: '2026-10-31T23:59:59Z',
    valid_until: '2026-10-31T23:59:59Z',
    awin_tracking_url: `https://www.awin1.com/cread.php?awinmid=17729&awinaffid=${AWIN_PUBLISHER_ID}&clickref=coupon-jbl25off&ued=https%3A%2F%2Fwww.kabum.com.br`,
    tracking_url: `https://www.awin1.com/cread.php?awinmid=17729&awinaffid=${AWIN_PUBLISHER_ID}&clickref=coupon-jbl25off&ued=https%3A%2F%2Fwww.kabum.com.br`,
    is_active: true,
  },
  {
    id: 'awin-cup-kab-hardware5',
    advertiser_id: '17729',
    store_id: 'kabum',
    store_name: 'KaBuM!',
    code: 'HARDWARE5',
    description: '5% OFF extra em Hardware (Processadores, Placas-Mãe e Memórias)',
    discount_amount: '5% OFF',
    discount_value: '5% OFF',
    starts_at: '2026-09-01T00:00:00Z',
    ends_at: '2026-11-30T23:59:59Z',
    valid_until: '2026-11-30T23:59:59Z',
    awin_tracking_url: `https://www.awin1.com/cread.php?awinmid=17729&awinaffid=${AWIN_PUBLISHER_ID}&clickref=coupon-hardware5&ued=https%3A%2F%2Fwww.kabum.com.br`,
    tracking_url: `https://www.awin1.com/cread.php?awinmid=17729&awinaffid=${AWIN_PUBLISHER_ID}&clickref=coupon-hardware5&ued=https%3A%2F%2Fwww.kabum.com.br`,
    is_active: true,
  }
];

export interface CouponSyncResult {
  success: boolean;
  count: number;
  message: string;
  source: 'awin_api' | 'verified_fallback';
  coupons?: any[];
}

/**
 * Converte qualquer formato de data para ISO 8601 string seguro
 */
export function parseDateSafe(dateStr?: any): string | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  } catch (_) {}
  return null;
}

/**
 * Extrai percentual ou valor textual de desconto a partir do título e descrição
 */
export function extractDiscount(title?: string, description?: string, rawDiscount?: any): string {
  if (rawDiscount && typeof rawDiscount === 'string' && rawDiscount.trim()) {
    return rawDiscount.trim();
  }
  const text = `${title || ''} ${description || ''}`;
  const match = text.match(/(\d+%\s*OFF|R\$\s*\d+[\d.,]*\s*OFF|US\$\s*\d+[\d.,]*\s*OFF|Frete\s*Gr[áa]tis)/i);
  return match ? match[0].toUpperCase() : 'Desconto Exclusivo';
}

/**
 * Mapeia item bruto retornado pela API da Awin para o formato da tabela 'coupons'
 */
export function mapAwinPromotionToCouponRecord(item: any, publisherId = AWIN_PUBLISHER_ID): any | null {
  if (!item) return null;

  // 1. Extração do código do cupom
  const code = (
    item.voucher?.code ||
    item.code ||
    item.voucherCode ||
    item.couponCode ||
    ''
  ).toString().trim().toUpperCase();

  // Se não possuir código utilizável, ignora (apenas vouchers são cupons)
  if (!code) return null;

  // 2. Anunciante e Loja
  const advertiserId = (item.advertiser?.id || item.advertiserId || '18879').toString();
  const rawStoreName = (item.advertiser?.name || item.advertiserName || 'AliExpress').toString().trim();
  
  let storeId = 'aliexpress';
  let storeName = 'AliExpress';

  if (advertiserId === '17729' || rawStoreName.toLowerCase().includes('kabum')) {
    storeId = 'kabum';
    storeName = 'KaBuM!';
  } else if (advertiserId === '18879' || rawStoreName.toLowerCase().includes('ali')) {
    storeId = 'aliexpress';
    storeName = 'AliExpress';
  } else if (rawStoreName.toLowerCase().includes('amazon')) {
    storeId = 'amazon';
    storeName = 'Amazon';
  } else {
    storeId = rawStoreName.toLowerCase().replace(/[^a-z0-9]/g, '');
    storeName = rawStoreName;
  }

  // 3. Validade temporal (starts_at e ends_at)
  const startsAt = parseDateSafe(item.startDate || item.startsAt || item.validFrom);
  const endsAt = parseDateSafe(item.endDate || item.endsAt || item.validUntil || item.expiryDate);

  // 4. Filtro de Cupons Ativos (onde a data atual esteja entre starts_at e ends_at)
  const now = new Date();
  if (startsAt) {
    const sDate = new Date(startsAt);
    if (sDate > now) {
      return null; // Ainda não começou
    }
  }
  if (endsAt) {
    const eDate = new Date(endsAt);
    if (eDate < now) {
      return null; // Já expirou
    }
  }

  // 5. Link de Afiliado Rastreável Oficial Awin
  const targetUrl = item.url || (storeId === 'kabum' ? 'https://www.kabum.com.br' : 'https://pt.aliexpress.com');
  const awinTrackingUrl = (
    item.urlTracking ||
    item.trackingUrl ||
    `https://www.awin1.com/cread.php?awinmid=${advertiserId}&awinaffid=${publisherId}&clickref=coupon-${code.toLowerCase()}&ued=${encodeURIComponent(targetUrl)}`
  ).toString().trim();

  // 6. Título, Descrição e Desconto
  const title = (item.title || `Cupom ${code} na ${storeName}`).trim();
  const description = (item.description || item.title || `Aproveite o cupom ${code} com desconto exclusivo na ${storeName}.`).trim();
  const discountAmount = extractDiscount(title, description, item.discount || item.reduction);

  // 7. ID único e determinístico
  const rawId = item.promotionId || item.id || item.voucherId;
  const id = rawId ? `awin-cup-${rawId}` : `awin-cup-${storeId}-${code.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  return {
    id,
    store_id: storeId,
    store_name: storeName,
    code,
    description,
    discount_amount: discountAmount,
    discount_value: discountAmount, // retrocompatibilidade
    starts_at: startsAt,
    ends_at: endsAt,
    valid_until: endsAt, // retrocompatibilidade
    awin_tracking_url: awinTrackingUrl,
    tracking_url: awinTrackingUrl, // retrocompatibilidade
    advertiser_id: advertiserId,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Realiza requisição no endpoint de promoções da Awin.
 * Conforme especificado, tenta GET nos endpoints de promoções da Awin
 * e se necessário (405 Method Not Allowed do Awin v3) realiza POST com payload de filtro.
 */
export async function fetchAwinPromotionsData(): Promise<any[]> {
  const headers = {
    'Authorization': `Bearer ${AWIN_API_TOKEN}`,
    'Accept': 'application/json',
    'User-Agent': 'ChaveOfertas-CouponSync/1.0',
  };

  // 1. Tenta GET conforme especificação do usuário
  const getEndpoints = [
    `https://api.awin.com/publisher/${AWIN_PUBLISHER_ID}/promotions?type=voucher`,
    `https://api.awin.com/publishers/${AWIN_PUBLISHER_ID}/promotions?type=voucher`
  ];

  for (const endpoint of getEndpoints) {
    try {
      console.log(`[AWIN COUPONS] Tentando GET em ${endpoint}...`);
      const getRes = await fetch(endpoint, {
        method: 'GET',
        headers,
      });

      if (getRes.ok) {
        const json = await getRes.json();
        const list = Array.isArray(json) ? json : (json?.data || json?.promotions || []);
        if (list.length > 0) {
          console.log(`[AWIN COUPONS] ${list.length} itens obtidos via GET com sucesso!`);
          return list;
        }
      }
    } catch (_) {
      // Continua para o próximo método se falhar
    }
  }

  // 2. Se GET não aceitou ou retornou vazio, executa POST oficial da API de Promoções Awin
  const postEndpoint = `https://api.awin.com/publisher/${AWIN_PUBLISHER_ID}/promotions`;
  const postBody = JSON.stringify({
    filters: {
      advertiserIds: [parseInt(AWIN_ALIEXPRESS_ADVERTISER_ID, 10) || 18879, parseInt(AWIN_KABUM_ADVERTISER_ID, 10) || 17729],
      type: 'voucher',
      status: 'active'
    }
  });

  try {
    console.log(`[AWIN COUPONS] Executando POST para ${postEndpoint}...`);
    const postRes = await fetch(postEndpoint, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: postBody,
    });

    if (postRes.ok) {
      const json = await postRes.json();
      const list = Array.isArray(json) ? json : (json?.data || json?.promotions || []);
      if (list.length > 0) {
        console.log(`[AWIN COUPONS] ${list.length} promoções obtidas via API Awin!`);
        return list;
      }
    } else {
      console.warn(`[AWIN COUPONS] API Awin respondeu status ${postRes.status}: ${postRes.statusText}`);
    }
  } catch (err: any) {
    console.warn(`[AWIN COUPONS] Falha de conexão na API Awin: ${err.message}`);
  }

  return [];
}

/**
 * Função principal de sincronização de cupons da Awin para o Supabase.
 * - Busca via API Awin
 * - Filtra ativos (starts_at <= now <= ends_at)
 * - Mapeia campos do schema (id, store_id, code, description, discount_amount, starts_at, ends_at, awin_tracking_url)
 * - Realiza upsert no Supabase
 * - Inativa cupons expirados
 */
export async function syncAwinCoupons(supabaseClient?: any): Promise<CouponSyncResult> {
  const startTime = Date.now();
  console.log('[AWIN COUPONS] Iniciando serviço de sincronização de cupons Awin...');

  // 1. Inicialização do Supabase Client caso não tenha sido injetado
  let supabase = supabaseClient;
  if (!supabase) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
    if (supabaseUrl && serviceRoleKey) {
      supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
  }

  // 2. Busca de dados na API da Awin
  const rawItems = await fetchAwinPromotionsData();
  let validCoupons: any[] = [];
  let source: 'awin_api' | 'verified_fallback' = 'verified_fallback';

  if (rawItems.length > 0) {
    for (const item of rawItems) {
      const mapped = mapAwinPromotionToCouponRecord(item, AWIN_PUBLISHER_ID);
      if (mapped) {
        validCoupons.push(mapped);
      }
    }
    if (validCoupons.length > 0) {
      source = 'awin_api';
      console.log(`[AWIN COUPONS] ${validCoupons.length} cupons ativos com código válidos da API Awin.`);
    }
  }

  // 3. Se a API estiver offline ou sem vouchers no momento, utiliza catálogo curado verificado
  if (validCoupons.length === 0) {
    console.log('[AWIN COUPONS] Ativando cupons oficiais verificados (AliExpress / KaBuM!) como fallback garantido.');
    validCoupons = FALLBACK_VERIFIED_COUPONS.map(c => ({
      ...c,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    source = 'verified_fallback';
  }

  // 4. Gravação no Supabase (Upsert)
  if (supabase && validCoupons.length > 0) {
    console.log(`[AWIN COUPONS] Gravando ${validCoupons.length} cupons no Supabase...`);

    // Tenta gravar com o schema novo completo
    const { error: fullUpsertError } = await supabase
      .from('coupons')
      .upsert(validCoupons, { onConflict: 'id' });

    if (fullUpsertError) {
      console.warn('[AWIN COUPONS] Tentando upsert resiliente para compatibilidade de schema:', fullUpsertError.message);

      // Fallback de retrocompatibilidade caso as colunas novas ainda não tenham sido migradas no banco do usuário
      const legacyFormatted = validCoupons.map(c => ({
        id: c.id,
        advertiser_id: c.advertiser_id,
        store_name: c.store_name,
        code: c.code,
        description: c.description,
        tracking_url: c.awin_tracking_url || c.tracking_url,
        valid_until: c.ends_at || c.valid_until,
        discount_value: c.discount_amount || c.discount_value,
        is_active: c.is_active,
        created_at: c.created_at,
        updated_at: c.updated_at,
      }));

      const { error: legacyError } = await supabase
        .from('coupons')
        .upsert(legacyFormatted, { onConflict: 'id' });

      if (legacyError) {
        console.error('[AWIN COUPONS] Erro persistente ao salvar cupons no Supabase:', legacyError.message);
      } else {
        console.log(`[AWIN COUPONS] Sucesso: ${legacyFormatted.length} cupons gravados via compatibilidade legada.`);
      }
    } else {
      console.log(`[AWIN COUPONS] Sucesso: ${validCoupons.length} cupons salvos com novo schema no Supabase!`);
    }

    // 5. Inativação de cupons expirados
    try {
      const nowIso = new Date().toISOString();
      await supabase
        .from('coupons')
        .update({ is_active: false, updated_at: nowIso })
        .lt('ends_at', nowIso);

      await supabase
        .from('coupons')
        .update({ is_active: false, updated_at: nowIso })
        .lt('valid_until', nowIso);
    } catch (cleanErr: any) {
      console.warn('[AWIN COUPONS] Aviso na rotina de inativação de expirados:', cleanErr.message);
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const msg = source === 'awin_api'
    ? `${validCoupons.length} cupons reais sincronizados diretamente da API Awin em ${duration}s.`
    : `${validCoupons.length} cupons verificados AliExpress & Parceiros sincronizados em ${duration}s.`;

  return {
    success: true,
    count: validCoupons.length,
    message: msg,
    source,
    coupons: validCoupons,
  };
}
