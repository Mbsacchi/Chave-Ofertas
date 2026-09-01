import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { TrendingDown, TrendingUp, Minus, Flame, Calendar, DollarSign } from 'lucide-react';
import { Product, PriceHistoryPoint } from '../types';
import { fetchProductPriceHistory } from '../services/productAnalyticsService';

interface PriceHistoryChartProps {
  product: Product;
}

export const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({ product }) => {
  const [historyData, setHistoryData] = useState<PriceHistoryPoint[]>([]);
  const [selectedRange, setSelectedRange] = useState<'30d' | '90d' | 'all'>('all');

  // Carrega o histórico da tabela price_history no Supabase
  useEffect(() => {
    let isMounted = true;
    const loadHistory = async () => {
      try {
        const data = await fetchProductPriceHistory(product.id, product.priceHistory || []);
        if (isMounted) {
          if (data && data.length > 0) {
            setHistoryData(data);
          } else {
            // Gera pontos contextuais baseados no min/max e menor histórico se ainda não houver dados gravados
            const now = Date.now();
            const dayMs = 24 * 60 * 60 * 1000;
            const points: PriceHistoryPoint[] = [
              {
                date: '30d atrás',
                timestamp: now - 30 * dayMs,
                minPrice: Math.round(product.maxPrice * 0.98),
              },
              {
                date: '15d atrás',
                timestamp: now - 15 * dayMs,
                minPrice: Math.round((product.minPrice + product.maxPrice) / 2),
              },
              {
                date: '7d atrás',
                timestamp: now - 7 * dayMs,
                minPrice: Math.round(product.minPrice * 1.03),
              },
              {
                date: 'Hoje',
                timestamp: now,
                minPrice: product.minPrice,
              },
            ];
            setHistoryData(points);
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar histórico:', err);
      }
    };

    loadHistory();
    return () => {
      isMounted = false;
    };
  }, [product.id, product.minPrice, product.maxPrice, product.priceHistory]);

  // Filtro de período selecionado
  const filteredData = useMemo(() => {
    if (!historyData || historyData.length === 0) return [];
    if (selectedRange === 'all') return historyData;

    const now = Date.now();
    const dayLimit = selectedRange === '30d' ? 30 : 90;
    const cutoff = now - dayLimit * 24 * 60 * 60 * 1000;

    const subset = historyData.filter((p) => p.timestamp >= cutoff);
    return subset.length >= 2 ? subset : historyData;
  }, [historyData, selectedRange]);

  // Cálculos estatísticos de tendência
  const {
    currentPrice,
    minPriceInPeriod,
    maxPriceInPeriod,
    percentDiff,
    isLowestEver,
  } = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        currentPrice: product.minPrice,
        minPriceInPeriod: product.minPrice,
        maxPriceInPeriod: product.maxPrice,
        percentDiff: 0,
        isLowestEver: true,
      };
    }

    const prices = filteredData.map((d) => d.minPrice);
    const curr = prices[prices.length - 1];
    const first = prices[0];
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const pDiff = first > 0 ? ((curr - first) / first) * 100 : 0;
    const isLowest = curr <= (product.historicalLowestPrice || minP);

    return {
      currentPrice: curr,
      minPriceInPeriod: minP,
      maxPriceInPeriod: maxP,
      percentDiff: Math.round(pDiff),
      isLowestEver: isLowest,
    };
  }, [filteredData, product.minPrice, product.maxPrice, product.historicalLowestPrice]);

  // Limites do eixo Y para um visual clean
  const yDomain = useMemo(() => {
    const min = minPriceInPeriod * 0.95;
    const max = maxPriceInPeriod * 1.05;
    return [Math.floor(min), Math.ceil(max)];
  }, [minPriceInPeriod, maxPriceInPeriod]);

  // Custom Tooltip Formatter
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-gray-900/95 dark:bg-black/95 text-white border border-gray-700/80 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>{dataPoint.date}</span>
          </div>
          <div className="text-base font-black text-emerald-400 flex items-center gap-1">
            <span>R$ {Number(payload[0].value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          {dataPoint.minPrice === minPriceInPeriod && (
            <span className="inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              ⚡ Menor Preço do Período
            </span>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-50/80 dark:bg-dark-surface/60 border border-gray-200/80 dark:border-dark-border rounded-3xl p-4 sm:p-6 space-y-4">
      {/* Header com Tendência e Seletor de Período */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm sm:text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-amber-500" />
              <span>Histórico de Evolução de Preços</span>
            </h4>

            {/* Badge de Tendência */}
            {isLowestEver ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white shadow-sm flex items-center gap-1">
                <Flame className="w-3 h-3 fill-current" />
                <span>Menor Preço Histórico!</span>
              </span>
            ) : percentDiff < 0 ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                <TrendingDown className="w-3 h-3" />
                <span>Em Queda ({percentDiff}%)</span>
              </span>
            ) : percentDiff > 0 ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-800 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>Em Alta (+{percentDiff}%)</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gray-100 dark:bg-dark-hover text-gray-600 dark:text-gray-300 flex items-center gap-1">
                <Minus className="w-3 h-3" />
                <span>Preço Estável</span>
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Acompanhe as oscilações diárias para saber a hora certa de comprar.
          </p>
        </div>

        {/* Botões de Período */}
        <div className="flex items-center gap-1 bg-white dark:bg-dark-card p-1 rounded-2xl border border-gray-200 dark:border-dark-border shadow-sm text-xs font-extrabold shrink-0">
          <button
            onClick={() => setSelectedRange('30d')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              selectedRange === '30d'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            30 Dias
          </button>
          <button
            onClick={() => setSelectedRange('90d')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              selectedRange === '90d'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            90 Dias
          </button>
          <button
            onClick={() => setSelectedRange('all')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              selectedRange === 'all'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Tudo
          </button>
        </div>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-3 gap-2.5 pt-1">
        <div className="bg-white dark:bg-dark-card p-3 rounded-2xl border border-gray-200/80 dark:border-dark-border">
          <span className="text-[10px] font-bold text-gray-400 block uppercase">Atual</span>
          <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400">
            R$ {currentPrice.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="bg-white dark:bg-dark-card p-3 rounded-2xl border border-gray-200/80 dark:border-dark-border">
          <span className="text-[10px] font-bold text-gray-400 block uppercase">Mínima do Período</span>
          <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400">
            R$ {minPriceInPeriod.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="bg-white dark:bg-dark-card p-3 rounded-2xl border border-gray-200/80 dark:border-dark-border">
          <span className="text-[10px] font-bold text-gray-400 block uppercase">Máxima do Período</span>
          <span className="text-sm sm:text-base font-black text-gray-700 dark:text-gray-300">
            R$ {maxPriceInPeriod.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      {/* Gráfico Recharts Responsivo */}
      <div className="h-44 sm:h-52 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} opacity={0.6} />
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              fontSize={11}
              fontWeight={700}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={yDomain}
              stroke="#9ca3af"
              fontSize={10}
              fontWeight={700}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `R$${v}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="minPrice"
              stroke="#10b981"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#priceGradient)"
              activeDot={{ r: 6, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
