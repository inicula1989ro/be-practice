import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// Ethereal's createTestAccount() spins up a fresh fake SMTP inbox on
// demand — no signup, no API key. We create one lazily on first use and
// cache the transporter, rather than generating a brand new throwaway
// account on every single email.
let transporterPromise: Promise<Transporter> | null = null;

function getTransporter(): Promise<Transporter> {
  if (!transporterPromise) {
    transporterPromise = nodemailer.createTestAccount().then((testAccount) =>
      nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: { user: testAccount.user, pass: testAccount.pass },
      }),
    );
  }
  return transporterPromise;
}

export async function sendActivationEmail(to: string, activationUrl: string): Promise<void> {
  const transporter = await getTransporter();

  const info = await transporter.sendMail({
    from: '"Corner Store" <no-reply@cornerstore.test>',
    to,
    subject: 'Activate your account',
    html: `<p>Click below to activate your account:</p><p><a href="${activationUrl}">${activationUrl}</a></p>`,
  });

  // Ethereal never delivers anywhere real — this logged URL is the only
  // place the "sent" email actually exists. Open it in a browser to see it.
  console.log('Activation email preview:', nodemailer.getTestMessageUrl(info));
}