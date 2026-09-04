import fs from 'fs';
import path from 'path';
import https from 'https';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

// Injeção global do WebSocket para compatibilidade com Node.js 18+ e Supabase
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = WebSocket;
}

/**
 * Carrega variáveis do arquivo .env localmente
 */
function loadEnvVariables() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnvVariables();

const AWIN_PUBLISHER_ID = process.env.AWIN_PUBLISHER_ID || '3064261';
const AWIN_API_TOKEN = process.env.AWIN_API_TOKEN || '60b6489b-bffc-4f5d-887c-89a76b2ca853';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// URL Oficial da API REST de Promoções (Vouchers/Cupons) da Awin (no singular: /publisher/)
const AWIN_PROMOTIONS_API_URL = `https://api.awin.com/publisher/${AWIN_PUBLISHER_ID}/promotions`;

/**
 * Validação de configurações
 */
if (!SUPABASE_URL || !SUPABASE_KEY || SUPABASE_KEY.includes('placeholder')) {
  console.error('❌ Erro: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar configurados no .env!');
  process.exit(1);
}

if (!AWIN_API_TOKEN || AWIN_API_TOKEN === 'seu_token_aqui') {
  console.error('❌ Erro: AWIN_API_TOKEN precisa ser configurado no .env!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: WebSocket },
});

/**
 * Realiza requisição POST autenticada na API REST de Promoções da Awin
 */
async function fetchAwinPromotionsApi() {
  const requestBody = JSON.stringify({
    filters: {
      advertiserIds: [18879, 17729],
      type: 'voucher',
      status: 'active',
    },
  });

  return new Promise((resolve, reject) => {
    console.log(`📡 [AWIN REST API] Enviando POST para ${AWIN_PROMOTIONS_API_URL}...`);
    console.log(`📦 Payload: ${requestBody}`);

    const req = https.request(AWIN_PROMOTIONS_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AWIN_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'ChaveOfertas/1.0',
        'Content-Length': Buffer.byteLength(requestBody),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (err) {
            reject(new Error(`Erro ao fazer parse do JSON retornado pela Awin: ${err.message}`));
          }
        } else {
          let errorMsg = `Erro HTTP ${res.statusCode} ${res.statusMessage}`;
          try {
            const errObj = JSON.parse(data);
            if (errObj.description) errorMsg += ` - ${errObj.description}`;
            else if (errObj.error) errorMsg += ` - ${errObj.error}`;
          } catch (_) {
            errorMsg += ` - ${data.substring(0, 100)}`;
          }
          reject(new Error(errorMsg));
        }
      });
    });

    req.on('error', reject);
    req.write(requestBody);
    req.end();
  });
}

/**
 * Converte data para formato ISO
 */
function parseDateToIso(dateStr) {
  if (!dateStr) return null;
  try {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  } catch (_) {}
  return null;
}

/**
 * Extrai percentual ou valor de desconto a partir do texto do título
 */
function extractDiscountValue(title, description) {
  const text = `${title || ''} ${description || ''}`;
  const match = text.match(/(\d+%\s*OFF|R\$\s*\d+[\d.,]*\s*OFF|Frete\s*Gr[áa]tis)/i);
  return match ? match[0].toUpperCase() : '';
}

/**
 * Mapeia item do JSON da API da Awin para a tabela coupons
 */
