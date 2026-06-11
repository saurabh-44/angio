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

export async function sendMail({ to, subject, html }) {
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
      const otpMatch = html.match(/\b\d{6}\b/);
      const tempPwMatch = html.match(/temp[\s-]password[^<]*<[^>]+>([^<]+)</i);
      logger.info(
        {
          mailTo: to,
          subject,
          otp: otpMatch ? otpMatch[0] : undefined,
          tempPassword: tempPwMatch ? tempPwMatch[1].trim() : undefined,
          previewBody:
            otpMatch || tempPwMatch
              ? undefined
              : html.replace(/<[^>]+>/g, '').slice(0, 200),
        },
        otpMatch
          ? '[mail console fallback] OTP — copy this into the UI'
          : tempPwMatch
            ? '[mail console fallback] temporary password — share with the new user'
            : '[mail console fallback] (set RESEND_API_KEY or MAIL_HOST in .env to send real emails)',
      );
    } else {
      logger.info({ subject, messageId: info.messageId }, 'mail sent');
    }
    return info;
  } catch (err) {
    logger.error({ err, to, subject }, 'mail send failed');
    return null;
  }
}
