import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { syncAliExpressFromAwinApi } from '../../lib/affiliate/awinApiSync';

// Injeção global do WebSocket para compatibilidade com Node.js 18+
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = WebSocket as any;
}

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-cron-secret, x-cron-token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Verificação de Segurança via CRON_SECRET_TOKEN / CRON_SECRET / Admin Token
  const expectedToken = process.env.CRON_SECRET_TOKEN || process.env.CRON_SECRET || 'ChaveOfertas_Cron_2026_!@#';
  const isManualAdmin = req.body?.isManual === true || req.query?.manual === 'true';

  if (!isManualAdmin && expectedToken) {
    const authHeader = req.headers.authorization || req.headers.Authorization || '';
    const headerSecret = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7).trim()
      : authHeader.trim();

    const customHeaderSecret = (req.headers['x-cron-token'] || req.headers['x-cron-secret'] || '').toString().trim();
    const querySecret = (req.query?.token || req.query?.secret || '').toString().trim();

    const providedSecret = headerSecret || customHeaderSecret || querySecret;

    if (!providedSecret || (providedSecret !== expectedToken && providedSecret !== process.env.CRON_SECRET)) {
      console.warn('[ALIEXPRESS CRON] Tentativa não autorizada de disparo da sincronização AliExpress');
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: CRON_SECRET_TOKEN ausente ou inválido.',
      });
    }
  }

  // 2. Inicialização do Cliente Supabase com permissões de Admin
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

  const supabase = supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        realtime: { transport: WebSocket },
      })
    : null;

  console.log(`⏰ [ALIEXPRESS CRON SYNC] Sincronização disparada em ${new Date().toISOString()}`);

  try {
    const result = await syncAliExpressFromAwinApi(supabase);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: any) {
    console.error(`❌ [ALIEXPRESS CRON SYNC] Erro ao sincronizar:`, err.message);
    return res.status(500).json({
      success: false,
      error: err.message || 'Erro interno ao sincronizar ofertas AliExpress.',
    });
  }
}