function mapAwinPromotionToCoupon(item) {
  if (!item) return null;

  // Código do cupom (a Awin pode enviar em voucher.code, code ou voucherCode)
  const code = (
    item.voucher?.code || 
    item.code || 
    item.voucherCode || 
    item.couponCode || 
    ''
  ).toString().trim().toUpperCase();

  if (!code) {
    // Se a promoção não tiver código de cupom aplicável, descarta
    return null;
  }

  // Link de Afiliado Rastreável Oficial da Awin (urlTracking contém a tagged URL com publisherId)
  const trackingUrl = (
    item.urlTracking || 
    item.trackingUrl || 
    item.url || 
    item.deeplink || 
    `https://www.awin1.com/cread.php?awinmid=${item.advertiser?.id || '17729'}&awinaffid=${AWIN_PUBLISHER_ID}&ued=${encodeURIComponent(item.url || 'https://www.kabum.com.br')}`
  ).toString().trim();

  // Dados do Anunciante
  const advertiserId = (item.advertiser?.id || item.advertiserId || '18879').toString();
  let storeName = (item.advertiser?.name || item.advertiserName || 'AliExpress').toString().trim();
  let storeId = 'aliexpress';

  if (advertiserId === '17729' || storeName.toLowerCase().includes('kabum')) {
    storeName = 'KaBuM!';
    storeId = 'kabum';
  } else if (advertiserId === '18879' || storeName.toLowerCase().includes('ali')) {
    storeName = 'AliExpress';
    storeId = 'aliexpress';
  }

  // Título e Descrição
  const title = (item.title || `Cupom ${code} na ${storeName}`).toString().trim();
  const description = (item.description || item.title || `Aproveite o cupom ${code} em suas compras na ${storeName}.`).toString().trim();
  const discountValue = item.discount || item.reduction || extractDiscountValue(title, description);

  // Validade e Expiração
  const startsAtIso = parseDateToIso(item.startDate || item.startsAt || item.validFrom);
  const validUntilRaw = item.endDate || item.validUntil || item.expiryDate || item.validTo;
  const validUntilIso = parseDateToIso(validUntilRaw);

  // Filtro de Validade: Ignora cupons vencidos ou que ainda não começaram
  const now = new Date();
  if (startsAtIso && new Date(startsAtIso) > now) {
    return null;
  }
  if (validUntilIso && new Date(validUntilIso) < now) {
    return null; // Cupom expirado
  }

  // ID único consistente
  const rawId = item.promotionId || item.id || item.voucherId;
  const id = rawId ? `awin-cup-${rawId}` : `awin-cup-${storeId}-${code.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  return {
    id,
    store_id: storeId,
    store_name: storeName,
    code,
    description,
    discount_amount: discountValue,
    discount_value: discountValue,
    starts_at: startsAtIso,
    ends_at: validUntilIso,
    valid_until: validUntilIso,
    awin_tracking_url: trackingUrl,
    tracking_url: trackingUrl,
    advertiser_id: advertiserId,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Executa a sincronização via API REST POST da Awin
 */
async function runRestCouponSync() {
  const startTime = Date.now();
  console.log('================================================================');
  console.log('🚀 [AWIN REST SYNC] Sincronização Oficial de Cupons (POST)');
  console.log('================================================================');
  console.log(`🔑 Publisher ID: ${AWIN_PUBLISHER_ID}`);
  console.log(`📡 Endpoint: ${AWIN_PROMOTIONS_API_URL}`);

  try {
    const apiResponse = await fetchAwinPromotionsApi();

    // Extrai a lista de cupons da resposta (geralmente em apiResponse.data)
    let items = [];
    if (Array.isArray(apiResponse.data)) {
      items = apiResponse.data;
    } else if (Array.isArray(apiResponse)) {
      items = apiResponse;
    } else if (Array.isArray(apiResponse.promotions)) {
      items = apiResponse.promotions;
    }

    console.log(`📦 Promoções brutas recebidas da Awin: ${items.length}`);

    if (items.length === 0) {
      console.log('ℹ️ Nenhuma promoção ativa retornada no momento pela Awin.');
      return;
    }

    let validCoupons = [];
    let expiredOrNoCode = 0;

    for (const item of items) {
      const coupon = mapAwinPromotionToCoupon(item);
      if (coupon) {
        validCoupons.push(coupon);
      } else {
        expiredOrNoCode++;
      }
    }

    console.log(`🔍 Cupons válidos com código: ${validCoupons.length} (Sem código ou expirados: ${expiredOrNoCode})`);

    if (validCoupons.length > 0) {
      const { error: upsertError } = await supabase
        .from('coupons')
        .upsert(validCoupons, { onConflict: 'id', ignoreDuplicates: false });

      if (upsertError) {
        console.warn(`⚠️ Tentando upsert com compatibilidade legada: ${upsertError.message}`);
        const legacyList = validCoupons.map(c => ({
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

        const { error: legacyErr } = await supabase
          .from('coupons')
          .upsert(legacyList, { onConflict: 'id', ignoreDuplicates: false });

        if (legacyErr) {
          throw new Error(`Erro ao gravar cupons no Supabase: ${legacyErr.message}`);
        }
      }

      // Limpeza / Inativação de cupons expirados
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
      } catch (_) {}

      console.log(`💾 Sucesso: ${validCoupons.length} cupons reais gravados/atualizados no Supabase!`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('================================================================');
    console.log(`🎉 [SINCRONIZAÇÃO DE CUPONS CONCLUÍDA] Tempo total: ${duration}s`);
    console.log(`💾 Total de cupons ativos no banco: ${validCoupons.length}`);
    console.log('================================================================');
  } catch (err) {
    console.error(`❌ [FALHA NA SINCRONIZAÇÃO AWIN REST]: ${err.message}`);
    process.exit(1);
  }
}

runRestCouponSync()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Falha fatal:', err.message);
    process.exit(1);
  });
