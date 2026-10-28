"use server";

import { redirect } from "next/navigation";

// Retain old action entry points so stale beta forms leave without side effects.
export async function signIn(_form: FormData) {
  redirect("/design-preview?view=desktop");
}

export async function signOut() {
  redirect("/design-preview?view=desktop");
}

export async function mutate(_form: FormData) {
  redirect("/design-preview?view=desktop");
}
