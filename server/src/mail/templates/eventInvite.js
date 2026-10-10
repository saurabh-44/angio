import { escapeHtml, shellTemplate } from './_shared.js';

const GREEN = 'linear-gradient(135deg,#0B5000 0%,#001F00 100%)';

function detailsBlock({ eventName, siteLabel, dateLabel, time, note }) {
  return `
      <div style="margin:24px 0;padding:16px 20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;">
        <div style="font-size:17px;font-weight:700;color:#001F00;margin-bottom:10px;">${escapeHtml(eventName)}</div>
        <div style="font-size:14px;color:#14532d;line-height:1.7;">
          <strong>Where:</strong> ${escapeHtml(siteLabel)}<br />
          <strong>When:</strong> ${escapeHtml(dateLabel)} at ${escapeHtml(time)}
        </div>
        ${note ? `<div style="font-size:14px;color:#374151;margin-top:10px;line-height:1.5;">${escapeHtml(note)}</div>` : ''}
      </div>`;
}

export function eventInviteTemplate({ name, eventName, siteLabel, dateLabel, time, note, url, canRespond }) {
  return shellTemplate({
    headerTitle: 'New volunteering event',
    headerGradient: GREEN,
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Hi ${escapeHtml(name ?? 'there')},</p>
      <p style="margin:0;font-size:15px;line-height:1.5;color:#4b5563;">
        A new event has been posted on Environ.${
          canRespond ? ' Open the app to accept or decline the request.' : ''
        }
      </p>
      ${detailsBlock({ eventName, siteLabel, dateLabel, time, note })}
      <p style="text-align:center;margin:28px 0 8px;">
        <a href="${escapeHtml(url)}"
           style="display:inline-block;background:#0B5000;color:#ffffff;
                  text-decoration:none;font-weight:600;padding:12px 28px;
                  border-radius:10px;font-size:15px;">
          ${canRespond ? 'Respond in Environ' : 'View in Environ'}
        </a>
      </p>
    `,
  });
}

export function eventCancelledTemplate({ name, eventName, siteLabel, dateLabel, time }) {
  return shellTemplate({
    headerTitle: 'Event cancelled',
    headerGradient: 'linear-gradient(135deg,#6b7280 0%,#374151 100%)',
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Hi ${escapeHtml(name ?? 'there')},</p>
      <p style="margin:0;font-size:15px;line-height:1.5;color:#4b5563;">
        An event you signed up for has been cancelled. Thank you for offering your time.
      </p>
      ${detailsBlock({ eventName, siteLabel, dateLabel, time })}
    `,
  });
}
