import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  // Configuração de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const productId = req.body?.productId || req.query?.productId;

  if (!productId) {
    return res.status(400).json({ error: 'productId é obrigatório' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(200).json({ success: true, message: 'Supabase não configurado no ambiente' });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Incremento atômico via RPC
    const { error: rpcError } = await supabase.rpc('increment_product_clicks', {
      target_product_id: productId,
    });

    if (rpcError) {
      // Fallback: incremento via update
      const { data } = await supabase
        .from('products')
        .select('click_count')
        .eq('id', productId)
        .single();

      const current = Number(data?.click_count) || 0;
      await supabase
        .from('products')
        .update({ click_count: current + 1 })
        .eq('id', productId);
    }

    return res.status(200).json({ success: true, productId });
  } catch (err: any) {
    console.error('Erro na rota /api/click:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
