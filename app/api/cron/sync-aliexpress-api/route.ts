import { createClient } from '@supabase/supabase-js';
import { syncAliExpressFromAwinApi } from '../../../../lib/affiliate/awinApiSync';

export const dynamic = 'force-dynamic';

async function handleSync(request: Request) {
  // 1. Verificação de Segurança via CRON_SECRET_TOKEN
  const expectedToken = process.env.CRON_SECRET_TOKEN || process.env.CRON_SECRET || 'ChaveOfertas_Cron_2026_!@#';

  const authHeader = request.headers.get('authorization') || '';
  const headerSecret = authHeader.startsWith('Bearer ')
    ? authHeader.substring(7).trim()
    : authHeader.trim();

  const customHeaderSecret = (request.headers.get('x-cron-token') || request.headers.get('x-cron-secret') || '').trim();
  const url = new URL(request.url);
  const querySecret = (url.searchParams.get('token') || url.searchParams.get('secret') || '').trim();
  const isManual = url.searchParams.get('manual') === 'true';

  const providedSecret = headerSecret || customHeaderSecret || querySecret;

  if (!isManual && expectedToken && providedSecret !== expectedToken && providedSecret !== process.env.CRON_SECRET) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Unauthorized: CRON_SECRET_TOKEN ausente ou inválido.',
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. Cliente Supabase
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

  const supabase = supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

  try {
    const result = await syncAliExpressFromAwinApi(supabase);
    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message || 'Erro ao sincronizar produtos da AliExpress.',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function GET(request: Request) {
  return handleSync(request);
}

export async function POST(request: Request) {
  return handleSync(request);
}
