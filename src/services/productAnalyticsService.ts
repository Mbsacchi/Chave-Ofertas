import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { PriceHistoryPoint } from '../types';

/**
 * Registra e incrementa atomicamente o contador de cliques/popularidade de um produto.
 * Invocado sempre que um usuário clica no botão de redirecionamento para loja parceira.
 */
export async function incrementProductClick(productId: string): Promise<void> {
  if (!productId) return;

  // 1. Incremento direto no Supabase via RPC (ou fallback de update)
  if (isSupabaseConfigured) {
    try {
      const { error: rpcError } = await supabase.rpc('increment_product_clicks', {
        target_product_id: productId,
      });

      if (rpcError) {
        const { data } = await supabase
          .from('products')
          .select('click_count')
          .eq('id', productId)
          .single();

        const currentCount = Number(data?.click_count) || 0;
        await supabase
          .from('products')
          .update({ click_count: currentCount + 1 })
          .eq('id', productId);
      }
    } catch (err: any) {
      console.warn('[Analytics] Erro ao incrementar clique do produto via Supabase:', err.message);
    }
  }

  // 2. Beacon assíncrono para a rota de API serverless /api/click com keepalive
  try {
    if (typeof window !== 'undefined') {
      const payload = JSON.stringify({ productId });
      if (navigator?.sendBeacon) {
        navigator.sendBeacon('/api/click', new Blob([payload], { type: 'application/json' }));
      } else {
        fetch('/api/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    }
  } catch (_) {}
}

/**
 * Busca o histórico cronológico de preços de um produto a partir da tabela `price_history`
 */
export async function fetchProductPriceHistory(
  productId: string,
  fallbackHistory: PriceHistoryPoint[] = []
): Promise<PriceHistoryPoint[]> {
  if (!productId || !isSupabaseConfigured) {
    return fallbackHistory;
  }

  try {
    const { data, error } = await supabase
      .from('price_history')
      .select('price, recorded_at')
      .eq('product_id', productId)
      .order('recorded_at', { ascending: true });

    if (!error && data && data.length > 0) {
      return data.map((row: any) => {
        const dateObj = new Date(row.recorded_at);
        const day = dateObj.getDate().toString().padStart(2, '0');
        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        return {
          date: `${day}/${month}`,
          timestamp: dateObj.getTime(),
          minPrice: Number(row.price),
        };
      });
    }
  } catch (err: any) {
    console.warn('[Analytics] Erro ao buscar histórico de preços:', err.message);
  }

  return fallbackHistory;
}
