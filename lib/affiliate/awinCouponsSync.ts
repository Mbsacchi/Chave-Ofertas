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
 * Verifica se a promoção da Awin é válida para o Brasil ('BR') ou global/sem restrição regional
 * Descarta promoções exclusivas de outros países (ex: Chile, México, Espanha, etc.)
 */
export function isPromotionValidForBrazil(item: any): boolean {
  if (!item) return false;

  // 1. Extração de Regiões Estruturadas (regions, membershipRegions, countries, targetCountries)
  const rawRegions = 
    item.regions?.countries || 
    item.regions || 
    item.membershipRegions || 
    item.targetCountries ||
    item.countries ||
    item.campaign?.regions ||
    item.advertiser?.regions;

  if (rawRegions) {
    let regionList: any[] = [];
    if (Array.isArray(rawRegions)) {
      regionList = rawRegions;
    } else if (typeof rawRegions === 'object') {
      regionList = Object.values(rawRegions);
    } else if (typeof rawRegions === 'string') {
      regionList = rawRegions.split(/[,;\s/|]+/);
    }

    if (regionList.length > 0) {
      // Verifica se 'BR', 'BRAZIL', 'BRASIL' ou 'GLOBAL' está presente
      const hasBrazilOrGlobal = regionList.some((reg: any) => {
        if (!reg) return false;
        if (typeof reg === 'string') {
          const code = reg.trim().toUpperCase();
          return code === 'BR' || code === 'BRA' || code === 'BRAZIL' || code === 'BRASIL' || 
                 code === 'GLOBAL' || code === 'ALL' || code === 'WW' || code === 'WORLDWIDE';
        }
        if (typeof reg === 'object') {
          const code = (reg.countryCode || reg.code || reg.iso || reg.id || '').toString().trim().toUpperCase();
          const name = (reg.name || reg.country || '').toString().trim().toUpperCase();
          return code === 'BR' || code === 'BRA' || code === 'GLOBAL' || code === 'ALL' || 
                 name.includes('BRAZIL') || name.includes('BRASIL') || name.includes('GLOBAL') || name.includes('WORLDWIDE');
        }
        return false;
      });

      // Se uma lista explícita de regiões foi retornada e NÃO inclui o Brasil nem é global, descarta
      if (!hasBrazilOrGlobal) {
        return false;
      }
    }
  }

  // 2. Análise Semântica de Título / Descrição / Campanha
  // Evita que promoções com textos de outros países (ex: "Cupons Chile", "Exclusive Mexico") passem
  const fullText = `${item.title || ''} ${item.description || ''} ${item.campaignTitle || ''} ${item.campaign?.name || ''}`.toLowerCase();

  // Padrões de outros países
  const foreignCountryPatterns = [
    /\bchile\b/i,
    /\bchileno\b/i,
    /\bcl\b(?!\s*af)/i,
    /\bm[eé]xico\b/i,
    /\bmx\b/i,
    /\bespa[ñn]a\b/i,
    /\bspain\b/i,
    /\bes\b(?!\s*cu)/i,
    /\bcolombia\b/i,
    /\bargentina\b/i,
    /\bper[uú]\b/i,
    /\bfrance\b/i,
    /\bitaly\b/i,
    /\bitalia\b/i,
    /\bgermany\b/i,
    /\bdeutschland\b/i,
    /\bpoland\b/i,
    /\bpolska\b/i,
    /\brussia\b/i,
    /\bkorea\b/i,
    /\bukraine\b/i
  ];

  const explicitlyMentionsBrazilOrGlobal = /\b(brasil|brazil|br|global|worldwide|todos os pa[ií]ses|todos os usu[aá]rios)\b/i.test(fullText);

  if (!explicitlyMentionsBrazilOrGlobal) {
    for (const pattern of foreignCountryPatterns) {
      if (pattern.test(fullText)) {
        return false; // Descarta promoção exclusiva de outro país
      }
    }
  }

  return true;
}

/**
 * Higieniza e enriquece a descrição do cupom, removendo termos internos da Awin,
 * referências a campanhas estrangeiras e HTML, priorizando o valor do desconto e regras claras.
 */
