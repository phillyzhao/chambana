"use server";

import { operationalEvent } from "@/lib/observability";
import { allowRequest } from "@/lib/rate-limit";
import { campusEmail } from "@/lib/rules";
import { isConfigured, serviceDatabase } from "@/lib/supabase";

export type WaitlistState = {
  status: "idle" | "success" | "error";
  message: string;
};

const unavailable: WaitlistState = {
  status: "error",
  message: "We couldn't save your place. Please try again shortly.",
};

export async function joinWaitlist(
  _previous: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
  // This field is hidden from people and must remain empty.
  if (formData.get("website")) return unavailable;

  const rawEmail = formData.get("email");
  const email = campusEmail.safeParse(rawEmail);
  if (!email.success || email.data.length > 254) {
    return {
      status: "error",
      message: "Enter your @illinois.edu email to join the waitlist.",
    };
  }

  if (!isConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return unavailable;
  }

  try {
    if (
      !(await allowRequest("waitlist-email", email.data, 3, 300)) ||
      !(await allowRequest("waitlist-global", "all", 30, 60))
    ) {
      return {
        status: "error",
        message: "Please wait a few minutes before trying again.",
      };
    }

    const { error } = await serviceDatabase()
      .from("waitlist_signups")
      .upsert(
        { email: email.data },
        { onConflict: "email", ignoreDuplicates: true },
      );
    if (error) {
      operationalEvent("waitlist_storage_unavailable");
      return unavailable;
    }

    // Duplicates receive the same response without changing their original date.
    return {
      status: "success",
      message: "Your place is saved. We'll be in touch when Chambana opens.",
    };
  } catch {
    operationalEvent("waitlist_storage_unavailable");
    return unavailable;
  }
}
