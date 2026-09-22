"use server";

import { randomUUID, createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { database, serviceDatabase, isConfigured } from "@/lib/supabase";
import {
  campusEmail,
  groupSchema,
  MAX_PHOTO_BYTES,
  profileSchema,
} from "@/lib/rules";
import { verifySubmission } from "@/lib/verification";
import { safePath, withNotice } from "@/lib/paths";
import { appOrigin, microsoftEnabled, microsoftOptions } from "@/lib/auth";
import { allowRequest } from "@/lib/rate-limit";
import { normalizePhoto } from "@/lib/photos";
import { operationalEvent } from "@/lib/observability";

const value = (form: FormData, key: string) => String(form.get(key) ?? "");
const uuid = (form: FormData, key: string) =>
  z.string().uuid().parse(value(form, key));
function message(error: unknown) {
  if (error instanceof z.ZodError)
    return error.issues[0]?.message || "Please check the form.";
  if (error instanceof Error) return error.message.slice(0, 240);
  return "That action could not finish. Please try again.";
}

export async function signIn(form: FormData) {
  if (!isConfigured()) redirect("/login?error=The+beta+is+not+connected+yet.");
  const db = await database();
  const origin = appOrigin();
  const next = safePath(value(form, "next") || "/missions");
  if (value(form, "method") === "microsoft") {
    if (!microsoftEnabled())
      redirect(
        "/login?error=Microsoft+sign-in+is+not+available.+Use+an+email+link.",
      );
    const { data, error } = await db.auth.signInWithOAuth(
      microsoftOptions(next),
    );
    if (error || !data.url)
      redirect(
        "/login?error=Microsoft+sign-in+is+not+available.+Try+your+campus+email.",
      );
    redirect(data.url);
  }
  const email = campusEmail.safeParse(value(form, "email"));
  if (!email.success) redirect("/login?error=Use+your+%40illinois.edu+email.");
  if (
    !(await allowRequest("email", email.data, 3, 300)) ||
    !(await allowRequest("email-global", "all", 30, 60))
  )
    redirect(
      "/login?error=Please+wait+a+few+minutes+before+requesting+another+link.",
    );
  const { error } = await db.auth.signInWithOtp({
    email: email.data,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  redirect(
    error
      ? "/login?error=Could+not+send+the+link.+Try+again+later."
      : "/login?message=Check+your+Illinois+inbox+for+your+sign-in+link.",
  );
}
export async function signOut() {
  const db = await database();
  await db.auth.signOut();
  redirect("/");
}

export async function mutate(form: FormData) {
  let destination = safePath(value(form, "back"));
  let notice = "Saved.";
  let failure = "";
  try {
    const db = await database();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (
      !user ||
      !user.email_confirmed_at ||
      !campusEmail.safeParse(user.email).success
    )
      throw new Error("Sign in with a verified @illinois.edu email first.");
    if (!(await allowRequest("mutation", user.id, 60, 60)))
      throw new Error("Too many requests. Please wait a minute and try again.");
    const rpc = async (name: string, params: Record<string, unknown> = {}) => {
      const { data, error } = await db.rpc(name, params);
      if (error) throw new Error(error.message);
      return data;
    };
    switch (value(form, "action")) {
      case "create_group": {
        const group = groupSchema.parse({
          name: value(form, "name"),
          description: value(form, "description"),
          join_mode: value(form, "join_mode"),
          organization: value(form, "organization"),
          category_ids: form.getAll("category_ids"),
        });
        const id = await rpc("create_group", {
          p_name: group.name,
          p_description: group.description,
          p_join_mode: group.join_mode,
          p_organization: group.organization,
          p_categories: group.category_ids,
        });
        destination = `/groups/${id}`;
        notice = "Your group is ready.";
        break;
      }
      case "join_group": {
        const status = await rpc("join_group", {
          p_group: uuid(form, "group_id"),
          p_code: value(form, "code") || null,
        });
        notice =
          status === "pending"
            ? "Join request sent to the organizer."
            : "You joined the group.";
        break;
      }
      case "join_code": {
        const id = await rpc("join_by_code", {
          p_code: z.string().trim().min(1).max(40).parse(value(form, "code")),
        });
        destination = `/groups/${id}`;
        notice =
          "Invitation accepted. Organization groups require organizer approval.";
        break;
      }
      case "create_invite": {
        const code = await rpc("create_invite", {
          p_group: uuid(form, "group_id"),
        });
        notice = `Invite link (valid 7 days): ${process.env.APP_URL || "http://localhost:3000"}/join?code=${code}`;
        break;
      }
      case "review_member":
        await rpc("review_member", {
          p_group: uuid(form, "group_id"),
          p_user: uuid(form, "user_id"),
          p_approve: value(form, "approve") === "true",
        });
        break;
      case "refresh":
        await rpc("refresh_missions", { p_group: uuid(form, "group_id") });
        notice =
          "Mission slots checked. Cooldowns and available challenges still apply.";
        break;
      case "decline":
        await rpc("decline_mission", {
          p_assignment: uuid(form, "assignment_id"),
        });
        notice =
          "Mission declined. Your group must wait until its replacement time.";
        break;
      case "profile": {
        const profile = profileSchema.parse({
          display_name: value(form, "display_name"),
          bio: value(form, "bio"),
        });
        const { error } = await db
          .from("profiles")
          .update(profile)
          .eq("id", user.id);
        if (error) throw new Error("Could not update your profile.");
        break;
      }
      case "photo": {
        if (value(form, "consent") !== "yes")
          throw new Error("Please agree to send this photo for AI review.");
        const file = form.get("photo");
        if (
          !(file instanceof File) ||
          !file.size ||
          file.size > MAX_PHOTO_BYTES
        )
          throw new Error("Choose a photo smaller than 8 MB.");
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
          throw new Error(
            "Use a JPG, PNG, or WebP photo. Convert HEIC photos to JPG first.",
          );
        const id = randomUUID();
        const assignment = uuid(form, "assignment_id");
        const service = serviceDatabase();
        const path = await rpc("begin_submission", {
          p_assignment: assignment,
          p_submission: id,
        });
        try {
          // Reserve/authorize first, before spending CPU decoding arbitrary bytes.
          const image = await normalizePhoto(
            Buffer.from(await file.arrayBuffer()),
          );
          const upload = await service.storage
            .from("mission-proof")
            .upload(path, image, { contentType: "image/jpeg", upsert: false });
          if (upload.error) throw upload.error;
          const finish = await service.rpc("finish_upload", {
            p_submission: id,
            p_hash: createHash("sha256").update(image).digest("hex"),
          });
          if (finish.error) throw finish.error;
        } catch {
          operationalEvent("photo_upload_failed", id);
          await service.rpc("fail_upload", { p_submission: id });
          await service.storage.from("mission-proof").remove([path]);
          throw new Error(
            "Could not accept this photo. It may already have been submitted. Please try a new photo.",
          );
        }
        try {
          await verifySubmission(id);
        } catch {
          operationalEvent("verification_deferred", id);
          /* Durable queue remains pending/leased for the cron worker. */
        }
        notice = "Photo submitted. See your review status below.";
        break;
      }
      case "organizer":
        await rpc("approve_organizer", {
          p_email: campusEmail.parse(value(form, "email")),
          p_approve: value(form, "approve") === "true",
        });
        break;
      case "organization":
        await rpc("verify_organization", {
          p_group: uuid(form, "group_id"),
          p_verified: value(form, "verified") === "true",
        });
        break;
      case "settings":
        await rpc("update_settings", {
          p_slots: Number(value(form, "slots")),
          p_seconds: Number(value(form, "hours")) * 3600,
          p_cooldown: Number(value(form, "cooldown_minutes")) * 60,
        });
        notice =
          "Settings saved. Existing mission timers keep their original rules.";
        break;
      case "mission":
        await rpc("save_mission", {
          p_id: value(form, "mission_id") || null,
          p_category: uuid(form, "category_id"),
          p_title: value(form, "title"),
          p_instructions: value(form, "instructions"),
          p_proof: value(form, "proof_criteria"),
          p_nuts: Number(value(form, "nuts")),
          p_published: value(form, "published") === "on",
          p_manual_review: value(form, "manual_review") === "on",
        });
        break;
      case "review":
        await rpc("review_submission", {
          p_submission: uuid(form, "submission_id"),
          p_approve: value(form, "approve") === "true",
          p_reason: value(form, "reason"),
        });
        break;
      case "report":
        await rpc("report_content", {
          p_type: value(form, "target_type"),
          p_target: uuid(form, "target_id"),
          p_reason: value(form, "reason"),
        });
        notice = "Report sent to Chambana admins.";
        break;
      case "resolve_report":
        await rpc("resolve_report", { p_report: uuid(form, "report_id") });
        break;
      default:
        throw new Error("Unknown action.");
    }
    revalidatePath("/", "layout");
  } catch (error) {
    failure = message(error);
  }
  redirect(
    withNotice(destination, failure ? "error" : "message", failure || notice),
  );
}
