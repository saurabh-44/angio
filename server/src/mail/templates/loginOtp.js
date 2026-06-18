import { escapeHtml, shellTemplate } from './_shared.js';

export function loginOtpTemplate({ otp, name }) {
  return shellTemplate({
    headerTitle: 'Your sign-in code',
    headerGradient: 'linear-gradient(135deg,#16a34a 0%,#047857 100%)',
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">
        Hi ${escapeHtml(name ?? 'there')},
      </p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#4b5563;">
        Use this 6-digit code to finish signing in to Environ.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <div style="display:inline-block;padding:18px 36px;background:#ecfdf5;
                    border:1px solid #6ee7b7;border-radius:12px;font-size:32px;
                    letter-spacing:0.4em;font-weight:700;color:#047857;
                    font-family:'Courier New',monospace;">
          ${escapeHtml(otp)}
        </div>
      </div>
      <p style="margin:0 0 8px;font-size:14px;color:#6b7280;text-align:center;">
        This code expires in 5 minutes.
      </p>
      <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;line-height:1.5;">
        If you didn't try to sign in, ignore this email and consider changing your
        password &mdash; someone has your current one.
      </p>
    `,
  });
}
