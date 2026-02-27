// Email sending is disabled until RESEND_API_KEY is configured.
// To enable, install resend and update this file.

export async function sendVerificationEmail(to: string, code: string): Promise<boolean> {
  console.warn(`[email] Verification email to ${to} skipped (Resend not configured). Code: ${code}`);
  return true;
}

export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<boolean> {
  console.warn(`[email] Password reset email to ${to} skipped (Resend not configured). Link: ${resetLink}`);
  return true;
}
