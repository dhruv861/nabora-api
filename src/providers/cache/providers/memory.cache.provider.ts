import { Injectable } from '@nestjs/common';
import { ICacheProvider } from '../cache.interface';

interface CacheEntry {
  value: string;
  expiresAt?: number;
}

/**
 * In-memory cache using a Map with TTL tracking.
 * Use only in development when Redis is not running.
 * Not suitable for production (not shared across instances).
 */
@Injectable()
export class MemoryCacheProvider implements ICacheProvider {
  private store = new Map<string, CacheEntry>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async incr(key: string): Promise<number> {
    const current = await this.get(key);
    const next = parseInt(current ?? '0', 10) + 1;
    // Preserve existing TTL when incrementing
    const entry = this.store.get(key);
    await this.set(key, String(next));
    if (entry?.expiresAt) {
      const remaining = Math.ceil((entry.expiresAt - Date.now()) / 1000);
      if (remaining > 0) {
        const updated = this.store.get(key);
        if (updated) {
          this.store.set(key, { ...updated, expiresAt: entry.expiresAt });
        }
      }
    }
    return next;
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    const entry = this.store.get(key);
    if (entry) {
      this.store.set(key, {
        ...entry,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
    }
  }
}
