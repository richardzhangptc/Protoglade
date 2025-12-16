import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Resend } from 'resend';
import { UnsubscribeService } from '../unsubscribe/unsubscribe.service';

@Injectable()
export class EmailService {
  private resend: Resend;
  private fromEmail = 'Protoglade <noreply@emails.protoglade.com>';
  private frontendUrl: string;

  constructor(
    @Inject(forwardRef(() => UnsubscribeService))
    private unsubscribeService: UnsubscribeService,
  ) {
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.frontendUrl = process.env.FRONTEND_URL || 'https://protoglade.com';
  }

  private generateUnsubscribeUrl(email: string): string {
    const token = this.unsubscribeService.generateUnsubscribeToken(email);
    return `${this.frontendUrl}/unsubscribe?token=${token}`;
  }

  private getUnsubscribeFooter(email: string): string {
    const unsubscribeUrl = this.generateUnsubscribeUrl(email);
    return `
      <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #2a2a3a;">
        <p style="font-size: 11px; color: #52525b; margin: 0;">
          You're receiving this email because you have an account on Protoglade or were invited to a workspace.
        </p>
        <p style="font-size: 11px; color: #52525b; margin: 8px 0 0 0;">
          <a href="${unsubscribeUrl}" style="color: #71717a; text-decoration: underline;">Unsubscribe from these emails</a>
        </p>
      </div>
    `;
  }

  async sendWorkspaceInvitation(
    toEmail: string,
    inviterName: string,
    workspaceName: string,
    inviteToken: string,
  ) {
    // Check if user has unsubscribed
    const isUnsubscribed = await this.unsubscribeService.isUnsubscribed(toEmail);
    if (isUnsubscribed) {
      console.log(`Skipping email to ${toEmail} - user has unsubscribed`);
      return { skipped: true, reason: 'unsubscribed' };
    }

    const inviteUrl = `${this.frontendUrl}/invite/${inviteToken}`;
    const unsubscribeFooter = this.getUnsubscribeFooter(toEmail);

    await this.resend.emails.send({
      from: this.fromEmail,
      to: toEmail,
      subject: `You've been invited to join ${workspaceName} on Protoglade`,
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0f; color: #e4e4e7; padding: 40px; margin: 0; }
          .container { max-width: 500px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 28px; font-weight: bold; color: #818cf8; }
          .card { background: #12121a; border: 1px solid #2a2a3a; border-radius: 12px; padding: 30px; }
          .title { font-size: 20px; font-weight: 600; margin-bottom: 15px; color: #e4e4e7; }
          .text { color: #a1a1aa; line-height: 1.6; margin-bottom: 25px; }
          .button { display: inline-block; background: #6366f1; color: white !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #71717a; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Protoglade</div>
          </div>
          <div class="card">
            <div class="title">You're invited!</div>
            <p class="text">
              <strong>${inviterName}</strong> has invited you to join <strong>${workspaceName}</strong> on Protoglade.
            </p>
            <p class="text">
              Click the button below to accept the invitation and start collaborating with your team.
            </p>
            <a href="${inviteUrl}" class="button">Accept Invitation</a>
          </div>
          <div class="footer">
            <p>This invitation will expire in 7 days.</p>
            <p>If you didn't expect this email, you can safely ignore it.</p>
          </div>
          ${unsubscribeFooter}
        </div>
      </body>
      </html>
    `,
    });

    return { sent: true };
  }
}
