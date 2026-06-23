import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PDF_PROVIDER, IPdfProvider } from './pdf.interface';
import { PuppeteerPdfProvider } from './providers/puppeteer.pdf.provider';
import { GotenbergPdfProvider } from './providers/gotenberg.pdf.provider';
import { HtmlPdfProvider } from './providers/htmlpdf.pdf.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: PDF_PROVIDER,
      useFactory: (config: ConfigService): IPdfProvider => {
        const provider = config.get<string>('PDF_PROVIDER', 'puppeteer');
        switch (provider) {
          case 'gotenberg':
            return new GotenbergPdfProvider(config);
          case 'htmlpdf':
            return new HtmlPdfProvider();
          case 'puppeteer':
          default:
            return new PuppeteerPdfProvider();
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [PDF_PROVIDER],
})
export class PdfModule {}
