import DOMPurify from 'dompurify';

/**
 * Enterprise-Grade Input Sanitization & Anti-XSS Security Module
 * Universally safe for Browser and SSR/Node environments
 */

const SAFE_SEARCH_PATTERN = /[^a-zA-Z0-9\s\-_.,áàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]/g;
const SCRIPT_TAG_PATTERN = /<[^>]*>?/gm;
const MAX_SEARCH_LENGTH = 64;

function getSanitizeFn() {
  if (typeof window !== 'undefined') {
    if (typeof (DOMPurify as any)?.sanitize === 'function') {
      return (DOMPurify as any).sanitize.bind(DOMPurify);
    }
    if (typeof (DOMPurify as any)?.default?.sanitize === 'function') {
      return (DOMPurify as any).default.sanitize.bind((DOMPurify as any).default);
    }
    if (typeof DOMPurify === 'function') {
      const instance = (DOMPurify as any)(window);
      if (instance && typeof instance.sanitize === 'function') {
        return instance.sanitize.bind(instance);
      }
    }
  }
  return null;
}

/**
 * Sanitizes a raw search query against XSS, script injection, and SQL/NoSQL payload characters
 */
export function sanitizeSearchQuery(input: unknown): string {
  if (typeof input !== 'string') {
    return '';
  }

  let cleanHtml = input;
  const sanitize = getSanitizeFn();

  if (sanitize) {
    cleanHtml = sanitize(input, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
    });
  } else {
    // SSR / Node fallback
    cleanHtml = input.replace(SCRIPT_TAG_PATTERN, ' ');
  }

  // 2. Remove non-whitelisted characters
  let sanitized = cleanHtml.replace(SAFE_SEARCH_PATTERN, ' ');

  // 3. Normalize multiple spaces and trim
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  // 4. Enforce strict max length
  if (sanitized.length > MAX_SEARCH_LENGTH) {
    sanitized = sanitized.slice(0, MAX_SEARCH_LENGTH);
  }

  return sanitized;
}

/**
 * Validates whether a URL is a valid, secure http/https affiliate link
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') return '#';
  const trimmed = url.trim();
  
  if (!/^https?:\/\//i.test(trimmed)) {
    return '#';
  }
  
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '#';
    }
    return parsed.toString();
  } catch {
    return '#';
  }
}

/**
 * Sanitizes general user text (e.g. alert notes, feedback)
 */
export function sanitizeText(text: string, maxLength = 200): string {
  if (!text || typeof text !== 'string') return '';
  let clean = text;
  const sanitize = getSanitizeFn();
  if (sanitize) {
    clean = sanitize(text, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });
  } else {
    clean = text.replace(SCRIPT_TAG_PATTERN, '');
  }
  return clean.slice(0, maxLength).trim();
}
