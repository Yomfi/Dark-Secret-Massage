/**
 * Legacy Node stubs only. Production transactional email is delivered by the
 * PHP API (public/api/config/mailer.php + PHPMailer). Do not wire SMTP here.
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
