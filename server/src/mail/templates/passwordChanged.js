import { escapeHtml, shellTemplate } from './_shared.js';

export function passwordChangedTemplate({ name, when }) {
  return shellTemplate({
    headerTitle: 'Password changed',
    headerGradient: 'linear-gradient(135deg,#10b981 0%,#047857 100%)',
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">
        Hi ${escapeHtml(name ?? 'there')},
      </p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#4b5563;">
        Your NGO Trees password was changed on
        <strong>${escapeHtml(when)}</strong>. If this was you, no action is needed.
      </p>
      <div style="padding:14px 18px;background:#fef2f2;border:1px solid #fecaca;
                  border-radius:8px;font-size:14px;color:#991b1b;">
        <strong>Didn't change your password?</strong><br />
        Someone may have accessed your account. Reset your password immediately
        using the "Forgot password" flow.
      </div>
    `,
  });
}
