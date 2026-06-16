import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let resendClient = null;
let transporter = null;

function getResendClient() {
  if (!resendClient) resendClient = new Resend(env.RESEND_API_KEY);
  return resendClient;
}

function getTransporter() {
  if (transporter) return transporter;

  if (!env.MAIL_HOST) {
    transporter = nodemailer.createTransport({ jsonTransport: true });
    transporter._isConsoleFallback = true;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: env.MAIL_HOST,
    port: env.MAIL_PORT,
    secure: env.MAIL_PORT === 465,
    auth:
      env.MAIL_USER && env.MAIL_PASS
        ? { user: env.MAIL_USER, pass: env.MAIL_PASS }
        : undefined,
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
  });
  return transporter;
}

function fromHeader() {
  const email = env.MAIL_FROM_EMAIL || env.MAIL_USER || 'no-reply@angio.local';
  return `"${env.MAIL_FROM_NAME}" <${email}>`;
}

// RFC 2606 reserved TLDs + the de-facto `.local` used for mDNS. Any
// email to a domain ending in one of these never hits SMTP — instead
// we log it loudly so a developer can read the OTP straight from the
// server console. Lets dev testing run with seeded "fake" users
// without bouncing real Gmail / wasting SMTP quota.
const TEST_TLDS = ['.test', '.example', '.invalid', '.localhost', '.local'];
function isTestRecipient(to) {
  const addr = String(to).toLowerCase();
  return TEST_TLDS.some((tld) => addr.endsWith(tld));
}

// Pulls the 6-digit OTP and any 12-char temp password out of the
// rendered HTML so the console fallback log can show them as structured
// fields, not just a wall of HTML.
//
// We must strip HTML tags BEFORE searching for the OTP — otherwise CSS
// hex colors like `color:#047857` (a 6-digit all-numeric hex) match the
// `\b\d{6}\b` pattern earlier than the real code and produce a wrong
// "OTP" in the console.
function extractMailHints(html) {
  const visibleText = html.replace(/<[^>]+>/g, ' ');
  const otp = visibleText.match(/\b\d{6}\b/)?.[0];
  const tempPassword = html.match(/temp[\s-]password[^<]*<[^>]+>([^<]+)</i)?.[1]?.trim();
  return { otp, tempPassword };
}

function logToConsole({ to, subject, html, reason }) {
  const { otp, tempPassword } = extractMailHints(html);
  const banner = otp
    ? `========== ${reason}  OTP: ${otp}  →  ${to} ==========`
    : tempPassword
      ? `========== ${reason}  TEMP PASSWORD: ${tempPassword}  →  ${to} ==========`
      : `========== ${reason}  →  ${to} ==========`;
  logger.warn(
    {
      mailTo: to,
      subject,
      otp,
      tempPassword,
      previewBody:
        otp || tempPassword
          ? undefined
          : html.replace(/<[^>]+>/g, '').slice(0, 200),
    },
    banner,
  );
}

export async function sendMail({ to, subject, html }) {
  // Test-domain recipients skip every provider and dump to the console
  // so seeded dev users can sign in without a real inbox.
  if (isTestRecipient(to)) {
    logToConsole({ to, subject, html, reason: 'DEV TEST EMAIL' });
    return { __testEmail: true };
  }
  try {
    if (env.RESEND_API_KEY) {
      const client = getResendClient();
      const fromEmail = env.MAIL_FROM_EMAIL || 'noreply@angio.local';
      const { data, error } = await client.emails.send({
        from: `${env.MAIL_FROM_NAME} <${fromEmail}>`,
        to: [to],
        subject,
        html,
      });
      if (error) {
        logger.error({ err: error, to, subject }, 'resend mail failed');
        return null;
      }
      logger.info({ subject, messageId: data.id }, 'mail sent via resend');
      return data;
    }

    const t = getTransporter();
    const info = await t.sendMail({ from: fromHeader(), to, subject, html });

    if (t._isConsoleFallback) {
      logToConsole({ to, subject, html, reason: 'CONSOLE FALLBACK' });
    } else {
      logger.info({ subject, messageId: info.messageId }, 'mail sent');
    }
    return info;
  } catch (err) {
    logger.error({ err, to, subject }, 'mail send failed');
    return null;
  }
}
