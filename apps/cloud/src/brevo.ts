import type { Env } from './env';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/gu, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

export async function sendPasswordResetEmail(env: Env, to: string, resetUrl: string): Promise<void> {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { email: env.BREVO_FROM_EMAIL, name: 'Peanut' },
      to: [{ email: to }],
      subject: 'Reset your Peanut password',
      textContent: `Reset your Peanut password using this secure link: ${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
      htmlContent: `<div style="font-family:Arial,sans-serif;color:#321065;line-height:1.6"><h1 style="margin-bottom:8px">Reset your Peanut password</h1><p>Use the button below to choose a new password.</p><p style="margin:28px 0"><a href="${escapeHtml(resetUrl)}" style="background:#7c19f5;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:700">Reset password</a></p><p style="font-size:13px;color:#76658f">If you did not request this, you can safely ignore this email.</p></div>`,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error('Brevo password reset delivery failed', response.status, detail.slice(0, 500));
    throw new Error('Password reset email delivery failed.');
  }
}
