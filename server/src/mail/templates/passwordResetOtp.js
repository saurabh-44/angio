import { escapeHtml, shellTemplate } from './_shared.js';

export function passwordResetOtpTemplate({ otp, name }) {
  return shellTemplate({
    headerTitle: 'Password reset code',
    headerGradient: 'linear-gradient(135deg,#f59e0b 0%,#b45309 100%)',
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">
        Hi ${escapeHtml(name ?? 'there')},
      </p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#4b5563;">
        Someone requested a password reset for your NGO Trees account.
        Use this 6-digit code to set a new password.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <div style="display:inline-block;padding:18px 36px;background:#fef3c7;
                    border:1px solid #fcd34d;border-radius:12px;font-size:32px;
                    letter-spacing:0.4em;font-weight:700;color:#92400e;
                    font-family:'Courier New',monospace;">
          ${escapeHtml(otp)}
        </div>
      </div>
      <p style="margin:0 0 8px;font-size:14px;color:#6b7280;text-align:center;">
        This code expires in 5 minutes.
      </p>
      <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;line-height:1.5;">
        If you didn't request a password reset, you can safely ignore this email.
        Your current password remains active.
      </p>
    `,
  });
}
