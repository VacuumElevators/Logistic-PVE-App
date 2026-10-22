import nodemailer from "nodemailer";

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  cachedTransporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  return cachedTransporter;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM ?? "PVE Portal <no-reply@pve-portal.local>";
  if (!transporter) {
    console.info("[email] SMTP not configured. Would have sent:", {
      from,
      ...params,
    });
    return;
  }
  await transporter.sendMail({ from, ...params });
}

export function renderOrderEmail(opts: {
  orderNumber: string;
  status: string;
  recipientName: string;
}): { subject: string; html: string } {
  return {
    subject: `Order ${opts.orderNumber} — ${opts.status}`,
    html: `
      <div style="font-family:Inter,sans-serif;color:#111;">
        <h2>Hello ${opts.recipientName},</h2>
        <p>Your order <strong>${opts.orderNumber}</strong> is now
          <strong>${opts.status}</strong>.</p>
        <p>You can review details in the PVE Logistics Portal.</p>
        <p style="color:#666;font-size:12px;">— PVE Logistics</p>
      </div>
    `,
  };
}
