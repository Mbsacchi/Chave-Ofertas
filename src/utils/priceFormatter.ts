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
    return isNaN(val) ? 0 : val;
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
      // Padrão Brasileiro: "3.000,00" ou "1.250.000,50"
      // Pontos são milhares, vírgula é decimal
      const clean = str.replace(/\./g, '').replace(',', '.');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    } else {
      // Padrão Internacional: "3,000.00" ou "1,250,000.50"
      // Vírgulas são milhares, ponto é decimal
      const clean = str.replace(/,/g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    }
  }

  // Caso 2: Possui apenas vírgula (ex: "3000,00", "199,90", "3,50")
  if (hasComma) {
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

    // Apenas 1 ponto: verificar se é milhar (3 dígitos após o ponto)
    const parts = str.split('.');
    const decimalPart = parts[1] || '';

    // No contexto de e-commerce brasileiro, "3.000", "1.200", "25.000" representam milhares
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
 * Formata um número ou string para moeda em Reais com prefixo R$
 * Exemplo: 3000 -> "R$ 3.000,00"
 */
export function formatCurrencyBRL(val: number | string | null | undefined): string {
  const num = typeof val === 'number' ? val : parseCurrencyBRL(val);
  return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Formata número sem prefixo R$, mantendo o padrão brasileiro com vírgula decimal
 * Exemplo: 3000 -> "3.000,00"
 */
export function formatPriceNumber(val: number | string | null | undefined): string {
  const num = typeof val === 'number' ? val : parseCurrencyBRL(val);
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
