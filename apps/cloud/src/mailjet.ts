import type { Env } from './env';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/gu, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

export async function sendPasswordResetEmail(env: Env, to: string, resetUrl: string): Promise<void> {
  const response = await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${env.MAILJET_API_KEY}:${env.MAILJET_SECRET_KEY}`)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      Messages: [{
        From: { Email: env.MAILJET_FROM_EMAIL, Name: 'Peanut' },
        To: [{ Email: to }],
        Subject: 'Reset your Peanut password',
        TextPart: `Reset your Peanut password using this secure link: ${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
        HTMLPart: `<div style="font-family:Arial,sans-serif;color:#321065;line-height:1.6"><h1 style="margin-bottom:8px">Reset your Peanut password</h1><p>Use the button below to choose a new password.</p><p style="margin:28px 0"><a href="${escapeHtml(resetUrl)}" style="background:#7c19f5;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:700">Reset password</a></p><p style="font-size:13px;color:#76658f">If you did not request this, you can safely ignore this email.</p></div>`,
      }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error('Mailjet password reset delivery failed', response.status, detail.slice(0, 500));
    throw new Error('Password reset email delivery failed.');
  }
}
