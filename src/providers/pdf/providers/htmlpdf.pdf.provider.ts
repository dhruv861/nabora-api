import { Injectable } from '@nestjs/common';
import { IPdfProvider } from '../pdf.interface';

/**
 * Lightweight HTML-to-PDF provider using html-pdf-node.
 * No Chrome install needed. Less fidelity than Puppeteer for complex layouts.
 */
@Injectable()
export class HtmlPdfProvider implements IPdfProvider {
  async generateFromHtml(html: string): Promise<Buffer> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const htmlPdf = require('html-pdf-node') as {
      generatePdf: (
        file: { content: string },
        options: { format: string },
        cb: (err: Error | null, buffer: Buffer) => void,
      ) => void;
    };
    return new Promise<Buffer>((resolve, reject) => {
      htmlPdf.generatePdf({ content: html }, { format: 'A4' }, (err, buffer) => {
        if (err) reject(err);
        else resolve(buffer);
      });
    });
  }
}
