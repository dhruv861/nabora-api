import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { IStorageProvider } from '../storage.interface';

/**
 * Saves files to local disk. Use only in development when R2 is not configured.
 * Files are served via NestJS static assets at /uploads/* (configured in main.ts).
 */
@Injectable()
export class LocalStorageProvider implements IStorageProvider {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  async upload(key: string, buffer: Buffer, _contentType: string): Promise<string> {
    const filePath = path.join(this.uploadDir, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
    return `http://localhost:3000/uploads/${key}`;
  }

  async delete(key: string): Promise<void> {
    await fs.unlink(path.join(this.uploadDir, key)).catch(() => {
      // Ignore if file does not exist
    });
  }

  async getSignedUrl(key: string, _expiresInSeconds = 3600): Promise<string> {
    // Local files are publicly accessible — no signing needed
    return `http://localhost:3000/uploads/${key}`;
  }
}
