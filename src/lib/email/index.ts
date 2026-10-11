/**
 * Pluggable email sender.
 * - RESEND_API_KEY set: sends through Resend's HTTP API.
 * - SMTP_URL set (smtp://user:pass@host:587): sends through SMTP via nodemailer.
 * - Neither: logs the message to the server console (local development).
 */

export type Email = { to: string; subject: string; text: string; html?: string };

export function emailMode(env: Record<string, string | undefined> = process.env): "resend" | "smtp" | "console" {
  if (env.RESEND_API_KEY?.trim()) return "resend";
  if (env.SMTP_URL?.trim()) return "smtp";
  return "console";
}

function fromAddress() {
  return process.env.EMAIL_FROM || "JobPilot AI <no-reply@example.com>";
}

export async function sendEmail(message: Email): Promise<{ delivered: boolean; mode: string }> {
  const mode = emailMode();
  if (mode === "resend") {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: fromAddress(), to: [message.to], subject: message.subject, text: message.text, html: message.html }),
    });
    if (!response.ok) throw new Error(`Email provider rejected the message (${response.status}).`);
    return { delivered: true, mode };
  }
  if (mode === "smtp") {
    const nodemailer = await import("nodemailer");
    const transport = nodemailer.createTransport(process.env.SMTP_URL as string);
    await transport.sendMail({ from: fromAddress(), ...message });
    return { delivered: true, mode };
  }
  console.info(`[email:console] to=${message.to} subject="${message.subject}"\n${message.text}`);
  return { delivered: false, mode };
}
