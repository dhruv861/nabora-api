import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { IPdfProvider } from '../pdf.interface';

/**
 * Gotenberg Docker-based PDF microservice.
 * No headless Chrome memory issues compared to Puppeteer in-process.
 */
@Injectable()
export class GotenbergPdfProvider implements IPdfProvider {
  constructor(private config: ConfigService) {}

  async generateFromHtml(html: string): Promise<Buffer> {
    const form = new FormData();
    const blob = new Blob([html], { type: 'text/html' });
    form.append('files', blob, 'index.html');

    const res = await axios.post<ArrayBuffer>(
      `${this.config.get<string>('GOTENBERG_URL')}/forms/chromium/convert/html`,
      form,
      { responseType: 'arraybuffer' },
    );
    return Buffer.from(res.data);
  }
}
