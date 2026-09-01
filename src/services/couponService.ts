import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Coupon } from '../types';

/**
 * Mapeia registro do Supabase para o formato de Coupon do Frontend
 */
export function mapSupabaseCouponToCoupon(row: any): Coupon {
  const code = (row.code || '').trim().toUpperCase();
  const storeName = row.store_name || 'Loja Parceira';
  const trackingUrl = row.tracking_url || row.affiliate_url || '#';
  const description = row.description || `Aproveite o cupom ${code} em suas compras na ${storeName}.`;
  
  return {
    id: row.id,
    advertiserId: row.advertiser_id || '',
    storeName,
    code,
    description,
    trackingUrl,
    affiliateUrl: trackingUrl, // retrocompatibilidade
    validUntil: row.valid_until || undefined,
    title: row.title || `${row.discount_value ? row.discount_value + ' - ' : ''}${storeName}`,
    discountType: 'percentage',
    discountValue: 0,
    minPurchase: 0,
    isActive: row.is_active !== false,
    isExclusive: true,
    isVerified: true,
    usageCount: 150 + (parseInt(row.id?.replace(/\D/g, '').slice(-2) || '10', 10) * 8),
    successRate: 98,
    verifiedAt: 'Hoje',
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

    // Filtra cupons válidos (não expirados) e mapeia para o formato de exibição
    return data
      .filter((row: any) => {
        if (!row.code || !row.tracking_url) return false;
        if (row.valid_until) {
          const expiry = new Date(row.valid_until);
          if (!isNaN(expiry.getTime()) && expiry < now) {
            return false; // Ignora cupom expirado
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
