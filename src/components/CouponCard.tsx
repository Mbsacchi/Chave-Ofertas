import React, { useState } from 'react';
import { Copy, Check, ExternalLink, ShieldCheck, Clock, ThumbsUp, Tag, Scissors, Sparkles } from 'lucide-react';
import { Coupon } from '../types';
import { sanitizeUrl } from '../lib/security/sanitizer';

interface CouponCardProps {
  coupon: Coupon;
}

export const CouponCard: React.FC<CouponCardProps> = ({ coupon }) => {
  const [copied, setCopied] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  // Masked code generator (e.g., KABUM10 -> KAB***)
  const maskedCode = coupon.code.length > 4 
    ? `${coupon.code.slice(0, 3)}***` 
    : `${coupon.code.slice(0, 1)}***`;

  const displayCode = isRevealed || copied ? coupon.code : maskedCode;

  // Cookie Trap Dual Action: Silent copy + window.open to guarantee affiliate cookie drop
  const handleClaimCoupon = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 1. Silent clipboard copy of full code
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(coupon.code).catch(() => {});
    }

    // 2. Open affiliate store in new tab
    const sanitizedUrl = sanitizeUrl(coupon.affiliateUrl);
    window.open(sanitizedUrl, '_blank', 'noopener,noreferrer');

    // 3. Reveal the full code and show immediate conversion feedback
    setIsRevealed(true);
    setCopied(true);
    setTimeout(() => setCopied(false), 3500);
  };

  const formattedDiscount =
    coupon.discountType === 'percentage'
      ? `${coupon.discountValue}% OFF`
      : coupon.discountType === 'fixed'
      ? `R$ ${coupon.discountValue} OFF`
      : 'Frete Grátis';

  return (
    <div className="relative group bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-sm hover:shadow-xl hover:border-amber-400/80 dark:hover:border-amber-400/80 transition-all duration-300 space-y-5">
      {/* Top Banner / Store Header */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-dark-surface p-1.5 border border-gray-200 dark:border-dark-border flex items-center justify-center font-black text-xs text-gray-800 dark:text-gray-200 shadow-sm shrink-0">
              {coupon.storeName.slice(0, 3).toUpperCase()}
            </div>
            <div>
              <span className="text-sm font-extrabold text-gray-900 dark:text-white block">
                {coupon.storeName}
              </span>
              <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Testado {coupon.verifiedAt}</span>
              </div>
            </div>
          </div>

          <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" />
            <span>{formattedDiscount}</span>
          </span>
        </div>

        {/* Title and Description */}
        <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white leading-snug">
          {coupon.title}
        </h3>

        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
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
              <span>{coupon.successRate}% de sucesso ({coupon.usageCount.toLocaleString('pt-BR')} usos hoje)</span>
            </span>
            <span className="flex items-center gap-1 text-red-500 font-extrabold">
              <Clock className="w-3.5 h-3.5" />
              <span>Expira em breve</span>
            </span>
          </div>
          <div className="w-full h-2 bg-gray-100 dark:bg-dark-hover rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
              style={{ width: `${coupon.successRate}%` }}
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
          title="Clique para copiar o cupom e abrir a loja com desconto"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 shrink-0">
              <Scissors className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-gray-400 block">
                {isRevealed || copied ? 'Cupom Desbloqueado:' : 'Clique para Revelar & Copiar:'}
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

        {/* Primary Dual-Action CTA Button */}
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
              <Sparkles className="w-4 h-4" />
              <span>Pegar Cupom & Ir para Loja</span>
              <ExternalLink className="w-4 h-4 ml-0.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