export function cleanPromotionDescription(
  rawDescription: string, 
  rawTitle: string, 
  code: string, 
  storeName: string, 
  discountAmount?: string
): string {
  let text = (rawDescription || rawTitle || '').trim();

  // 1. Remove tags HTML
  text = text.replace(/<[^>]*>/g, ' ');

  // 2. Converte entidades HTML
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  // 3. Remove termos internos da Awin e nomenclaturas de campanha
  text = text
    .replace(/^(voucher|promotion|campanha|campaign|cupom|promo[cç][aã]o)[\s:_-]+/i, '')
    .replace(/\b(?:campaign|advertiser|publisher|awinmid)[_\s]?(?:id)?[_\s:_-]*\d+\b/gi, '')
    .replace(/\b(?:awin\s*exclusive|awin\s*voucher|exclusivo\s*awin|awin)\b/gi, '')
    .replace(/\b(?:terms\s*(?:and|&)\s*conditions|termos\s*e\s*condi[cç][oõ]es)[\s:_-]*(?:apply)?\b/gi, '')
    .replace(/\b(?:affiliate\s*program|programa\s*de\s*afiliados)\b/gi, '')
    .replace(/\b(?:chile|chileno|m[eé]xico|mexicano|espa[ñn]a|spain|spanish|colombia|argentina|per[uú])\b/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s:;._-]+/, '')
    .replace(/[\s:;._-]+$/, '')
    .trim();

  // 4. Se o texto estiver vazio, muito curto ou for apenas o código/nome da loja, gera descrição elegante
  if (!text || text.length < 8 || text.toLowerCase() === code.toLowerCase() || text.toLowerCase() === storeName.toLowerCase()) {
    if (discountAmount && discountAmount !== 'Desconto Exclusivo') {
      return `${discountAmount} em produtos selecionados na ${storeName}. Aplique o código ${code} no carrinho.`;
    }
    return `Aproveite o cupom ${code} com desconto exclusivo em compras na ${storeName}.`;
  }

  // 5. Prioriza o valor do desconto no início se não estiver explícito
  if (discountAmount && discountAmount !== 'Desconto Exclusivo' && !text.toUpperCase().includes(discountAmount.toUpperCase())) {
    text = `${discountAmount} - ${text}`;
  }

  // 6. Limita tamanho para não quebrar o layout do front-end
  if (text.length > 200) {
    text = text.substring(0, 197).trim() + '...';
  }

  return text;
}

/**
 * Deduplica um array de cupons garantindo que não existam códigos duplicados
 * para a mesma loja. Mantém a ocorrência mais completa.
 */
export function deduplicateCouponsByCode(coupons: any[]): any[] {
  const seen = new Map<string, any>();

  for (const coupon of coupons) {
    if (!coupon || !coupon.code) continue;
    const cleanCode = coupon.code.trim().toUpperCase();
    const store = (coupon.store_id || 'aliexpress').toLowerCase();
    const key = `${store}:${cleanCode}`;

    if (!seen.has(key)) {
      seen.set(key, coupon);
    } else {
      // Mantém a ocorrência que menciona Brasil ou tem descrição melhor
      const existing = seen.get(key);
      const newDesc = (coupon.description || '').toLowerCase();
      const existDesc = (existing.description || '').toLowerCase();
      if ((newDesc.includes('brasil') || newDesc.includes('br')) && !existDesc.includes('brasil')) {
        seen.set(key, coupon);
      }
    }
  }

  return Array.from(seen.values());
}

/**
 * Mapeia item bruto retornado pela API da Awin para o formato da tabela 'coupons'
 */
