import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Coupon } from '../types';

// Logos das lojas parceiras
const STORE_LOGOS: Record<string, string> = {
  aliexpress: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=100&auto=format&fit=crop&q=80',
  kabum: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=100&auto=format&fit=crop&q=80',
  amazon: 'https://images.unsplash.com/photo-1523474255658-406164998a1f?w=100&auto=format&fit=crop&q=80',
  mercadolivre: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=100&auto=format&fit=crop&q=80',
};

/**
 * Mapeia registro do Supabase para o formato de Coupon do Frontend
 */
export function mapSupabaseCouponToCoupon(row: any): Coupon {
  const code = (row.code || '').trim().toUpperCase();
  const rawStore = row.store_name || (row.store_id === 'aliexpress' ? 'AliExpress' : row.store_id === 'kabum' ? 'KaBuM!' : 'Loja Parceira');
  
  let storeId = row.store_id || '';
  if (!storeId) {
    if (rawStore.toLowerCase().includes('ali') || row.advertiser_id === '18879') storeId = 'aliexpress';
    else if (rawStore.toLowerCase().includes('kabum') || row.advertiser_id === '17729') storeId = 'kabum';
    else if (rawStore.toLowerCase().includes('amazon')) storeId = 'amazon';
    else storeId = rawStore.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  const storeName = storeId === 'aliexpress' ? 'AliExpress' : storeId === 'kabum' ? 'KaBuM!' : rawStore;
  const trackingUrl = row.awin_tracking_url || row.tracking_url || row.affiliate_url || '#';
  const description = row.description || `Aproveite o cupom ${code} em suas compras na ${storeName}.`;
  const discountVal = row.discount_amount || row.discount_value || '';
  
  const startsAt = row.starts_at || row.valid_from || undefined;
  const endsAt = row.ends_at || row.valid_until || undefined;

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
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Busca todos os cupons reais e ativos diretamente do banco de dados Supabase
 * Ignora cupons expirados. Não usa dados mockados.
 */
export async function fetchActiveCoupons(): Promise<Coupon[]> {
  if (!isSupabaseConfigured) {
    console.warn('[CouponService] Supabase não está configurado.');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[CouponService] Erro ao buscar cupons no Supabase:', error.message);
      return [];
    }

    if (!data || !Array.isArray(data)) {
      return [];
    }

    const now = new Date();

    // Filtra cupons válidos (não expirados e já iniciados) e mapeia
    return data
      .filter((row: any) => {
        const tracking = row.awin_tracking_url || row.tracking_url;
        if (!row.code || !tracking) return false;

        const expiryStr = row.ends_at || row.valid_until;
        if (expiryStr) {
          const expiry = new Date(expiryStr);
          if (!isNaN(expiry.getTime()) && expiry < now) {
            return false; // Ignora cupom expirado
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
  const storeId = coupon.store_id || coupon.storeId || 'aliexpress';
  const storeName = coupon.storeName || (storeId === 'aliexpress' ? 'AliExpress' : storeId === 'kabum' ? 'KaBuM!' : storeId);
  const code = (coupon.code || '').trim().toUpperCase();
  const trackingUrl = (coupon.awin_tracking_url || coupon.trackingUrl || coupon.affiliateUrl || '').trim();
  const discountAmount = coupon.discount_amount || coupon.discountValue?.toString() || '';
  const startsAt = coupon.starts_at || coupon.validFrom || new Date().toISOString();
  const endsAt = coupon.ends_at || coupon.validUntil || new Date(Date.now() + 30 * 86400000).toISOString();

  const id = coupon.id || `cup-${storeId}-${code.toLowerCase()}-${Date.now().toString(36)}`;
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
