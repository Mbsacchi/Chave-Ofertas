import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { waitUntil } from '@vercel/functions';
import { processAwinStreamSync } from '../awin-sync';

// Injeção global do WebSocket para compatibilidade com Node.js 18+
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = WebSocket as any;
}

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-cron-secret');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Proteção de Segurança via Bearer Token / CRON_SECRET
  const expectedCronSecret = process.env.CRON_SECRET;
  
  if (expectedCronSecret) {
    const authHeader = req.headers.authorization || req.headers.Authorization || '';
    const headerSecret = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7).trim()
      : authHeader.trim();

    const customHeaderSecret = (req.headers['x-cron-secret'] || '').toString().trim();
    const querySecret = (req.query?.secret || '').toString().trim();

    const providedSecret = headerSecret || customHeaderSecret || querySecret;

    if (!providedSecret || providedSecret !== expectedCronSecret) {
      console.warn('[VERCEL CRON] Tentativa de acesso não autorizada à rota de cron /api/cron/sync-awin');
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: CRON_SECRET ausente ou inválido.',
      });
    }
  }

  // 2. Inicialização do Cliente Supabase com permissões de Admin (Service Role)
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

  const isSupabaseReady = Boolean(supabaseUrl && serviceRoleKey && !serviceRoleKey.includes('placeholder'));
  const supabase = isSupabaseReady
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        realtime: { transport: WebSocket },
      })
    : null;

  console.log(`⏰ [VERCEL CRON SYNC] Cron Job disparado com sucesso em ${new Date().toISOString()}`);

  // 3. Dispara a sincronização de stream completa (16.000+ produtos) em background
  const cronTaskPromise = processAwinStreamSync(supabase, 0).then((result) => {
    console.log(`✅ [VERCEL CRON SYNC] Sincronização diária concluída:`, result);
  }).catch((err) => {
    console.error(`❌ [VERCEL CRON SYNC] Erro na sincronização diária:`, err.message);
  });

  // 4. Registra no runtime da Vercel para não matar o processo após a resposta HTTP
  try {
    waitUntil(cronTaskPromise);
  } catch (wErr: any) {
    console.log('[VERCEL CRON SYNC] Executando em background via Node Event Loop');
  }

  // 5. Retorno rápido de sucesso HTTP 200 para a Vercel
  return res.status(200).json({
    success: true,
    status: 'processing',
    message: 'Cron job diário de sincronização Awin iniciado com sucesso em segundo plano! O catálogo completo de 16.000+ produtos está sendo processado via stream.',
    timestamp: new Date().toISOString(),
    isBackground: true,
  });
}
