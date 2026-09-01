import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import zlib from 'zlib';
import csv from 'csv-parser';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

// Injeção global do WebSocket para compatibilidade com Node.js 18+ e Supabase
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = WebSocket;
}

/**
 * Carrega variáveis do arquivo .env manualmente (para suporte ESM nativo)
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

const AWIN_COUPON_FEED_URL = process.env.AWIN_COUPON_FEED_URL;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const BATCH_SIZE = 250;

/**
 * Validação de credenciais e URL
 */
if (!SUPABASE_URL || !SUPABASE_KEY || SUPABASE_KEY.includes('placeholder')) {
  console.error('❌ Erro: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar configurados no .env!');
  process.exit(1);
}

if (!AWIN_COUPON_FEED_URL || AWIN_COUPON_FEED_URL === 'sua_url_de_feed_de_cupons_aqui') {
  console.log('⚠️ AVISO: AWIN_COUPON_FEED_URL não definida ou com placeholder no .env.');
  console.log('ℹ️ Para sincronizar cupons, adicione no seu .env:');
  console.log('   AWIN_COUPON_FEED_URL="https://ui.awin.com/export-promotions/..."');
  console.log('');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: WebSocket },
});

/**
 * Extrai valor limpo de campo de diferentes variações de nomes de colunas do CSV da Awin
 */
function getFieldValue(row, possibleNames) {
  const rowKeys = Object.keys(row);
  for (const name of possibleNames) {
    const directVal = row[name];
    if (directVal !== undefined && directVal !== null && directVal !== '') {
      return directVal.toString().trim();
    }
    // Busca case-insensitive
    const matchedKey = rowKeys.find((k) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === name.toLowerCase().replace(/[^a-z0-9]/g, ''));
    if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null && row[matchedKey] !== '') {
      return row[matchedKey].toString().trim();
    }
  }
  return '';
}

/**
 * Converte strings de data de múltiplos formatos para ISO string
 */
function parseDateToIso(dateStr) {
  if (!dateStr) return null;
  try {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  } catch (e) {
    // Ignora formato inválido
  }
  return null;
}

/**
 * Mapeia uma linha do CSV do feed de Vouchers da Awin para a tabela coupons
 */
