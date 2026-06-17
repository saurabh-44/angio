import { escapeHtml, shellTemplate } from './_shared.js';

export function donationReceivedTemplate({ name, amount, currency = 'INR', treeCount, paymentId }) {
  return shellTemplate({
    headerTitle: 'Thank you for sponsoring trees',
    headerGradient: 'linear-gradient(135deg,#059669 0%,#047857 100%)',
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">
        Hi ${escapeHtml(name ?? 'friend')},
      </p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#4b5563;">
        We've received your donation of
        <strong>${escapeHtml(currency)} ${escapeHtml(String(amount))}</strong>
        to sponsor <strong>${escapeHtml(String(treeCount))}</strong> ${treeCount === 1 ? 'tree' : 'trees'}.
        We'll allocate your contribution across our active planting sites and you'll see every
        tree appear on your dashboard with GPS + photo proof as our volunteers put them in the
        soil.
      </p>
      <div style="margin:24px 0;padding:16px 20px;background:#ecfdf5;border:1px solid #6ee7b7;border-radius:10px;">
        <div style="font-size:13px;color:#047857;margin-bottom:6px;">Payment reference</div>
        <div style="font-family:'Courier New',monospace;font-size:13px;font-weight:600;color:#064e3b;">${escapeHtml(paymentId ?? '')}</div>
      </div>
      <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;line-height:1.5;">
        You'll get weekly maintenance photos for every tree once they're planted. Sign in to
        your dashboard any time to see the live progress.
      </p>
    `,
  });
}
