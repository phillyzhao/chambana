import { z } from "zod";

export const MISSION_CATEGORIES = [
  "Self Improvement",
  "Campus Exploration",
  "Dares",
  "Kindness",
  "Food & Local",
] as const;
export type MissionCategory = (typeof MISSION_CATEGORIES)[number];

const text = (min: number, max: number) => z.string().trim().min(min).max(max);
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T12:00:00Z`);
    return (
      Number.isFinite(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Enter a valid source-check date.");
const timestamp = z.string().datetime({ offset: true }).nullable();

export const missionDraftSchema = z
  .object({
    title: text(4, 120),
    category: z.enum(MISSION_CATEGORIES),
    instructions: text(12, 4000),
    location_name: text(3, 160),
    location_address: text(0, 240),
    city: z.enum(["Urbana", "Champaign"]),
    duration_minutes: z.number().int().min(1).max(1440),
    cost_label: text(1, 100),
    min_people: z.number().int().min(1).max(100),
    max_people: z.number().int().min(1).max(100),
    nuts: z.number().int().min(0).max(1000),
    proof_prompt: text(5, 500),
    source_url: z
      .string()
      .trim()
      .url()
      .max(2000)
      .refine((value) => {
        const url = new URL(value);
        return (
          ["http:", "https:"].includes(url.protocol) &&
          !url.username &&
          !url.password
        );
      }, "Use a public HTTP or HTTPS source link."),
    source_checked_on: dateOnly,
    starts_at: timestamp,
    ends_at: timestamp,
  })
  .superRefine((mission, context) => {
    if (mission.max_people < mission.min_people)
      context.addIssue({
        code: "custom",
        path: ["max_people"],
        message: "Maximum people must be at least the minimum.",
      });
    if (
      mission.starts_at &&
      mission.ends_at &&
      Date.parse(mission.ends_at) <= Date.parse(mission.starts_at)
    )
      context.addIssue({
        code: "custom",
        path: ["ends_at"],
        message: "End time must be after start time.",
      });
  });

export type MissionDraftInput = z.infer<typeof missionDraftSchema>;
export type MissionLibraryRecord = MissionDraftInput & {
  id: string;
  approved_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  revision: number;
};
export type MissionActionState = {
  error?: string;
  success?: string;
  id?: string;
};
export type MissionLibraryResult = {
  missions: MissionLibraryRecord[];
  error?: string;
};

const chicagoFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Chicago",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Value for a datetime-local input; independent of the browser's own timezone. */
export function chicagoDateTimeInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = Object.fromEntries(
    chicagoFormatter
      .formatToParts(date)
      .map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** Rejects nonexistent/ambiguous DST times rather than silently moving a schedule. */
export function parseChicagoDateTime(value: string): string | null {
  if (!value.trim()) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error("Enter a valid Central time, including date and minutes.");
  const utc = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(utc))
    throw new Error("Enter a valid Central date and time.");
  const candidates = [5, 6]
    .map((offset) => new Date(utc + offset * 60 * 60 * 1000).toISOString())
    .filter((candidate) => chicagoDateTimeInput(candidate) === value);
  if (candidates.length === 0)
    throw new Error(
      "That Central time does not exist. Choose another time outside the daylight-saving change.",
    );
  if (candidates.length > 1)
    throw new Error(
      "That Central time occurs twice during the daylight-saving change. Choose a time after 2:00 AM.",
    );
  return candidates[0];
}

export function missionFormInput(form: FormData): MissionDraftInput {
  const value = (key: string) => {
    const result = form.get(key);
    return typeof result === "string" ? result : "";
  };
  const number = (key: string) =>
    value(key).trim() ? Number(value(key)) : Number.NaN;
  const schedule = (field: "starts" | "ends") =>
    form.has(`${field}_local`)
      ? parseChicagoDateTime(value(`${field}_local`))
      : value(`${field}_at`) || null;
  const result = missionDraftSchema.safeParse({
    title: value("title"),
    category: value("category"),
    instructions: value("instructions"),
    location_name: value("location_name"),
    location_address: value("location_address"),
    city: value("city"),
    duration_minutes: number("duration_minutes"),
    cost_label: value("cost_label"),
    min_people: number("min_people"),
    max_people: number("max_people"),
    nuts: number("nuts"),
    proof_prompt: value("proof_prompt"),
    source_url: value("source_url"),
    source_checked_on: value("source_checked_on"),
    starts_at: schedule("starts"),
    ends_at: schedule("ends"),
  });
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(
      `${issue.path.join(" ").replaceAll("_", " ")}: ${issue.message}`,
    );
  }
  return result.data;
}

export function isPublishedMission(
  mission: Pick<
    MissionLibraryRecord,
    "approved_at" | "archived_at" | "starts_at" | "ends_at"
  >,
  now = Date.now(),
) {
  return (
    Boolean(mission.approved_at) &&
    !mission.archived_at &&
    (!mission.starts_at || Date.parse(mission.starts_at) <= now) &&
    (!mission.ends_at || Date.parse(mission.ends_at) > now)
  );
}

export function missionStatus(
  mission: Pick<
    MissionLibraryRecord,
    "approved_at" | "archived_at" | "starts_at" | "ends_at"
  >,
  now = Date.now(),
): "Draft" | "Scheduled" | "Approved" | "Expired" | "Archived" {
  if (mission.archived_at) return "Archived";
  if (!mission.approved_at) return "Draft";
  if (mission.ends_at && Date.parse(mission.ends_at) <= now) return "Expired";
  if (mission.starts_at && Date.parse(mission.starts_at) > now)
    return "Scheduled";
  return "Approved";
}

export const missionReferenceSchema = z.object({
  id: z.string().uuid(),
  revision: z.coerce.number().int().min(1),
});
