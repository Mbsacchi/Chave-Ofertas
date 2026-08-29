/**
 * Client-Side Rate Limiter & Anti-Hammering Protection
 * Uses a sliding window algorithm to throttle high-frequency search requests
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

class ClientRateLimiter {
  private timestamps: number[] = [];
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig = { maxRequests: 30, windowMs: 60000 }) {
    this.config = config;
  }

  /**
   * Checks if an action is allowed under the rate limit
   * Returns { allowed: boolean, remaining: number, retryAfterSeconds: number }
   */
  public checkLimit(): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
    const now = Date.now();
    const cutoff = now - this.config.windowMs;

    // Filter out timestamps outside the current sliding window
    this.timestamps = this.timestamps.filter((ts) => ts > cutoff);

    if (this.timestamps.length >= this.config.maxRequests) {
      const oldestInWindow = this.timestamps[0];
      const retryAfterSeconds = Math.ceil((oldestInWindow + this.config.windowMs - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, retryAfterSeconds),
      };
    }

    this.timestamps.push(now);
    return {
      allowed: true,
      remaining: this.config.maxRequests - this.timestamps.length,
      retryAfterSeconds: 0,
    };
  }

  public reset(): void {
    this.timestamps = [];
  }
}

export const searchRateLimiter = new ClientRateLimiter({
  maxRequests: 40, // Max 40 searches
  windowMs: 60000, // per 60 seconds
});

export const alertRateLimiter = new ClientRateLimiter({
  maxRequests: 5,
  windowMs: 60000,
});

/**
 * Debounce helper to delay search execution while user is typing
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, waitMs);
  };
}
