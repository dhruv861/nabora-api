export interface IEmailProvider {
  send(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void>;
}

export const EMAIL_PROVIDER = 'EMAIL_PROVIDER';
