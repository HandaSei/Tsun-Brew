// Email functionality is disabled until RESEND_API_KEY is configured.
// All email functions are no-ops that log warnings instead of sending.

const FROM_EMAIL = "Tsun Brew <noreply@nottsunbrew.com>";

export async function sendVerificationEmail(to: string, code: string): Promise<boolean> {
  console.warn("[email] RESEND_API_KEY not configured. Verification email NOT sent to:", to, "Code:", code);
  return true;
}

export async function sendPasswordResetEmail(to: string, code: string): Promise<boolean> {
  console.warn("[email] RESEND_API_KEY not configured. Password reset email NOT sent to:", to, "Code:", code);
  return true;
}
