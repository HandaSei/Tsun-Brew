import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = "Tsun Brew <noreply@nottsunbrew.com>";

export async function sendVerificationEmail(to: string, code: string): Promise<boolean> {
  try {
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

export async function sendPasswordRecoveryEmail(to: string, username: string, newPassword: string): Promise<boolean> {
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Tsun Brew - Account Recovery",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #2d5016; margin-bottom: 16px;">Account Recovery</h2>
          <p style="color: #333; font-size: 16px;">Here are your account details:</p>
          <div style="background: #f4f0e8; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <p style="margin: 8px 0; font-size: 15px;"><strong>Username:</strong> ${username}</p>
            <p style="margin: 8px 0; font-size: 15px;"><strong>Temporary Password:</strong> ${newPassword}</p>
          </div>
          <p style="color: #666; font-size: 14px;">Please log in and change your password as soon as possible.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this, please contact an administrator immediately.</p>
        </div>
      `,
    });
    if (error) {
      console.error("Failed to send recovery email:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Error sending recovery email:", err);
    return false;
  }
}
