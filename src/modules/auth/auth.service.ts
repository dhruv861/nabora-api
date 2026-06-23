import {
  Injectable,
  HttpException,
  HttpStatus,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import type { ICacheProvider } from '../../providers/cache/cache.interface';
import { CACHE_PROVIDER } from '../../providers/cache/cache.interface';
import type { ISmsProvider } from '../../providers/sms/sms.interface';
import { SMS_PROVIDER } from '../../providers/sms/sms.interface';
import { getFirebaseAuth } from '../../config/firebase-admin.config';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  private readonly OTP_TTL_SECONDS = 300;          // 5 minutes
  private readonly OTP_RATE_LIMIT_WINDOW = 600;    // 10 minutes
  private readonly OTP_RATE_LIMIT_MAX = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject(CACHE_PROVIDER) private readonly cache: ICacheProvider,
    @Inject(SMS_PROVIDER) private readonly sms: ISmsProvider,
  ) {}

  // ─── OTP Rate Limiting ───────────────────────────────────────────────────────

  private async checkOtpRateLimit(phone: string): Promise<void> {
    const key = `rate:otp:${phone}`;
    const attempts = await this.cache.incr(key);
    if (attempts === 1) {
      // Start the window on first attempt
      await this.cache.expire(key, this.OTP_RATE_LIMIT_WINDOW);
    }
    if (attempts > this.OTP_RATE_LIMIT_MAX) {
      throw new HttpException(
        { error: 'OTP_RATE_LIMITED', message: 'Too many OTP requests. Try again in 10 minutes.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  // ─── Send OTP ────────────────────────────────────────────────────────────────

  async sendOtp(phone: string): Promise<{ message: string }> {
    await this.checkOtpRateLimit(phone);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await this.cache.set(`otp:${phone}`, otp, this.OTP_TTL_SECONDS);
    await this.sms.sendOtp(phone, otp);

    return { message: 'OTP sent successfully' };
  }

  // ─── Verify OTP ──────────────────────────────────────────────────────────────

  async verifyOtp(phone: string, otp: string): Promise<{ token: string; user: object; isNew: boolean }> {
    const storedOtp = await this.cache.get(`otp:${phone}`);
    if (!storedOtp || storedOtp !== otp) {
      throw new HttpException(
        { error: 'OTP_INVALID', message: 'OTP is incorrect or has expired.' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this.cache.del(`otp:${phone}`);
    return this.findOrCreateUser(phone);
  }

  // ─── Verify Firebase ID Token ────────────────────────────────────────────────

  async verifyFirebaseToken(idToken: string): Promise<{ token: string; user: object; isNew: boolean }> {
    let decodedToken: { phone_number?: string; uid: string };
    try {
      decodedToken = await getFirebaseAuth().verifyIdToken(idToken) as { phone_number?: string; uid: string };
    } catch {
      throw new UnauthorizedException('Invalid Firebase ID token');
    }

    const phone = decodedToken.phone_number?.replace('+91', '');
    if (!phone) {
      throw new UnauthorizedException('Firebase token does not contain a phone number');
    }

    return this.findOrCreateUser(phone);
  }

  // ─── Shared: Find or Create User ─────────────────────────────────────────────

  private async findOrCreateUser(phone: string): Promise<{ token: string; user: object; isNew: boolean }> {
    let isNew = false;

    let user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await this.prisma.user.create({ data: { phone } });
      isNew = true;
    }

    const payload: JwtPayload = { sub: user.id, phone: user.phone };
    const token = this.jwt.sign(payload);

    return { token, user, isNew };
  }

  // ─── Get Current User ────────────────────────────────────────────────────────

  async getMe(userId: string): Promise<object> {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        workerProfile: {
          include: { skills: { include: { skill: true } } },
        },
        organizationMembers: {
          where: { isActive: true },
          include: { organization: true },
        },
      },
    });
  }
}
