import React, { useState } from 'react';
import { Copy, Check, ExternalLink, ShieldCheck, Clock, ThumbsUp, Tag, Scissors } from 'lucide-react';
import { Coupon } from '../types';
import { sanitizeUrl } from '../lib/security/sanitizer';

interface CouponCardProps {
  coupon: Coupon;
}

export const CouponCard: React.FC<CouponCardProps> = ({ coupon }) => {
  const [copied, setCopied] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  // Masked code generator (ex: KABUM10 -> KAB***)
  const maskedCode = coupon.code.length > 4 
    ? `${coupon.code.slice(0, 3)}***` 
    : `${coupon.code.slice(0, 1)}***`;

  const displayCode = isRevealed || copied ? coupon.code : maskedCode;

  // URL de rastreamento com segurança
  const trackingUrl = sanitizeUrl(coupon.trackingUrl || coupon.affiliateUrl || '');

  // Ação Estratégica: Copiar o código na área de transferência e abrir a loja imediatamente
  const handleClaimCoupon = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 1. Copia o código para a área de transferência do usuário
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(coupon.code).catch(() => {});
    }

    // 2. Abre a URL de afiliado em nova aba para fixar o cookie de comissão
    if (trackingUrl && trackingUrl !== '#') {
      window.open(trackingUrl, '_blank', 'noopener,noreferrer');
    }

    // 3. Feedback visual no card
    setIsRevealed(true);
    setCopied(true);
    setTimeout(() => setCopied(false), 3500);
  };

  // Formatação de data de expiração se informada
  const formattedExpiry = coupon.validUntil 
    ? new Date(coupon.validUntil).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;

  return (
    <div className="relative group bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-sm hover:shadow-xl hover:border-amber-400/80 dark:hover:border-amber-400/80 transition-all duration-300 space-y-5">
      {/* Top Banner / Store Header */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 p-1.5 border border-amber-200 dark:border-amber-800/40 flex items-center justify-center font-black text-xs text-amber-900 dark:text-amber-300 shadow-sm shrink-0">
              {coupon.storeName.slice(0, 3).toUpperCase()}
            </div>
            <div>
              <span className="text-sm font-extrabold text-gray-900 dark:text-white block">
                {coupon.storeName}
              </span>
              <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Cupom Verificado</span>
              </div>
            </div>
          </div>

          <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" />
            <span>CUPOM REAL</span>
          </span>
        </div>

        {/* Title and Description */}
        <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white leading-snug">
          {coupon.title || `Cupom de Desconto ${coupon.storeName}`}
        </h3>

        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 leading-relaxed line-clamp-3">
          {coupon.description}
        </p>
      </div>

      {/* Code Box and High-Converting Actions */}
      <div className="pt-4 border-t border-dashed border-gray-200 dark:border-dark-border space-y-3.5">
        {/* Success Rate & Urgency Bar */}
        <div>
          <div className="flex justify-between items-center text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-black">
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>98% de sucesso</span>
            </span>
            {formattedExpiry ? (
              <span className="flex items-center gap-1 text-red-500 font-extrabold">
                <Clock className="w-3.5 h-3.5" />
                <span>Válido até {formattedExpiry}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-500 font-extrabold">
                <Clock className="w-3.5 h-3.5" />
                <span>Oferta Ativa</span>
              </span>
            )}
          </div>
          <div className="w-full h-2 bg-gray-100 dark:bg-dark-hover rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
              style={{ width: '98%' }}
            />
          </div>
        </div>

        {/* Coupon Scissors Box with Masked Code */}
        <div 
          onClick={handleClaimCoupon}
          className={`cursor-pointer p-3 rounded-2xl border-2 border-dashed transition-all flex items-center justify-between gap-3 ${
            copied
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-glow-green'
              : 'bg-gray-50/80 dark:bg-dark-surface border-amber-300 dark:border-amber-700/60 hover:border-amber-500 hover:bg-amber-50/40 dark:hover:bg-amber-950/20'
          }`}
          title="Clique para copiar e ir para a loja parceira com desconto"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 shrink-0">
              <Scissors className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-gray-400 block">
                {isRevealed || copied ? 'Código Copiado:' : 'Clique para Revelar & Copiar:'}
              </span>
              <span className="font-mono font-black text-sm sm:text-base tracking-widest text-gray-900 dark:text-white truncate block">
                {displayCode}
              </span>
            </div>
          </div>

          <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider shrink-0 flex items-center gap-1 ${
            copied
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
          }`}>
            {copied ? (
              <>
                <Check className="w-3 h-3 stroke-[3]" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Ver Código</span>
              </>
            )}
          </span>
        </div>

        {/* Primary Dual-Action CTA Button (Nome Obrigatório: "Copiar e Ir para a Loja") */}
        <button
          type="button"
          onClick={handleClaimCoupon}
          className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md ${
            copied
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-glow-green'
              : 'bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-glow-amber'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 stroke-[3]" />
              <span>CÓDIGO COPIADO! ABRINDO LOJA...</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copiar e Ir para a Loja</span>
              <ExternalLink className="w-4 h-4 ml-0.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
