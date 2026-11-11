// Server-only guards keep privileged database and private storage access here.
import { z } from "zod";
import { requireMemberAccount } from "./member-auth";
import {
  hasMissionAdminAccess,
  requireMissionAdminAccess,
} from "./mission-admin-auth";
import { serviceDatabase } from "./supabase";
import {
  PROOF_BUCKET,
  proofHeaderMatches,
  proofUploadSchema,
  submissionReviewSchema,
  type MemberMissionState,
  type MemberSubmission,
  type ReviewSubmission,
} from "./member-missions";

const columns =
  "id,user_id,mission_id,status,mission_title,mission_instructions,proof_prompt,nuts,mission_revision,proof_path,mime_type,size_bytes,created_at,submitted_at,reviewed_at,rejection_reason";
const unavailable =
  "Your mission activity is temporarily unavailable. Please try again.";

export class MemberMissionError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "MemberMissionError";
  }
}

async function requireIdentity(userId: string) {
  const account = await requireMemberAccount({ profile: true });
  if (account.id !== userId)
    throw new MemberMissionError(
      403,
      "You can only access your own mission activity.",
    );
}

function knownDatabaseError(error: { message?: string; code?: string } | null) {
  if (!error) return;
  const message = error.message ?? "";
  const safeMessages = [
    "Complete your profile before submitting proof",
    "This mission is not available for submissions",
    "Choose a supported photo up to 10 MB or video up to 50 MB",
    "Finish or cancel your current upload before choosing another file",
    "This mission already has a pending or approved submission",
    "Too many uploads. Please try again later",
    "Submission not found",
    "This submission cannot be changed",
    "Upload expired. Please submit your proof again",
    "Your proof upload is incomplete. Please try again",
    "This submission has already changed. Refresh the queue",
    "Only an unfinished upload can be canceled",
    "Add a rejection reason of 1 to 1000 characters",
  ];
  if (safeMessages.includes(message))
    throw new MemberMissionError(
      message === "Submission not found"
        ? 404
        : message.startsWith("Too many")
          ? 429
          : 409,
      message,
    );
  throw new MemberMissionError(503, unavailable);
}

function row(data: unknown): MemberSubmission {
  // PostgREST returns composite RPC results as an object (or a singleton array).
  const value = Array.isArray(data) ? data[0] : data;
  if (!value || typeof value !== "object" || !("id" in value))
    throw new MemberMissionError(503, unavailable);
  return value as MemberSubmission;
}

export async function getMemberMissionState(
  userId: string,
): Promise<MemberMissionState> {
  await requireIdentity(userId);
  const db = serviceDatabase();
  const [history, ledger] = await Promise.all([
    db
      .from("mission_submissions")
      .select(columns)
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    db.from("member_nut_ledger").select("amount").eq("user_id", userId),
  ]);
  knownDatabaseError(history.error);
  knownDatabaseError(ledger.error);
  return {
    submissions: (history.data ?? []) as MemberSubmission[],
    nuts: (ledger.data ?? []).reduce(
      (sum, entry) => sum + Number(entry.amount),
      0,
    ),
    completedCount: ledger.data?.length ?? 0,
  };
}

export async function reserveSubmission(
  userId: string,
  missionId: string,
  mime: string,
  size: number,
) {
  await requireIdentity(userId);
  if (process.env.CHAMBANA_MISSION_LIBRARY_ENABLED !== "true")
    throw new MemberMissionError(
      409,
      "Mission submissions are paused. Please try again later.",
    );
  const parsed = proofUploadSchema.safeParse({ missionId, mime, size });
  if (!parsed.success)
    throw new MemberMissionError(
      400,
      "Choose a JPG, PNG, or WebP photo up to 10 MB, or an MP4, MOV, or WebM video up to 50 MB.",
    );
  const db = serviceDatabase();
  const result = await db.rpc("reserve_member_submission", {
    p_user_id: userId,
    p_mission_id: parsed.data.missionId,
    p_mime_type: parsed.data.mime,
    p_size_bytes: parsed.data.size,
  });
  knownDatabaseError(result.error);
  const submission = row(result.data);
  const upload = await db.storage
    .from(PROOF_BUCKET)
    .createSignedUploadUrl(submission.proof_path, { upsert: false });
  if (upload.error || !upload.data)
    throw new MemberMissionError(
      503,
      "Could not start your upload. Please try again.",
    );
  return { submission, upload: upload.data };
}

async function findSubmission(id: string, userId?: string) {
  if (!z.uuid().safeParse(id).success)
    throw new MemberMissionError(400, "Choose a valid submission.");
  let query = serviceDatabase()
    .from("mission_submissions")
    .select(columns)
    .eq("id", id);
  if (userId) query = query.eq("user_id", userId);
  const result = await query.maybeSingle();
  knownDatabaseError(result.error);
  if (!result.data) throw new MemberMissionError(404, "Submission not found");
  return row(result.data);
}

