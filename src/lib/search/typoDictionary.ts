/**
 * Hybrid Search: Typo Dictionary & Phonetic Matching for Brazilian E-commerce
 */

export const TYPO_DICTIONARY: Record<string, string> = {
  // Brands & Tech
  'samsumg': 'samsung',
  'sansung': 'samsung',
  'samung': 'samsung',
  'samsug': 'samsung',
  'smarthone': 'smartphone',
  'smartfone': 'smartphone',
  'ifone': 'iphone',
  'i-phone': 'iphone',
  'iphonne': 'iphone',
  'iphon': 'iphone',
  'ayphone': 'iphone',
  'xiaomy': 'xiaomi',
  'xaomi': 'xiaomi',
  'xaiomi': 'xiaomi',
  'shaomi': 'xiaomi',
  'macbok': 'macbook',
  'makbook': 'macbook',
  'macbuk': 'macbook',
  'notbook': 'notebook',
  'notebuk': 'notebook',
  'noteboke': 'notebook',
  'lap top': 'laptop',
  'blutooth': 'bluetooth',
  'bluetoth': 'bluetooth',
  'blutuf': 'bluetooth',
  'airpode': 'airpods',
  'air pod': 'airpods',
  'airpod': 'airpods',
  'play 5': 'ps5',
  'plestation': 'playstation',
  'pleystation': 'playstation',
  'playstation5': 'ps5',
  'xbox siries': 'xbox series',
  'nintendo swith': 'nintendo switch',
  'switche': 'switch',
  'monito': 'monitor',
  'moniotr': 'monitor',
  'teclado mecanco': 'teclado mecanico',
  'cadeira geimer': 'cadeira gamer',
  'geimer': 'gamer',
  'airfraer': 'air fryer',
  'airfry': 'air fryer',
  'airfrier': 'air fryer',
  'erfrayer': 'air fryer',
  'geladera': 'geladeira',
  'televisao': 'tv',
  'microondas': 'micro-ondas',
  'aspirado': 'aspirador',
  'amzon': 'amazon',
  'shope': 'shopee',
  'mercadolivre': 'mercado livre',
  'magalu': 'magazine luiza',
};

/**
 * Calculates Levenshtein Distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix: number[][] = [];
  for (let i = 0; i <= bn; ++i) matrix[i] = [i];
  for (let i = 0; i <= an; ++i) matrix[0][i] = i;

  for (let i = 1; i <= bn; ++i) {
    for (let j = 1; j <= an; ++j) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        );
      }
    }
  }
  return matrix[bn][an];
}

/**
 * Corrects known typos in a search phrase using the dictionary and word replacements
 */
export function checkAndCorrectTypos(query: string): {
  hasCorrection: boolean;
  correctedQuery: string;
  correctedTerms: { original: string; replacement: string }[];
} {
  if (!query || typeof query !== 'string') {
    return { hasCorrection: false, correctedQuery: '', correctedTerms: [] };
  }

  const normalized = query.toLowerCase().trim();
  const words = normalized.split(/\s+/);
  const correctedTerms: { original: string; replacement: string }[] = [];
  let isChanged = false;

  const newWords = words.map((word) => {
    // 1. Direct dictionary match
    if (TYPO_DICTIONARY[word]) {
      const replacement = TYPO_DICTIONARY[word];
      correctedTerms.push({ original: word, replacement });
      isChanged = true;
      return replacement;
    }

    // 2. Levenshtein match for close dictionary keys (length >= 4 and distance == 1)
    if (word.length >= 4) {
      for (const [typoKey, correctVal] of Object.entries(TYPO_DICTIONARY)) {
        if (levenshteinDistance(word, typoKey) <= 1) {
          correctedTerms.push({ original: word, replacement: correctVal });
          isChanged = true;
          return correctVal;
        }
      }
    }

    return word;
  });

  const correctedQuery = newWords.join(' ');
  return {
    hasCorrection: isChanged && correctedQuery !== normalized,
    correctedQuery,
    correctedTerms,
  };
}
