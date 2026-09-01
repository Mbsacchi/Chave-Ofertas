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

// URL Oficial da API REST da Awin para Promoções e Vouchers
const AWIN_PROMOTIONS_API_URL = 
  process.env.AWIN_PROMOTIONS_API_URL || 
  `https://api.awin.com/publishers/${AWIN_PUBLISHER_ID}/promotions?advertiserIds=17729&status=active`;

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
 * Realiza requisição autenticada na API REST da Awin
 */
async function fetchAwinPromotionsApi(url) {
  return new Promise((resolve, reject) => {
    console.log(`📡 [AWIN REST API] Conectando a ${url}...`);
    
    const req = https.get(url, {
      headers: {
        'Authorization': `Bearer ${AWIN_API_TOKEN}`,
        'Accept': 'application/json',
        'User-Agent': 'ChaveOfertas/1.0',
      }
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
 * Mapeia item do JSON da API da Awin para a tabela coupons
 */
function mapAwinPromotionToCoupon(item) {
  if (!item) return null;

  // Código do cupom
  const code = (item.voucherCode || item.code || item.voucher?.code || item.couponCode || '').toString().trim().toUpperCase();
  if (!code) {
    // Se não tiver código de cupom, desconsidera
    return null;
  }

  // Link de Afiliado (Deeplink rastreável da Awin)
  const trackingUrl = (
    item.url || 
    item.deeplink || 
    item.trackingUrl || 
    item.clickThroughUrl || 
    item.advertiser?.clickThroughUrl || 
    `https://www.awin1.com/awclick.php?mid=${item.advertiserId || item.advertiser?.id || '17729'}&id=${AWIN_PUBLISHER_ID}`
  ).toString().trim();

  // Dados do Anunciante
  const advertiserId = (item.advertiserId || item.advertiser?.id || '17729').toString();
  const storeName = (item.advertiserName || item.advertiser?.name || 'KaBuM!').toString().trim();

  // Descrição / Termos
  const description = (
    item.description || 
    item.title || 
    item.terms || 
    `Cupom de desconto ${code} válido para compras na ${storeName}.`
  ).toString().trim();

  // Desconto
  const discountValue = (item.discount || item.reduction || item.discountValue || '').toString().trim();

  // Validade e Expiração
  const validUntilRaw = item.endDate || item.validUntil || item.expiryDate || item.validTo;
  const validUntilIso = parseDateToIso(validUntilRaw);

  // Filtro de Validade: Ignora cupons vencidos
  if (validUntilIso) {
    const expiryDate = new Date(validUntilIso);
    if (expiryDate < new Date()) {
      return null; // Vencido
    }
  }

  // ID único consistente
  const rawId = item.id || item.promotionId || item.voucherId;
  const id = rawId ? `awin-cup-${rawId}` : `awin-cup-${advertiserId}-${code.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  return {
    id,
    advertiser_id: advertiserId,
    store_name: storeName,
    code,
    description,
    tracking_url: trackingUrl,
    valid_until: validUntilIso,
    discount_value: discountValue,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Executa a sincronização via API REST da Awin
 */
async function runRestCouponSync() {
  const startTime = Date.now();
  console.log('================================================================');
  console.log('🚀 [AWIN REST SYNC] Sincronização Oficial de Cupons via API REST');
  console.log('================================================================');
  console.log(`🔑 Publisher ID: ${AWIN_PUBLISHER_ID}`);
  console.log(`📡 Endpoint: ${AWIN_PROMOTIONS_API_URL}`);

  try {
    const apiResponse = await fetchAwinPromotionsApi(AWIN_PROMOTIONS_API_URL);

    // Identifica o array de promoções retornado pela Awin
    let items = [];
    if (Array.isArray(apiResponse)) {
      items = apiResponse;
    } else if (apiResponse && Array.isArray(apiResponse.data)) {
      items = apiResponse.data;
    } else if (apiResponse && Array.isArray(apiResponse.promotions)) {
      items = apiResponse.promotions;
    } else if (apiResponse && typeof apiResponse === 'object') {
      items = Object.values(apiResponse).filter((v) => typeof v === 'object');
    }

    console.log(`📦 Itens brutos recebidos da API da Awin: ${items.length}`);

    if (items.length === 0) {
      console.log('ℹ️ Nenhuma promoção/cupom ativa retornada no momento pela API da Awin.');
      return;
    }

    let validCoupons = [];
    let expiredCount = 0;

    for (const item of items) {
      const coupon = mapAwinPromotionToCoupon(item);
      if (coupon) {
        validCoupons.push(coupon);
      } else {
        expiredCount++;
      }
    }

    console.log(`🔍 Cupons válidos mapeados: ${validCoupons.length} (Expirados/Sem código ignorados: ${expiredCount})`);

    if (validCoupons.length > 0) {
      const { error } = await supabase
        .from('coupons')
        .upsert(validCoupons, { onConflict: 'id', ignoreDuplicates: false });

      if (error) {
        throw new Error(`Erro ao gravar cupons no Supabase: ${error.message}`);
      }

      console.log(`💾 Sucesso: ${validCoupons.length} cupons reais gravados/atualizados no Supabase!`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('================================================================');
    console.log(`🎉 [CONCLUÍDO COM SUCESSO] Tempo total: ${duration}s`);
    console.log(`💾 Cupons atualizados no Supabase: ${validCoupons.length}`);
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
