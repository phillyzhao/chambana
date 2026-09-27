"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { mutate } from "@/app/actions";

function DeleteButton({ confirmed }: { confirmed: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="button" disabled={!confirmed || pending}>
      {pending ? "Deleting group…" : "Permanently delete group"}
    </button>
  );
}

export function DeleteGroupForm({ id, name }: { id: string; name: string }) {
  const [confirmation, setConfirmation] = useState("");
  return (
    <details className="panel">
      <summary>Delete group</summary>
      <p id="delete-group-warning">
        This permanently removes the group, memberships, invitations, missions,
        active submissions, and points earned through this group from everyone’s
        totals. Submitted photos and their records remain in Chambana’s private
        archive. Group deletion cannot be undone.
      </p>
      <form action={mutate}>
        <input type="hidden" name="action" value="delete_group" />
        <input type="hidden" name="group_id" value={id} />
        <input type="hidden" name="back" value={`/groups/${id}`} />
        <label>
          To confirm, type the group name exactly: <strong>{name}</strong>
          <input
            name="confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            required
            maxLength={60}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            aria-describedby="delete-group-warning"
          />
        </label>
        <DeleteButton confirmed={confirmation === name} />
      </form>
    </details>
  );
}
