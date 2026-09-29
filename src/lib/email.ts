import nodemailer from "nodemailer";
import { z } from "zod";
import { campusEmail } from "./rules";
import { appOrigin } from "./auth";
import { serviceDatabase } from "./supabase";
import { operationalEvent } from "./observability";

export type Notification = {
  id: string;
  user_id: string;
  kind: "group_joined" | "group_left" | "report_resolved";
  subject_name: string;
  group_id: string | null;
  attempts: number;
  lease_token: string;
};

export function emailConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD &&
    z.string().email().safeParse(process.env.EMAIL_FROM).success &&
    [465, 587].includes(Number(process.env.SMTP_PORT || 587)),
  );
}

export function notificationMessage(event: Notification, origin: string) {
  const name = event.subject_name.replace(/[\r\n]+/g, " ").trim();
  switch (event.kind) {
    case "group_joined":
      return {
        subject: `You joined ${name}`,
        text: `You’re now a member of ${name} on Chambana.\n\nSee your group and its missions: ${origin}/groups/${event.group_id}\n\n— Chambana`,
      };
    case "group_left":
      return {
        subject: `You left ${name}`,
        text: `You’ve left ${name} on Chambana. You no longer have access to its group missions. Your past submissions and earned points remain recorded.\n\nFind your groups: ${origin}/groups?mode=mine\n\n— Chambana`,
      };
    case "report_resolved":
      return {
        subject: `Your report about ${name} is resolved`,
        text: `Chambana’s admins have marked your report about ${name} as resolved. Thank you for helping look after the community.\n\nFor further concerns, visit ${origin}/guidelines.\n\n— Chambana`,
      };
    default:
      throw new Error("Unknown notification type");
  }
}

export async function deliverNotifications() {
  // Do not claim work until credentials are available; pending events stay durable.
  if (!emailConfigured()) return { sent: 0, failed: 0, configured: false };
  const db = serviceDatabase();
  const { data, error } = await db.rpc("claim_email_notifications", {
    p_limit: 5,
  });
  if (error) throw new Error("Email queue unavailable");
  const origin = appOrigin();
  const sender = process.env.EMAIL_FROM!;
  const port = Number(process.env.SMTP_PORT || 587);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  const results = await Promise.all(
    (data as Notification[]).map(async (event) => {
      let sent = false;
      try {
        const account = await db.auth.admin.getUserById(event.user_id);
        const user = account.data.user;
        if (
          account.error ||
          !user?.email_confirmed_at ||
          !campusEmail.safeParse(user.email).success
        )
          throw new Error("Recipient unavailable");
        const result = await transport.sendMail({
          from: { name: "Chambana", address: sender },
          to: user.email,
          messageId: `<chambana-${event.id}@${sender.split("@")[1]}>`,
          ...notificationMessage(event, origin),
        });
        if (!result.accepted.length || result.rejected.length)
          throw new Error("Recipient rejected");
        sent = true;
      } catch {
        operationalEvent("email_delivery_failed", event.id);
      }
      const update = await db
        .from("email_notifications")
        .update({
          ...(sent
            ? { sent_at: new Date().toISOString(), last_error: null }
            : {
                available_at: new Date(
                  Date.now() + Math.min(3600, 60 * 2 ** event.attempts) * 1000,
                ).toISOString(),
                last_error:
                  event.attempts >= 8
                    ? "delivery_exhausted"
                    : "delivery_failed",
              }),
          lease_token: null,
          lease_until: null,
        })
        .eq("id", event.id)
        .eq("lease_token", event.lease_token)
        .select("id");
      if (update.error || update.data?.length !== 1) {
        operationalEvent("email_queue_update_failed", event.id);
        return false;
      }
      return sent;
    }),
  );
  const exhausted = await db
    .from("email_notifications")
    .select("id", { count: "exact", head: true })
    .is("sent_at", null)
    .gte("attempts", 8);
  if (exhausted.error) throw new Error("Email queue unavailable");
  return {
    sent: results.filter(Boolean).length,
    failed: results.filter((ok) => !ok).length + (exhausted.count || 0),
    configured: true,
  };
}
