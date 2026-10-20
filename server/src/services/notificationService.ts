/**
 * Stubbed notification providers.
 * Replace with real email/SMS integrations later — do not call providers from controllers.
 */

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    console.info(`[stub:email] password reset for ${email} token=${resetToken.slice(0, 8)}…`);
  }
}

export async function sendEmailVerification(email: string, token: string): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    console.info(`[stub:email] verify email for ${email} token=${token.slice(0, 8)}…`);
  }
}

export async function sendPhoneVerificationSms(phone: string, code: string): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    console.info(`[stub:sms] verify phone for ${phone} code=${code}`);
  }
}
