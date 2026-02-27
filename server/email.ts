import { Resend } from "resend";

let _resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (!_resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("RESEND_API_KEY is not set. Email functionality will be disabled.");
      return null;
    }
    _resendClient = new Resend(apiKey);
  }
  return _resendClient;
}

const FROM_EMAIL = "Tsun Brew <noreply@nottsunbrew.com>";

export async function sendVerificationEmail(to: string, code: string): Promise<boolean> {
  try {
    const resend = getResend();
    if (!resend) {
      console.error("Cannot send verification email: RESEND_API_KEY is not configured");
      return false;
    }
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Tsun Brew - Verify Your Email",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #2d5016; margin-bottom: 16px;">Welcome to Tsun Brew</h2>
          <p style="color: #333; font-size: 16px;">Your verification code is:</p>
          <div style="background: #f4f0e8; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2d5016;">${code}</span>
          </div>
          <p style="color: #666; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });
    if (error) {
      console.error("Failed to send verification email:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Error sending verification email:", err);
    return false;
  }
}

export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<boolean> {
  try {
    const resend = getResend();
    if (!resend) {
      console.error("Cannot send reset email: RESEND_API_KEY is not configured");
      return false;
    }
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Tsun Brew - Reset Your Password",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #2d5016; margin-bottom: 16px;">Reset Your Password</h2>
          <p style="color: #333; font-size: 16px;">We received a request to reset your password. Click the button below to choose a new one:</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${resetLink}" style="display: inline-block; background: #2d5016; color: #fff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-size: 16px; font-weight: bold;">Reset Password</a>
          </div>
          <p style="color: #666; font-size: 14px;">This link expires in 15 minutes. If you didn't request this, you can safely ignore this email.</p>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">If the button doesn't work, copy and paste this link into your browser:<br/><a href="${resetLink}" style="color: #2d5016; word-break: break-all;">${resetLink}</a></p>
        </div>
      `,
    });
    if (error) {
      console.error("Failed to send reset email:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Error sending reset email:", err);
    return false;
  }
}
