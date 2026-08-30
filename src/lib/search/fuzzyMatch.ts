/**
 * Calculates the Levenshtein edit distance between two strings.
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
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[bn][an];
}

/**
 * Checks if a target string fuzzy matches a query pattern with tolerance for typos,
 * missing letters, transposed characters, and partial token matches.
 *
 * Example: 'playstatin' matches 'PlayStation 5 Console'
 * Example: 'iphne' matches 'Apple iPhone 15 Pro Max'
 * Example: 'fone bluetooth jbl' matches 'Fone de Ouvido Bluetooth JBL Tune 510BT'
 */
export function fuzzyMatch(target: string, query: string): boolean {
  if (!target || !query) return false;
  
  const normTarget = target.toLowerCase().trim();
  const normQuery = query.toLowerCase().trim();

  // 1. Direct exact substring match (Fast Path)
  if (normTarget.includes(normQuery)) return true;

  // 2. Tokenized match with Levenshtein typo tolerance
  const queryTokens = normQuery.split(/\s+/).filter(t => t.length > 0);
  const targetWords = normTarget.split(/[\s\-_,./+]+/).filter(w => w.length > 0);

  // Every token in query must match at least one target word (substring or low edit distance)
  return queryTokens.every((qToken) => {
    // Exact token substring within full target
    if (normTarget.includes(qToken)) return true;

    // Allowed edit distance based on token length
    const maxDistance = qToken.length <= 3 ? 1 : qToken.length <= 6 ? 2 : 3;

    return targetWords.some((tWord) => {
      // Direct prefix/suffix or contained match
      if (tWord.includes(qToken) || qToken.includes(tWord)) return true;
      
      // If token and word lengths are reasonably close, test Levenshtein distance
      if (Math.abs(tWord.length - qToken.length) <= maxDistance) {
        const dist = levenshteinDistance(qToken, tWord);
        return dist <= maxDistance;
      }
      return false;
    });
  });
}
