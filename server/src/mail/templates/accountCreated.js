import { escapeHtml, shellTemplate } from './_shared.js';

const ROLE_LABELS = {
  ngo_admin: 'NGO Admin',
  sponsor: 'Sponsor',
  site_owner: 'Site Owner',
  volunteer: 'Volunteer',
};

export function accountCreatedTemplate({ name, role, email, tempPassword, signInUrl }) {
  return shellTemplate({
    headerTitle: 'Welcome to NGO Trees',
    headerGradient: 'linear-gradient(135deg,#0ea5e9 0%,#0369a1 100%)',
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">
        Hi ${escapeHtml(name ?? 'there')},
      </p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#4b5563;">
        An NGO Trees account has been created for you as
        <strong>${escapeHtml(ROLE_LABELS[role] ?? role)}</strong>. Use the temporary
        password below to sign in. You'll be asked to choose your own password right
        after.
      </p>
      <div style="margin:24px 0;padding:16px 20px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;">
        <div style="font-size:13px;color:#0369a1;margin-bottom:6px;">Email</div>
        <div style="font-size:15px;font-weight:600;color:#0c4a6e;margin-bottom:14px;">${escapeHtml(email)}</div>
        <div style="font-size:13px;color:#0369a1;margin-bottom:6px;">Temporary password</div>
        <div style="font-family:'Courier New',monospace;font-size:18px;font-weight:700;color:#0c4a6e;letter-spacing:0.05em;">${escapeHtml(tempPassword)}</div>
      </div>
      <p style="text-align:center;margin:28px 0 8px;">
        <a href="${escapeHtml(signInUrl)}"
           style="display:inline-block;background:#0ea5e9;color:#ffffff;
                  text-decoration:none;font-weight:600;padding:12px 28px;
                  border-radius:10px;font-size:15px;">
          Sign in to NGO Trees
        </a>
      </p>
      <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;line-height:1.5;">
        For your security, the temporary password works only once &mdash; after you
        change it, this email's password no longer signs you in.
      </p>
    `,
  });
}
