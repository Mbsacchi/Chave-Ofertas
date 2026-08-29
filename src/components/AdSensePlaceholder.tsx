import React from 'react';
import { ExternalLink, Sparkles, Flame, Truck, ArrowRight } from 'lucide-react';

interface AdSensePlaceholderProps {
  slotType: 'leaderboard' | 'sidebar' | 'infeed' | 'footer-banner';
  className?: string;
}

export const AdSensePlaceholder: React.FC<AdSensePlaceholderProps> = ({
  slotType,
  className = '',
}) => {
  // Renders realistic, high-converting commercial banners that fit the production design
  if (slotType === 'leaderboard') {
    return (
      <div className={`w-full flex flex-col items-center justify-center my-4 ${className}`}>
        {/* Discreet Compliance Tag */}
        <div className="w-full flex justify-between items-center px-2 mb-1">
          <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">
            Ofertas em Destaque dos Parceiros
          </span>
          <span className="text-[9px] uppercase font-semibold text-gray-400 dark:text-gray-500">
            Publicidade
          </span>
        </div>

        {/* Real-Looking Commercial Banner */}
        <div className="w-full bg-gradient-to-r from-slate-900 via-gray-900 to-amber-950 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-4 border border-amber-900/30 group">
          {/* Background Decorative Glow */}
          <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-amber-500/15 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex items-center gap-4 relative z-10 w-full sm:w-auto">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-lg shrink-0 animate-pulse-subtle">
              <Flame className="w-6 h-6 fill-current" />
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-gray-950">
                  MEGA FESTIVAL TECH
                </span>
                <span className="text-xs text-amber-200/90 font-bold hidden md:inline">
                  Amazon • Mercado Livre • Shopee • KaBuM!
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-white leading-tight">
                Até 40% OFF em Smartphones, MacBooks e Monitores Gamers
              </h3>
              <p className="text-xs text-gray-300 hidden sm:block">
                Parcele em até 10x sem juros com frete expresso para todo o Brasil.
              </p>
            </div>
          </div>

          <div className="relative z-10 w-full sm:w-auto flex justify-end shrink-0">
            <a
              href="https://amazon.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-black text-xs shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              <span>Aproveitar Descontos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (slotType === 'sidebar') {
    return (
      <div className={`w-full flex flex-col items-center my-4 ${className}`}>
        <div className="w-full flex justify-between items-center px-1 mb-1">
          <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">
            Promoção Relâmpago
          </span>
          <span className="text-[9px] uppercase font-semibold text-gray-400">Publicidade</span>
        </div>

        <div className="w-full bg-gradient-to-b from-slate-900 via-gray-900 to-amber-950 text-white rounded-3xl p-6 shadow-xl border border-amber-900/30 relative overflow-hidden flex flex-col justify-between min-h-[340px]">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl pointer-events-none"></div>

          <div className="space-y-3 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider">
              <Truck className="w-3.5 h-3.5" />
              <span>Semana do Frete Grátis</span>
            </div>

            <h4 className="text-lg font-black text-white leading-tight">
              Economize mais de R$ 300 nas Melhores Lojas
            </h4>

            <p className="text-xs text-gray-300 leading-relaxed">
              Confira a lista dos 50 produtos mais vendidos da semana com menor preço verificado e cupons aplicados.
            </p>

            <div className="pt-2 space-y-1.5 text-xs text-gray-200 font-medium">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Cupons testados e atualizados</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Preços auditados contra aumento prévio</span>
              </div>
            </div>
          </div>

          <div className="pt-5 border-t border-gray-800 relative z-10 flex flex-col gap-2">
            <a
              href="https://mercadolivre.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-black text-xs shadow-glow-amber flex items-center justify-center gap-2 transition-all active:scale-95 text-center"
            >
              <span>Ver Ofertas Especiais</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (slotType === 'infeed') {
    return (
      <div className={`w-full bg-gradient-to-r from-gray-900 via-amber-950/80 to-gray-900 text-white rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-5 my-4 border border-amber-500/30 ${className}`}>
        <div className="absolute right-0 top-0 w-80 h-full bg-amber-500/10 skew-x-12 pointer-events-none"></div>

        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shadow-inner shrink-0 border border-amber-500/30">
            <Sparkles className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Destaque Patrocinado
              </span>
              <span className="text-[11px] text-gray-400">• Verificado Hoje</span>
            </div>
            <h4 className="text-base sm:text-lg font-black text-white leading-tight">
              Ofertas Especiais com Cupons de até 20% OFF
            </h4>
            <p className="text-xs text-gray-300 max-w-xl leading-relaxed">
              Compare as lojas oficiais e garanta a entrega mais rápida e o melhor preço à vista no Pix.
            </p>
          </div>
        </div>

        <div className="relative z-10 w-full sm:w-auto shrink-0 flex justify-end">
          <a
            href="https://shopee.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-black text-xs shadow-xl transition-transform active:scale-95 flex items-center justify-center gap-2"
          >
            <span>Conferir Oferta</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    );
  }

  return null;
};
