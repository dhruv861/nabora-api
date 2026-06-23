export interface IPdfProvider {
  generateFromHtml(html: string): Promise<Buffer>;
}

export const PDF_PROVIDER = 'PDF_PROVIDER';
