// Sends the "forgot password" code to the user.
// ⚠️ No email service is plugged in yet: the code is printed in the server terminal (development only).
// To go live: call your email service's API here (Brevo, Resend, Mailjet…) with its key from .env.
export function sendResetCode(email: string, code: string) {
  console.log(`🔑 Reset code for ${email}: ${code} (valid 15 minutes)`);
  return Promise.resolve();
}