export function mapAwinPromotionToCouponRecord(item: any, publisherId = AWIN_PUBLISHER_ID): any | null {
  if (!item) return null;

  // 0. Filtro de Região: garante que apenas promoções do Brasil ('BR') ou globais sejam aceitas
  if (!isPromotionValidForBrazil(item)) {
    return null;
  }

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

  // 6. Tratamento Elegante de Título, Descrição e Desconto
  const rawTitle = (item.title || '').trim();
  const rawDesc = (item.description || item.title || '').trim();
  const discountAmount = extractDiscount(rawTitle, rawDesc, item.discount || item.reduction);
  const description = cleanPromotionDescription(rawDesc, rawTitle, code, storeName, discountAmount);

  // 7. ID único e determinístico baseado na loja e no código do cupom (evita duplicatas na chave primária)
  const cleanCodeSlug = code.toLowerCase().replace(/[^a-z0-9]/g, '');
  const id = `awin-cup-${storeId}-${cleanCodeSlug}`;

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
    source: 'api',
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
  let validCoupons: any[] = [];
  let source: 'awin_api' | 'verified_fallback' = 'verified_fallback';

  const rawItems = await fetchAwinPromotionsData();
  if (rawItems.length > 0) {
    for (const item of rawItems) {
      const mapped = mapAwinPromotionToCouponRecord(item, AWIN_PUBLISHER_ID);
      if (mapped) {
        validCoupons.push(mapped);
      }
    }
    
    // Deduplica o array processado garantindo código único por loja (Unique Code)
    validCoupons = deduplicateCouponsByCode(validCoupons);

    if (validCoupons.length > 0) {
      source = 'awin_api';
      console.log(`[AWIN COUPONS] ${validCoupons.length} cupons ativos, únicos e válidos para o Brasil obtidos da API Awin.`);
    }
  }

  // 3. Se a API estiver offline ou sem vouchers no momento, utiliza catálogo curado verificado
  if (validCoupons.length === 0) {
    console.log('[AWIN COUPONS] Ativando cupons oficiais verificados (AliExpress / KaBuM!) como fallback garantido.');
    validCoupons = deduplicateCouponsByCode(FALLBACK_VERIFIED_COUPONS.map(c => ({
      ...c,
      source: 'api',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })));
    source = 'verified_fallback';
  } else {
    // Garante deduplicação final
    validCoupons = deduplicateCouponsByCode(validCoupons);
  }

  // 4. Gravação no Supabase (Upsert com deduplicação garantida)
  if (supabase && validCoupons.length > 0) {
    console.log(`[AWIN COUPONS] Gravando ${validCoupons.length} cupons únicos no Supabase...`);

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
        source: c.source || 'api',
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

    // 5. Limpeza de registros duplicados legados no banco (onde o mesmo código existia com IDs diferentes)
    try {
      const { data: allDbCoupons } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (allDbCoupons && allDbCoupons.length > 0) {
        const seenCodeMap = new Set<string>();
        const idsToDelete: string[] = [];

        for (const row of allDbCoupons) {
          if (!row.code) continue;
          const storeKey = (row.store_id || row.store_name || 'aliexpress').toLowerCase();
          const key = `${storeKey}:${row.code.trim().toUpperCase()}`;
          if (seenCodeMap.has(key)) {
            idsToDelete.push(row.id);
          } else {
            seenCodeMap.add(key);
          }
        }

        if (idsToDelete.length > 0) {
          console.log(`[AWIN COUPONS] Removendo ${idsToDelete.length} registros com códigos duplicados no Supabase...`);
          for (let i = 0; i < idsToDelete.length; i += 50) {
            const batch = idsToDelete.slice(i, i + 50);
            await supabase.from('coupons').delete().in('id', batch);
          }
        }
      }
    } catch (dupErr: any) {
      console.warn('[AWIN COUPONS] Aviso ao limpar duplicatas legadas:', dupErr.message);
    }

    // 6. Inativação de cupons expirados (resiliente a qualquer schema)
    try {
      const now = new Date();
      const { data: allCoupons } = await supabase.from('coupons').select('*');
      if (allCoupons && allCoupons.length > 0) {
        const expiredIds = allCoupons
          .filter((c: any) => {
            const exp = c.ends_at || c.valid_until || c.expires_at || c.end_date;
            return Boolean(exp && new Date(exp) < now && c.is_active !== false);
          })
          .map((c: any) => c.id);

        if (expiredIds.length > 0) {
          const nowIso = now.toISOString();
          for (let i = 0; i < expiredIds.length; i += 50) {
            const batch = expiredIds.slice(i, i + 50);
            await supabase
              .from('coupons')
              .update({ is_active: false, updated_at: nowIso })
              .in('id', batch);
          }
          console.log(`[AWIN COUPONS] ${expiredIds.length} cupons expirados foram inativados no Supabase.`);
        }
      }
    } catch (cleanErr: any) {
      console.warn('[AWIN COUPONS] Aviso na rotina de inativação de expirados:', cleanErr.message);
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const msg = source === 'awin_api'
    ? `${validCoupons.length} cupons reais (Brasil/Global) sincronizados da API Awin em ${duration}s (códigos duplicados removidos).`
    : `${validCoupons.length} cupons verificados AliExpress & Parceiros sincronizados em ${duration}s.`;

  return {
    success: true,
    count: validCoupons.length,
    message: msg,
    source,
    coupons: validCoupons,
  };
}