function mapRowToCoupon(row) {
  // 1. Identificador do cupom/promoção
  const rawId = getFieldValue(row, ['Promotion ID', 'promotion_id', 'Voucher ID', 'voucher_id', 'id', 'Id', 'VoucherCodeId']);
  const code = getFieldValue(row, ['Code', 'code', 'Voucher Code', 'voucher_code', 'Coupon Code', 'coupon_code']).toUpperCase();
  
  if (!code) {
    // Sem código de cupom, descarta
    return null;
  }

  // 2. Anunciante / Loja Parceira
  const advertiserId = getFieldValue(row, ['Advertiser ID', 'advertiser_id', 'Merchant ID', 'merchant_id', 'MerchantId', 'advertiserId']);
  let storeName = getFieldValue(row, ['Advertiser', 'advertiser', 'Merchant Name', 'merchant_name', 'Merchant', 'Store Name', 'store_name']);
  if (!storeName) {
    storeName = 'Loja Parceira';
  }

  // 3. Link de Afiliado Rastreável (Tracking URL)
  const trackingUrl = getFieldValue(row, ['Tracking URL', 'tracking_url', 'Click-Through URL', 'ClickThroughURL', 'url', 'aw_deep_link', 'Deep Link', 'URL']);
  if (!trackingUrl) {
    return null;
  }

  // 4. Descrição e Título
  const description = getFieldValue(row, ['Description', 'description', 'Details', 'Terms', 'Title', 'title']) || `Cupom de desconto para compras na loja ${storeName}.`;
  const discountValue = getFieldValue(row, ['Discount', 'discount', 'Reduction', 'discount_value', 'Amount', 'Percentage']);

  // 5. Data de Validade e Expiração
  const validUntilRaw = getFieldValue(row, ['End Date', 'end_date', 'Valid To', 'valid_to', 'Expiry Date', 'expiry_date', 'valid_until']);
  const validUntilIso = parseDateToIso(validUntilRaw);

  // Filtro de Cupom Vencido: Se tiver data de expiração e já expirou, ignora
  if (validUntilIso) {
    const expiryDate = new Date(validUntilIso);
    if (expiryDate < new Date()) {
      return null; // Cupom expirado, não salva
    }
  }

  // Gerador de ID único consistente
  const id = rawId ? `awin-cup-${rawId}` : `awin-cup-${advertiserId || 'gen'}-${code.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  return {
    id,
    advertiser_id: advertiserId || null,
    store_name: storeName,
    code,
    description,
    tracking_url: trackingUrl,
    valid_until: validUntilIso,
    discount_value: discountValue || '',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Função principal do Worker de Cupons Awin
 */
async function runCouponWorker() {
  if (!AWIN_COUPON_FEED_URL || AWIN_COUPON_FEED_URL.startsWith('sua_url')) {
    console.log('🛑 Sincronização cancelada: AWIN_COUPON_FEED_URL não configurada no .env');
    return;
  }

  const startTime = Date.now();
  console.log('================================================================');
  console.log('🚀 [AWIN COUPONS SYNC] Iniciando Importação de Cupons da Awin');
  console.log('================================================================');
  console.log(`📡 URL do Feed: ${AWIN_COUPON_FEED_URL.substring(0, 80)}...`);

  let totalProcessed = 0;
  let totalSaved = 0;
  let expiredSkipped = 0;
  let batch = [];
  let batchNumber = 0;

  const protocol = AWIN_COUPON_FEED_URL.startsWith('https') ? https : http;

  const response = await new Promise((resolve, reject) => {
    protocol.get(AWIN_COUPON_FEED_URL, resolve).on('error', reject);
  });

  if (response.statusCode !== 200) {
    throw new Error(`Erro HTTP Awin: ${response.statusCode} ${response.statusMessage}`);
  }

  const isGzip = AWIN_COUPON_FEED_URL.includes('compression/gzip') || response.headers['content-encoding'] === 'gzip';
  const stream = isGzip ? response.pipe(zlib.createGunzip()) : response;
  const parser = csv({ separator: ',' });

  stream.pipe(parser);

  for await (const row of parser) {
    totalProcessed++;
    const coupon = mapRowToCoupon(row);
    if (!coupon) {
      expiredSkipped++;
      continue;
    }

    batch.push(coupon);

    if (batch.length >= BATCH_SIZE) {
      batchNumber++;
      const currentBatch = [...batch];
      batch = [];

      try {
        const { error } = await supabase
          .from('coupons')
          .upsert(currentBatch, { onConflict: 'id', ignoreDuplicates: false });

        if (error) {
          console.error(`❌ [Lote #${batchNumber}] Erro Supabase:`, error.message);
        } else {
          totalSaved += currentBatch.length;
          console.log(`✅ [Lote #${batchNumber}] ${currentBatch.length} cupons salvos/atualizados no Supabase. Total: ${totalSaved}`);
        }
      } catch (err) {
        console.error(`❌ [Lote #${batchNumber}] Exceção no upsert:`, err.message);
      }
    }
  }

  // Lote final restante
  if (batch.length > 0) {
    batchNumber++;
    try {
      const { error } = await supabase
        .from('coupons')
        .upsert(batch, { onConflict: 'id', ignoreDuplicates: false });

      if (error) {
        console.error(`❌ [Lote Final] Erro Supabase:`, error.message);
      } else {
        totalSaved += batch.length;
        console.log(`✅ [Lote Final #${batchNumber}] ${batch.length} cupons salvos no Supabase. Total: ${totalSaved}`);
      }
    } catch (err) {
      console.error(`❌ [Lote Final] Exceção:`, err.message);
    }
    batch = [];
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('================================================================');
  console.log(`🎉 [IMPORTAÇÃO DE CUPONS CONCLUÍDA] Tempo: ${duration}s`);
  console.log(`📊 Total de linhas lidas: ${totalProcessed}`);
  console.log(`⏳ Cupons vencidos/inválidos ignorados: ${expiredSkipped}`);
  console.log(`💾 Cupons reais ativos gravados no Supabase: ${totalSaved}`);
  console.log('================================================================');
}

runCouponWorker()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Falha fatal no Worker de Cupons Awin:', err);
    process.exit(1);
  });
