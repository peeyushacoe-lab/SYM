// Transactional email via Resend's REST API (https://resend.com). Uses plain
// fetch rather than their SDK — one less dependency, and Resend's API is a
// single simple POST endpoint anyway.
//
// Required env vars:
//   RESEND_API_KEY    - from the Resend dashboard
//   RESEND_FROM_EMAIL - a verified sender, e.g. "SYM <noreply@yourdomain.com>".
//                        Falls back to Resend's shared onboarding@resend.dev
//                        sender, which works without domain verification but
//                        can only be limited/rate-capped by Resend — verify
//                        your own domain in Resend once you're past testing.
//
// If RESEND_API_KEY is not set, sendEmail() logs a warning and returns
// { ok: false, skipped: true } instead of throwing — callers should still
// return the generated credentials in the API response so the account-
// creation flow isn't blocked on email being configured yet.

const RESEND_API_URL = 'https://api.resend.com/emails';

export interface SendEmailResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY not set — skipping email to ${opts.to} ("${opts.subject}")`);
    return { ok: false, skipped: true };
  }
  const from = process.env.RESEND_FROM_EMAIL || 'SYM <onboarding@resend.dev>';

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[email] Resend API error ${res.status} sending to ${opts.to}: ${body}`);
      return { ok: false, error: `Resend API error ${res.status}` };
    }
    return { ok: true };
  } catch (err: any) {
    console.error(`[email] Failed to send to ${opts.to}:`, err?.message || err);
    return { ok: false, error: err?.message || 'Unknown error sending email' };
  }
}

function credentialsEmailHtml(opts: {
  greetingName: string;
  institute: string;
  role: string;
  username: string;
  password: string;
  loginUrl: string;
}): string {
  return `<!DOCTYPE html><html><body style="font-family: -apple-system, Arial, sans-serif; color: #0c1c2e; max-width: 480px; margin: 0 auto; padding: 24px;">
    <h2 style="margin: 0 0 4px;">Welcome to SYM</h2>
    <p style="color: #444748; font-size: 14px; margin: 0 0 20px;">${opts.institute}</p>
    <p>Hi ${opts.greetingName},</p>
    <p>Your ${opts.role} account has been created. Here are your login details:</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
      <tr><td style="padding: 8px; color: #444748; border-bottom: 1px solid #dbe6f7;">Username</td>
          <td style="padding: 8px; border-bottom: 1px solid #dbe6f7;"><b>${opts.username}</b></td></tr>
      <tr><td style="padding: 8px; color: #444748;">Password</td>
          <td style="padding: 8px;"><b>${opts.password}</b></td></tr>
    </table>
    <p><a href="${opts.loginUrl}" style="display: inline-block; background: #2c6291; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">Log in to SYM</a></p>
    <p style="font-size: 13px; color: #444748;">For your security, please change this password after your first login (Settings &rarr; My account).</p>
  </body></html>`;
}

export async function sendCredentialsEmail(opts: {
  to: string;
  greetingName: string;
  institute: string;
  role: string;
  username: string;
  password: string;
  loginUrl?: string;
}): Promise<SendEmailResult> {
  const loginUrl = opts.loginUrl || process.env.APP_URL || 'https://sym-navy.vercel.app';
  return sendEmail({
    to: opts.to,
    subject: `Your ${opts.institute} SYM account is ready`,
    html: credentialsEmailHtml({ ...opts, loginUrl }),
  });
}
