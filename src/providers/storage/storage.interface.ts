export interface IStorageProvider {
  upload(key: string, buffer: Buffer, contentType: string): Promise<string>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
}

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';
