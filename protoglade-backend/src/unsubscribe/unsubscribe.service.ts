import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHmac } from 'crypto';

@Injectable()
export class UnsubscribeService {
  private readonly secretKey: string;

  constructor(private prisma: PrismaService) {
    this.secretKey = process.env.UNSUBSCRIBE_SECRET || process.env.JWT_SECRET || 'default-unsubscribe-secret';
  }

  /**
   * Generate a secure unsubscribe token for an email address
   * Uses HMAC-SHA256 to create a signature that can be verified without database lookup
   */
  generateUnsubscribeToken(email: string): string {
    const signature = createHmac('sha256', this.secretKey)
      .update(email.toLowerCase())
      .digest('hex');
    
    // Encode email and signature together
    const payload = Buffer.from(JSON.stringify({ email: email.toLowerCase(), sig: signature })).toString('base64url');
    return payload;
  }

  /**
   * Verify and decode an unsubscribe token
   */
  verifyUnsubscribeToken(token: string): string {
    try {
      const payload = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
      const { email, sig } = payload;

      if (!email || !sig) {
        throw new BadRequestException('Invalid unsubscribe token');
      }

      // Verify signature
      const expectedSig = createHmac('sha256', this.secretKey)
        .update(email.toLowerCase())
        .digest('hex');

      if (sig !== expectedSig) {
        throw new BadRequestException('Invalid unsubscribe token');
      }

      return email;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Invalid unsubscribe token');
    }
  }

  /**
   * Unsubscribe an email from receiving emails
   */
  async unsubscribe(token: string): Promise<{ email: string; message: string }> {
    const email = this.verifyUnsubscribeToken(token);

    // Update user if they exist
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      await this.prisma.user.update({
        where: { email },
        data: { emailUnsubscribed: true },
      });
    }

    return {
      email,
      message: 'You have been successfully unsubscribed from Protoglade emails.',
    };
  }

  /**
   * Re-subscribe an email to receiving emails
   */
  async resubscribe(token: string): Promise<{ email: string; message: string }> {
    const email = this.verifyUnsubscribeToken(token);

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      await this.prisma.user.update({
        where: { email },
        data: { emailUnsubscribed: false },
      });
    }

    return {
      email,
      message: 'You have been successfully re-subscribed to Protoglade emails.',
    };
  }

  /**
   * Check if an email is unsubscribed
   */
  async isUnsubscribed(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { emailUnsubscribed: true },
    });

    return user?.emailUnsubscribed ?? false;
  }
}

