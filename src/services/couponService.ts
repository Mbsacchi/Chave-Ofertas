import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Coupon } from '../types';

// Logos das lojas parceiras
const STORE_LOGOS: Record<string, string> = {
  aliexpress: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=100&auto=format&fit=crop&q=80',
  kabum: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=100&auto=format&fit=crop&q=80',
  amazon: 'https://images.unsplash.com/photo-1523474255658-406164998a1f?w=100&auto=format&fit=crop&q=80',
  mercadolivre: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=100&auto=format&fit=crop&q=80',
  shopee: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=100&auto=format&fit=crop&q=80',
  magalu: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=100&auto=format&fit=crop&q=80',
};

export const STORE_CANONICAL_NAMES: Record<string, string> = {
  aliexpress: 'AliExpress',
  kabum: 'KaBuM!',
  amazon: 'Amazon',
  mercadolivre: 'Mercado Livre',
  shopee: 'Shopee',
  magalu: 'Magazine Luiza',
};

/**
 * Mapeia registro do Supabase para o formato de Coupon do Frontend
 */
export function mapSupabaseCouponToCoupon(row: any): Coupon {
  const code = (row.code || '').trim().toUpperCase();
  const rawStore = row.store_name || (row.store_id === 'aliexpress' ? 'AliExpress' : row.store_id === 'kabum' ? 'KaBuM!' : 'Loja Parceira');
  
  let storeId = (row.store_id || '').toLowerCase();
  if (!storeId) {
    if (rawStore.toLowerCase().includes('ali') || row.advertiser_id === '18879') storeId = 'aliexpress';
    else if (rawStore.toLowerCase().includes('kabum') || row.advertiser_id === '17729') storeId = 'kabum';
    else if (rawStore.toLowerCase().includes('amazon')) storeId = 'amazon';
    else if (rawStore.toLowerCase().includes('mercado') || rawStore.toLowerCase().includes('livre')) storeId = 'mercadolivre';
    else if (rawStore.toLowerCase().includes('shopee')) storeId = 'shopee';
    else if (rawStore.toLowerCase().includes('magalu') || rawStore.toLowerCase().includes('magazine')) storeId = 'magalu';
    else storeId = rawStore.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  const storeName = STORE_CANONICAL_NAMES[storeId] || row.store_name || rawStore;
  const trackingUrl = row.awin_tracking_url || row.tracking_url || row.affiliate_url || '#';
  const description = row.description || `Aproveite o cupom ${code} em suas compras na ${storeName}.`;
  const discountVal = row.discount_amount || row.discount_value || '';
  
  const startsAt = row.starts_at || row.valid_from || undefined;
  const endsAt = row.ends_at || row.valid_until || undefined;

  // Determinação precisa da origem (Origem: Automação API vs Adicionado Manualmente)
  const isManual = row.source === 'manual' || 
                   (row.id && (row.id.startsWith('manual-') || row.id.startsWith('cup-manual-'))) ||
                   (row.id && !row.id.startsWith('awin-'));
  const source: 'api' | 'manual' = row.source ? (row.source as any) : (isManual ? 'manual' : 'api');

  return {
    id: row.id,
    storeId,
    store_id: storeId,
    storeName,
    store_name: storeName,
    advertiserId: row.advertiser_id || '',
    advertiser_id: row.advertiser_id || '',
    code,
    description,
    discount_amount: discountVal,
    starts_at: startsAt,
    ends_at: endsAt,
    validUntil: endsAt,
    validFrom: startsAt,
    awin_tracking_url: trackingUrl,
    trackingUrl,
    affiliateUrl: trackingUrl,
    tracking_url: trackingUrl,
    title: row.title || `${discountVal ? discountVal + ' - ' : ''}${storeName}`,
    storeLogo: STORE_LOGOS[storeId] || undefined,
    discountType: 'percentage',
    discountValue: typeof discountVal === 'number' ? discountVal : 0,
    minPurchase: 0,
    isActive: row.is_active !== false,
    is_active: row.is_active !== false,
    isExclusive: true,
    isVerified: true,
    usageCount: 150 + (parseInt(row.id?.replace(/\D/g, '').slice(-2) || '10', 10) * 8),
    successRate: 98,
    verifiedAt: 'Hoje',
    source,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Busca todos os cupons reais e ativos diretamente do banco de dados Supabase
 * Aplica cláusula de filtro na consulta ao Supabase (ends_at >= now() ou ends_at is null)
 * garantindo que cupons vencidos NUNCA sejam carregados ou renderizados na vitrine.
 */
export async function fetchActiveCoupons(): Promise<Coupon[]> {
  if (!isSupabaseConfigured) {
    console.warn('[CouponService] Supabase não está configurado.');
    return [];
  }

  try {
    const now = new Date();
    const nowIso = now.toISOString();

    // Consulta ao Supabase com filtro de cupons válidos (ends_at >= agora OU ends_at nulo)
    let query = supabase
      .from('coupons')
      .select('*')
      .eq('is_active', true)
      .or(`ends_at.gte.${nowIso},ends_at.is.null`)
      .order('created_at', { ascending: false });

    let { data, error } = await query;

    // Fallback de retrocompatibilidade caso a coluna ends_at não suporte .or() diretamente
    if (error) {
      console.warn('[CouponService] Tentando fallback para consulta de cupons ativos:', error.message);
      const fallbackRes = await supabase
        .from('coupons')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      data = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (error) {
      console.warn('[CouponService] Erro ao buscar cupons no Supabase:', error.message);
      return [];
    }

    if (!data || !Array.isArray(data)) {
      return [];
    }

    // Filtro adicional de segurança: garante que cupons vencidos NUNCA cheguem à vitrine
    return data
      .filter((row: any) => {
        const tracking = row.awin_tracking_url || row.tracking_url;
        if (!row.code || !tracking) return false;

        const expiryStr = row.ends_at || row.valid_until;
        if (expiryStr) {
          const expiry = new Date(expiryStr);
          if (!isNaN(expiry.getTime()) && expiry < now) {
            return false; // Ignora terminantemente cupom expirado
          }
        }

        const startStr = row.starts_at || row.valid_from;
        if (startStr) {
          const start = new Date(startStr);
          if (!isNaN(start.getTime()) && start > now) {
            return false; // Ainda não começou
          }
        }

        return true;
      })
      .map(mapSupabaseCouponToCoupon);
  } catch (err: any) {
    console.error('[CouponService] Exceção ao buscar cupons:', err.message);
    return [];
  }
}

/**
 * Busca todos os cupons no Supabase para o painel de administração (ativos e inativos)
 */
export async function fetchAllAdminCoupons(): Promise<Coupon[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[CouponService] Erro ao buscar todos os cupons para admin:', error.message);
      return [];
    }

    return (data || []).map(mapSupabaseCouponToCoupon);
  } catch (err: any) {
    console.error('[CouponService] Exceção ao buscar cupons admin:', err.message);
    return [];
  }
}

/**
 * Salva ou atualiza um cupom no Supabase (Upsert)
 */
export async function saveAdminCoupon(coupon: Partial<Coupon>): Promise<Coupon> {
  const storeId = (coupon.store_id || coupon.storeId || 'mercadolivre').toLowerCase();
  const storeName = STORE_CANONICAL_NAMES[storeId] || coupon.storeName || (storeId === 'aliexpress' ? 'AliExpress' : storeId === 'kabum' ? 'KaBuM!' : storeId);
  const code = (coupon.code || '').trim().toUpperCase();
  const DEFAULT_STORE_URLS: Record<string, string> = {
    aliexpress: 'https://best.aliexpress.com',
    kabum: 'https://www.kabum.com.br',
    amazon: 'https://www.amazon.com.br',
    mercadolivre: 'https://www.mercadolivre.com.br',
    shopee: 'https://shopee.com.br',
    magalu: 'https://www.magazineluiza.com.br',
  };

  const rawUrl = (coupon.awin_tracking_url || coupon.trackingUrl || coupon.affiliateUrl || '').trim();
  const trackingUrl = rawUrl || DEFAULT_STORE_URLS[storeId] || 'https://chaveofertas.com';
  const discountAmount = coupon.discount_amount || coupon.discountValue?.toString() || '';
  const startsAt = coupon.starts_at || coupon.validFrom || new Date().toISOString();
  const endsAt = coupon.ends_at || coupon.validUntil || new Date(Date.now() + 30 * 86400000).toISOString();

  const source = coupon.source || (coupon.id && coupon.id.startsWith('awin-') ? 'api' : 'manual');
  const id = coupon.id || `manual-cup-${storeId}-${code.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString(36)}`;
  const nowIso = new Date().toISOString();

  const fullRecord = {
    id,
    store_id: storeId,
    store_name: storeName,
    code,
    description: coupon.description || `Cupom ${code} com desconto exclusivo na ${storeName}.`,
    discount_amount: discountAmount,
    discount_value: discountAmount,
    starts_at: startsAt,
    ends_at: endsAt,
    valid_until: endsAt,
    awin_tracking_url: trackingUrl,
    tracking_url: trackingUrl,
    advertiser_id: coupon.advertiserId || coupon.advertiser_id || (storeId === 'aliexpress' ? '18879' : storeId === 'kabum' ? '17729' : ''),
    source,
    is_active: coupon.isActive !== false && coupon.is_active !== false,
    created_at: coupon.created_at || nowIso,
    updated_at: nowIso,
  };

  // Tenta salvar com o novo schema
  const { data, error } = await supabase
    .from('coupons')
    .upsert([fullRecord], { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.warn('[CouponService] Falha com schema novo, tentando legada:', error.message);
    // Fallback legado caso as novas colunas não existam no banco do usuário
    const legacyRecord = {
      id,
      store_name: storeName,
      code,
      description: fullRecord.description,
      discount_value: discountAmount,
      valid_until: endsAt,
      tracking_url: trackingUrl,
      advertiser_id: fullRecord.advertiser_id,
      source,
      is_active: fullRecord.is_active,
      created_at: fullRecord.created_at,
      updated_at: nowIso,
    };

    const { data: legData, error: legErr } = await supabase
      .from('coupons')
      .upsert([legacyRecord], { onConflict: 'id' })
      .select()
      .single();

    if (legErr) throw new Error(legErr.message);
    return mapSupabaseCouponToCoupon(legData || legacyRecord);
  }

  return mapSupabaseCouponToCoupon(data || fullRecord);
}

/**
 * Exclui um cupom do Supabase
 */
export async function deleteAdminCoupon(id: string): Promise<void> {
  const { error } = await supabase
    .from('coupons')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Erro ao excluir cupom: ${error.message}`);
  }
}

/**
 * Alterna o status ativo/inativo de um cupom
 */
export async function toggleCouponActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('coupons')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    throw new Error(`Erro ao alternar status do cupom: ${error.message}`);
  }
}

/**
 * Exclui permanentemente do Supabase todos os cupons cuja validade já expirou
 * Retorna a quantidade de cupons excluídos com sucesso.
 */
export async function deleteExpiredCoupons(): Promise<{ count: number }> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase não está configurado.');
  }

  const now = new Date();

  // 1. Busca todos os cupons para identificar os registros com ends_at ou valid_until expirado
  const { data: coupons, error: fetchErr } = await supabase
    .from('coupons')
    .select('id, ends_at, valid_until');

  if (fetchErr) {
    throw new Error(`Erro ao verificar cupons expirados: ${fetchErr.message}`);
  }

  if (!coupons || coupons.length === 0) {
    return { count: 0 };
  }

  const expiredIds = coupons
    .filter((c: any) => {
      const expStr = c.ends_at || c.valid_until;
      if (!expStr) return false;
      const expDate = new Date(expStr);
      return !isNaN(expDate.getTime()) && expDate < now;
    })
    .map((c: any) => c.id);

  if (expiredIds.length === 0) {
    return { count: 0 };
  }

  // 2. Executa a exclusão de todos os IDs vencidos
  const { error: delErr } = await supabase
    .from('coupons')
    .delete()
    .in('id', expiredIds);

  if (delErr) {
    throw new Error(`Erro ao excluir cupons expirados: ${delErr.message}`);
  }

  return { count: expiredIds.length };
}
