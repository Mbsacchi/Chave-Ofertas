/**
 * Utilitários robustos de formatação e parsing de moeda (BRL e internacional).
 * Evita conversões errôneas onde R$ 3.000,00 ou 3.000 viravam R$ 3,00.
 */

/**
 * Converte qualquer formato de string ou número monetário (BRL ou US) para float válido em Reais.
 * 
 * Casos tratados com precisão:
 * - "3.000,00"    -> 3000.00 (evita que vire 3,00)
 * - "3.000"       -> 3000.00 (milhar com ponto)
 * - "3000,00"     -> 3000.00
 * - "3000.00"     -> 3000.00
 * - "3,000.00"    -> 3000.00 (formato americano)
 * - "R$ 3.499,90" -> 3499.90
 * - "199.90"      -> 199.90
 * - "199,90"      -> 199.90
 * - "49,9"        -> 49.90
 * - "3,00"        -> 3.00
 * - "3.00"        -> 3.00
 * - 3000          -> 3000.00
 */
export function parseCurrencyBRL(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') {
    if (isNaN(val) || val <= 0) return 0;

    // Autocorreção para floats com 3 casas decimais resultantes de parse incorreto de milhares (ex: 2.789 -> 2789)
    // No e-commerce brasileiro, valores com 3 casas decimais e menores que 100 representam milhares de reais
    const strNum = val.toString();
    const parts = strNum.split('.');
    if (parts.length === 2 && parts[1].length === 3 && val < 100) {
      return Math.round(val * 1000);
    }

    return val;
  }

  let str = val.toString().trim();
  if (!str) return 0;

  // Remove caracteres que não sejam dígitos, vírgula ou ponto
  str = str.replace(/[^\d.,]/g, '');
  if (!str) return 0;

  const hasComma = str.includes(',');
  const hasDot = str.includes('.');

  // Caso 1: Possui ambos (vírgula e ponto)
  if (hasComma && hasDot) {
    const lastCommaIndex = str.lastIndexOf(',');
    const lastDotIndex = str.lastIndexOf('.');

    if (lastCommaIndex > lastDotIndex) {
      // Padrão Brasileiro: "3.000,00" ou "2.789,00"
      // Pontos são milhares, vírgula é decimal
      const clean = str.replace(/\./g, '').replace(',', '.');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    } else {
      // Padrão Internacional: "3,000.00" ou "2,789.00"
      // Vírgulas são milhares, ponto é decimal
      const clean = str.replace(/,/g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    }
  }

  // Caso 2: Possui apenas vírgula (ex: "3000,00", "199,90", "2,789")
  if (hasComma) {
    const parts = str.split(',');
    // Se possui exatamente 3 dígitos após a vírgula e parte inteira < 100, trata-se de milhar: "2,789" -> 2789
    if (parts[1] && parts[1].length === 3 && parseFloat(parts[0]) < 100) {
      const clean = str.replace(/,/g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    }

    const clean = str.replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }

  // Caso 3: Possui apenas ponto(s)
  if (hasDot) {
    const dotCount = (str.match(/\./g) || []).length;
    if (dotCount > 1) {
      // Múltiplos pontos são separadores de milhar (ex: "1.000.000")
      const clean = str.replace(/\./g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    }

    // Apenas 1 ponto: verificar se é milhar (3 dígitos após o ponto: "2.789", "3.000")
    const parts = str.split('.');
    const decimalPart = parts[1] || '';

    if (decimalPart.length === 3) {
      const clean = str.replace('.', '');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    }

    // Decimais com 1 ou 2 dígitos (ex: "199.90", "49.9", "3000.50")
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  }

  // Caso 4: Apenas números inteiros
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Normaliza qualquer valor de preço numérico ou textual para reais (BRL).
 * Corrige automaticamente casos onde 2.789 vira R$ 3, centavos inteiros ou strings mal formatadas.
 */
export function normalizePrice(val: any, referencePrice?: number): number {
  if (val === null || val === undefined) return 0;

  let num = typeof val === 'number' ? val : parseCurrencyBRL(val);
  if (isNaN(num) || num <= 0) return 0;

  // 1. Caso de float corrompido com 3 casas decimais (ex: 2.789 vindo de "2.789" mal parseado)
  const str = num.toString();
  const parts = str.split('.');
  if (parts.length === 2 && parts[1].length === 3 && num < 100) {
    num = Math.round(num * 1000);
  }

  // 2. Análise contextual com preço de referência
  if (referencePrice && referencePrice > 0) {
    // Se o valor está na escala de milésimos (ex: num = 2.79 e ref = 2789)
    if (referencePrice >= 100 && num < 50 && Math.abs((num * 1000) - referencePrice) / referencePrice < 0.5) {
      num = Math.round(num * 1000 * 100) / 100;
    }
    // Se o valor está na escala de centavos (ex: num = 278900 e ref = 2789)
    else if (num > 1000 && referencePrice < 10000 && Math.abs((num / 100) - referencePrice) / referencePrice < 0.5) {
      num = Math.round((num / 100) * 100) / 100;
    }
  }

  return Math.round(num * 100) / 100;
}

/**
 * Formata um número ou string para moeda em Reais com prefixo R$
 * Exemplo: 2789 -> "R$ 2.789,00"
 */
export function formatCurrencyBRL(val: number | string | null | undefined): string {
  const num = normalizePrice(val);
  return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Formata valor inteiro em Reais (sem centavos), ideal para cards e destaques
 * Exemplo: 2789 -> "R$ 2.789"
 */
export function formatWholeCurrencyBRL(val: number | string | null | undefined): string {
  const num = normalizePrice(val);
  return `R$ ${Math.round(num).toLocaleString('pt-BR')}`;
}

/**
 * Formata número sem prefixo R$, mantendo o padrão brasileiro com vírgula decimal
 * Exemplo: 2789 -> "2.789,00"
 */
export function formatPriceNumber(val: number | string | null | undefined): string {
  const num = normalizePrice(val);
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
