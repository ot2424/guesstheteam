import 'dotenv/config';
import nodemailer from 'nodemailer';
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  requireTLS: process.env.SMTP_SECURE !== 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
});
try {
  await transporter.verify();
  console.log('SMTP connection and authentication succeeded. No email sent.');
} catch (error) {
  console.error(`SMTP verification failed: ${error.code ?? 'unknown'}${error.responseCode ? ` (SMTP ${error.responseCode})` : ''}. No credentials printed.`);
  process.exitCode = 1;
} finally { transporter.close(); }
