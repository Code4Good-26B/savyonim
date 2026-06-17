import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "127.0.0.1",
  port: Number(process.env.SMTP_PORT ?? 54325),
  secure: false,
  ignoreTLS: true,
});

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  try {
    await transporter.sendMail({
      from: '"עמותת סביונים" <noreply@savionim.org>',
      ...opts,
    });
  } catch {
    // In local dev without SMTP enabled, silently skip
  }
}

export function approvalEmailHtml(name: string): string {
  return `<div dir="rtl" style="font-family:sans-serif;padding:24px">
    <h2>שלום ${name}</h2>
    <p>בקשתך להצטרף למערכת סביונים <strong>אושרה</strong>.</p>
    <p>תוכל/י להתחבר כעת דרך <a href="http://localhost:3000">האפליקציה</a>.</p>
  </div>`;
}

export function rejectionEmailHtml(name: string, reason?: string): string {
  return `<div dir="rtl" style="font-family:sans-serif;padding:24px">
    <h2>שלום ${name}</h2>
    <p>לצערנו, בקשתך להצטרף למערכת סביונים <strong>נדחתה</strong>.</p>
    ${reason ? `<p>סיבה: ${reason}</p>` : ""}
    <p>לשאלות, פנה/י למנהל המערכת.</p>
  </div>`;
}
