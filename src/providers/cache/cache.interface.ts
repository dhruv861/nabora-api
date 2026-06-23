export interface ICacheProvider {
  /** Returns null if not found. Concrete impls JSON-parse the stored string. */
  get(key: string): Promise<unknown>;
  /** value is JSON-serialized before storage in concrete impls */
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  incr(key: string): Promise<number>;
  expire(key: string, ttlSeconds: number): Promise<void>;
}

export const CACHE_PROVIDER = 'CACHE_PROVIDER';
