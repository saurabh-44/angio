export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c] ?? c);
}

export function shellTemplate({ headerTitle, headerGradient, bodyHtml }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(headerTitle)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
          style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;
                 box-shadow:0 1px 3px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:${headerGradient};padding:24px;color:#ffffff;">
              <div style="font-size:20px;font-weight:700;color:#ffffff;">NGO Trees</div>
              <div style="font-size:22px;font-weight:600;margin-top:12px;">${escapeHtml(headerTitle)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px;">${bodyHtml}</td>
          </tr>
          <tr>
            <td style="padding:16px 28px;background:#f9fafb;color:#9ca3af;font-size:12px;
                       text-align:center;border-top:1px solid #f3f4f6;">
              &copy; ${new Date().getFullYear()} NGO Trees
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
