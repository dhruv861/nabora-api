import { Injectable } from '@nestjs/common';
import { ICacheProvider } from '../cache.interface';

interface CacheEntry {
  value: string; // always stored as JSON string
  expiresAt?: number;
}

/**
 * In-memory cache using a Map with TTL tracking.
 * JSON-serializes all values so get() returns the deserialized value.
 * Use only in development when Redis is not running.
 * Not suitable for production (not shared across instances).
 */
@Injectable()
export class MemoryCacheProvider implements ICacheProvider {
  private store = new Map<string, CacheEntry>();

  async get(key: string): Promise<unknown> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    try {
      return JSON.parse(entry.value) as unknown;
    } catch {
      return entry.value;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    this.store.set(key, {
      value: JSON.stringify(value),
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async incr(key: string): Promise<number> {
    const current = await this.get(key);
    const next = parseInt(String(current ?? '0'), 10) + 1;
    const entry = this.store.get(key);
    await this.set(key, next);
    // Preserve existing TTL when incrementing
    if (entry?.expiresAt) {
      const stored = this.store.get(key);
      if (stored) {
        this.store.set(key, { ...stored, expiresAt: entry.expiresAt });
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