async function signedProof(path: string, expiresIn = 300) {
  const result = await serviceDatabase()
    .storage.from(PROOF_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (result.error || !result.data)
    throw new MemberMissionError(
      503,
      "Proof is temporarily unavailable. Please try again.",
    );
  const url = new URL(result.data.signedUrl);
  const origin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin;
  if (url.origin !== origin)
    throw new MemberMissionError(
      503,
      "Proof is temporarily unavailable. Please try again.",
    );
  return url.href;
}

async function readProofHeader(path: string) {
  const url = await signedProof(path, 60);
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Range: "bytes=0-4095" },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new MemberMissionError(
      503,
      "Could not check your proof. Please retry submitting it.",
    );
  }
  if (![200, 206].includes(response.status) || !response.body)
    throw new MemberMissionError(
      409,
      "Your proof upload is incomplete. Please try again",
    );
  const reader = response.body.getReader();
  const header = new Uint8Array(4096);
  let length = 0;
  try {
    while (length < header.length) {
      const { value, done } = await reader.read();
      if (done) break;
      const part = value.subarray(0, header.length - length);
      header.set(part, length);
      length += part.length;
    }
  } finally {
    await reader.cancel();
  }
  return header.subarray(0, length);
}

export async function finalizeSubmission(
  userId: string,
  id: string,
): Promise<MemberSubmission> {
  await requireIdentity(userId);
  const submission = await findSubmission(id, userId);
  if (submission.status === "pending" || submission.status === "approved")
    return submission;
  if (submission.status !== "uploading")
    throw new MemberMissionError(409, "This submission cannot be changed");
  const bytes = await readProofHeader(submission.proof_path);
  if (!proofHeaderMatches(bytes, submission.mime_type))
    throw new MemberMissionError(
      422,
      "That file could not be recognized as the selected photo or video type. Cancel this upload and choose another file.",
    );
  const result = await serviceDatabase().rpc("finalize_member_submission", {
    p_user_id: userId,
    p_submission_id: id,
  });
  knownDatabaseError(result.error);
  return row(result.data);
}

export async function cancelSubmission(userId: string, id: string) {
  await requireIdentity(userId);
  await findSubmission(id, userId);
  const result = await serviceDatabase().rpc("cancel_member_upload", {
    p_user_id: userId,
    p_submission_id: id,
  });
  knownDatabaseError(result.error);
  // Do not delete the object here: an already-issued signed upload URL can
  // remain valid. The canceled attempt stays private and cannot be finalized.
}

export async function getProofUrl(
  userId: string | null,
  id: string,
): Promise<string> {
  const admin = await hasMissionAdminAccess();
  if (!admin) {
    if (!userId)
      throw new MemberMissionError(401, "Sign in to view this proof.");
    await requireIdentity(userId);
  }
  const submission = await findSubmission(id, admin ? undefined : userId!);
  if (!submission.submitted_at)
    throw new MemberMissionError(404, "Proof has not been submitted yet.");
  return signedProof(submission.proof_path);
}

export async function listReviewSubmissions(): Promise<ReviewSubmission[]> {
  await requireMissionAdminAccess();
  const db = serviceDatabase();
  const [pending, recent] = await Promise.all([
    db
      .from("mission_submissions")
      .select(`${columns},member_profiles(name,handle)`)
      .eq("status", "pending")
      .order("submitted_at", { ascending: true })
      .limit(200),
    db
      .from("mission_submissions")
      .select(`${columns},member_profiles(name,handle)`)
      .in("status", ["approved", "rejected"])
      .not("submitted_at", "is", null)
      .order("reviewed_at", { ascending: false })
      .limit(50),
  ]);
  knownDatabaseError(pending.error);
  knownDatabaseError(recent.error);
  return [...(pending.data ?? []), ...(recent.data ?? [])].map((entry) => {
    const { member_profiles: profile, ...submission } = entry;
    const member = (Array.isArray(profile) ? profile[0] : profile) as {
      name?: string;
      handle?: string;
    } | null;
    return {
      ...submission,
      member_name: member?.name ?? "Member",
      member_handle: member?.handle ?? "",
    } as ReviewSubmission;
  });
}

export async function reviewSubmission(
  id: string,
  decision: "approve" | "reject",
  reason = "",
): Promise<MemberSubmission> {
  await requireMissionAdminAccess();
  const parsed = submissionReviewSchema.safeParse({ id, decision, reason });
  if (!parsed.success)
    throw new MemberMissionError(
      400,
      "Choose a submission and decision. Rejections need a reason of up to 1,000 characters.",
    );
  const result = await serviceDatabase().rpc("review_member_submission", {
    p_submission_id: parsed.data.id,
    p_decision: parsed.data.decision,
    p_reason: parsed.data.reason,
  });
  knownDatabaseError(result.error);
  return row(result.data);
}
