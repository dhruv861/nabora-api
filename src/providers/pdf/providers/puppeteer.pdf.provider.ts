import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { IPdfProvider } from '../pdf.interface';

@Injectable()
export class PuppeteerPdfProvider implements IPdfProvider {
  async generateFromHtml(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      const pdf = await page.pdf({ format: 'A4', printBackground: true });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}
