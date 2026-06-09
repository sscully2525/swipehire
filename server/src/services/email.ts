import axios from 'axios';
import { logger } from '../logger';

/**
 * Transactional email via the Resend REST API (no SDK dependency).
 *
 * Best-effort by design: if RESEND_API_KEY is unset (local dev) we log and
 * skip; if the API call fails we log and move on. Email must never break the
 * request that triggered it.
 *
 * Env:
 *   RESEND_API_KEY  — from https://resend.com/api-keys
 *   EMAIL_FROM      — verified sender, e.g. "Gigly <hello@yourdomain.com>".
 *                     Defaults to Resend's shared onboarding sender, which
 *                     only delivers to the account owner's own address —
 *                     fine for testing, set a real domain before launch.
 */
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Gigly <onboarding@resend.dev>';

interface EmailInput {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async ({ to, subject, html }: EmailInput): Promise<boolean> => {
  if (!RESEND_API_KEY) {
    logger.info({ to, subject }, 'Email skipped (RESEND_API_KEY not set)');
    return false;
  }
  try {
    await axios.post(
      'https://api.resend.com/emails',
      { from: EMAIL_FROM, to, subject, html },
      { headers: { Authorization: `Bearer ${RESEND_API_KEY}` }, timeout: 8000 }
    );
    logger.info({ to, subject }, 'Email sent');
    return true;
  } catch (err: any) {
    logger.error({ to, subject, err: err.response?.data || err.message }, 'Email send failed');
    return false;
  }
};

// ---------------------------------------------------------------------------
// Templates — minimal inline-styled HTML that renders everywhere.

const shell = (title: string, body: string) => `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
    <div style="font-size:22px;font-weight:800;margin-bottom:24px;">Gig<span style="color:#2563eb;">ly</span></div>
    <h1 style="font-size:19px;margin:0 0 12px;">${title}</h1>
    <div style="font-size:15px;line-height:1.6;color:#334155;">${body}</div>
    <p style="font-size:12px;color:#94a3b8;margin-top:32px;">
      You're receiving this because you have a Gigly account. Payments on Gigly are arranged directly between clients and freelancers.
    </p>
  </div>`;

export const sendPasswordResetEmail = (to: string, code: string) =>
  sendEmail({
    to,
    subject: 'Your Gigly password reset code',
    html: shell(
      'Reset your password',
      `<p>Use this code to reset your password. It expires in 15 minutes.</p>
       <p style="font-size:28px;font-weight:800;letter-spacing:6px;background:#f1f5f9;border-radius:12px;padding:14px 0;text-align:center;">${code}</p>
       <p>If you didn't request this, you can safely ignore this email.</p>`
    ),
  });

export const sendBidAcceptedEmail = (to: string, gigTitle: string, appUrl: string) =>
  sendEmail({
    to,
    subject: `Your bid on "${gigTitle}" was accepted 🎉`,
    html: shell(
      'Your bid was accepted!',
      `<p>The client accepted your bid on <strong>${gigTitle}</strong>. The chat is open — head over to agree on details and get started.</p>
       <p><a href="${appUrl}/matches" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;border-radius:10px;padding:10px 20px;">Open the chat</a></p>`
    ),
  });

export const sendBidDeclinedEmail = (to: string, gigTitle: string, appUrl: string) =>
  sendEmail({
    to,
    subject: `Update on your bid for "${gigTitle}"`,
    html: shell(
      'Your bid was declined',
      `<p>The client went another way on <strong>${gigTitle}</strong>. It happens — there are more gigs waiting.</p>
       <p><a href="${appUrl}/swipe" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;border-radius:10px;padding:10px 20px;">Find your next gig</a></p>`
    ),
  });

export const sendNewBidEmail = (
  to: string,
  gigTitle: string,
  bidderName: string,
  amountLabel: string,
  appUrl: string
) =>
  sendEmail({
    to,
    subject: `New bid on "${gigTitle}": ${amountLabel}`,
    html: shell(
      'You have a new bid',
      `<p><strong>${bidderName}</strong> bid <strong>${amountLabel}</strong> on your gig <strong>${gigTitle}</strong>.</p>
       <p><a href="${appUrl}/recruiter/dashboard" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;border-radius:10px;padding:10px 20px;">Review bids</a></p>`
    ),
  });
