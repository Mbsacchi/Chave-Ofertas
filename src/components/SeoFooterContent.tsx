import React from 'react';
import { ShieldCheck, Sparkles, CheckCircle2, ShoppingBag } from 'lucide-react';

export const SeoFooterContent: React.FC = () => {
  return (
    <section className="w-full bg-white dark:bg-dark-surface border-t border-gray-200 dark:border-dark-border py-12 px-4 sm:px-6 lg:px-8 mt-16 transition-colors">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Editorial Heading */}
        <div className="text-center max-w-3xl mx-auto">
          <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
            Guia do Consumidor & Transparência
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-3">
            Como Economizar com Segurança Comparando Preços e Cupons
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
            O <strong>Chave Ofertas</strong> é uma plataforma independente de inteligência de consumo projetada para ajudar compradores a encontrarem o menor preço verificado e cupons ativos nas maiores lojas do e-commerce brasileiro.
          </p>
        </div>

        {/* 3 Value Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <article className="p-6 rounded-2xl bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">
              Comparação em Tempo Real
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Monitoramos constantemente catálogos da <strong>Amazon Brasil, Mercado Livre, Shopee, Magazine Luiza e KaBuM!</strong>. Nosso algoritmo analisa preço à vista, opções de parcelamento sem juros e frete para revelar a economia real.
            </p>
          </article>

          <article className="p-6 rounded-2xl bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">
              Cupons Auditados & Testados
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Diga adeus a códigos expirados ou inválidos. Nossa equipe valida diariamente as regras de uso, valores mínimos de compra e percentuais de desconto para garantir até 99% de taxa de sucesso nas suas compras.
            </p>
          </article>

          <article className="p-6 rounded-2xl bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">
              Histórico de Preços sem Pegadinhas
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Consulte a evolução dos preços nos últimos 6 meses para saber se a promoção é uma oportunidade genuína ("metade do dobro" nunca mais!). Ative alertas gratuitos para ser notificado quando o produto baixar.
            </p>
          </article>
        </div>

        {/* Structured SEO Guide Content */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border space-y-6">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white">
              Dicas Essenciais para Comprar no E-commerce com Cupons de Desconto
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
              Comprar pela internet se tornou a forma mais conveniente e econômica de adquirir tecnologia, smartphones, informática e eletrodomésticos. Para maximizar sua economia, siga estas práticas recomendadas:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-700 dark:text-gray-300">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Verifique as regras do cupom:</strong> Alguns códigos são exclusivos para primeira compra, uso no app mobile ou categorias específicas (como Eletrônicos ou Moda).</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Atenção ao custo do frete:</strong> Nem sempre a loja com o menor preço do produto oferece a melhor condição final. Avalie o frete grátis da Amazon Prime ou Shopee Mall.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Compare o preço à vista vs parcelado:</strong> Plataformas como KaBuM! e Mercado Livre costumam conceder descontos expressivos de 10% a 15% para pagamentos via Pix.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Monitore o histórico com alertas:</strong> Crie um alerta no Chave Ofertas para produtos de alto valor (como iPhones ou MacBooks) e compre no momento ideal.</span>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-dark-border">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Lojas Oficiais e Parceiros Homologados
            </h4>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300 font-medium">Amazon Brasil</span>
              <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300 font-medium">Mercado Livre Oficial</span>
              <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300 font-medium">Shopee Mall</span>
              <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300 font-medium">Magazine Luiza</span>
              <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300 font-medium">KaBuM! Hardware</span>
              <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300 font-medium">Casas Bahia</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
