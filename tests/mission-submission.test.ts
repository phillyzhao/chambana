import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  MissionSubmission,
  visibleSubmission,
} from "../src/components/mission-submission";
import type { MemberSubmission } from "../src/lib/member-missions";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const record: MemberSubmission = {
  id: "40000000-0000-4000-8000-000000000003",
  user_id: "40000000-0000-4000-8000-000000000001",
  mission_id: "40000000-0000-4000-8000-000000000002",
  status: "pending",
  mission_title: "Campus corn cameo",
  mission_instructions: "Find the sign.",
  proof_prompt: "Include the sign in your photo.",
  nuts: 25,
  mission_revision: 1,
  proof_path: "private-proof.jpg",
  mime_type: "image/jpeg",
  size_bytes: 256,
  created_at: "2026-11-11T15:00:00Z",
  submitted_at: "2026-11-11T15:01:00Z",
  reviewed_at: null,
  rejection_reason: null,
};
function render(submission?: MemberSubmission) {
  return renderToStaticMarkup(
    createElement(MissionSubmission, {
      missionId: record.mission_id,
      submission,
    }),
  );
}

describe("required mission proof UI", () => {
  it("starts with submission disabled until photo or video proof is selected", () => {
    const html = render();
    expect(html).toContain('type="file"');
    expect(html).toContain(
      'accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"',
    );
    expect(html).toContain('disabled="" type="submit"');
    expect(html).toContain("Required to complete this mission.");
  });
  it("shows pending review without awarding nuts or allowing a duplicate upload", () => {
    const html = render(record);
    expect(html).toContain("Sent for review.");
    expect(html).not.toContain('type="file"');
    expect(html).not.toContain("+25 nuts");
  });
  it("shows the approved reward only after server approval", () => {
    expect(render({ ...record, status: "approved" })).toContain(
      "Approved. +25 nuts.",
    );
  });
  it("shows a rejection reason and allows a new proof attempt", () => {
    const html = render({
      ...record,
      status: "rejected",
      rejection_reason: "Please show the sign.",
    });
    expect(html).toContain("Please show the sign.");
    expect(html).toContain('type="file"');
  });
  it("lets an interrupted upload finish after returning to the mission", () => {
    expect(
      render({ ...record, status: "uploading", submitted_at: null }),
    ).toContain("Finish previous upload");
  });
  it("shows a newer approved attempt from another device instead of old local pending feedback", () => {
    const newer: MemberSubmission = {
      ...record,
      id: "40000000-0000-4000-8000-000000000004",
      status: "approved",
      created_at: "2026-11-11T16:00:00Z",
      reviewed_at: "2026-11-11T16:10:00Z",
    };
    const html = render(visibleSubmission(newer, record));
    expect(html).toContain("Approved. +25 nuts.");
    expect(html).not.toContain("Sent for review.");
  });
  it("keeps new local submission feedback while an older rejected attempt is still in server props", () => {
    const oldRejected: MemberSubmission = {
      ...record,
      id: "40000000-0000-4000-8000-000000000005",
      status: "rejected",
      created_at: "2026-11-11T14:00:00Z",
      rejection_reason: "Show the sign.",
    };
    const html = render(visibleSubmission(oldRejected, record));
    expect(html).toContain("Sent for review.");
    expect(html).not.toContain("Show the sign.");
  });
  it("uses refreshed review decisions for the same locally submitted attempt", () => {
    expect(
      render(visibleSubmission({ ...record, status: "approved" }, record)),
    ).toContain("Approved. +25 nuts.");
    expect(
      render(
        visibleSubmission(
          { ...record, status: "rejected", rejection_reason: "Show the sign." },
          record,
        ),
      ),
    ).toContain("Show the sign.");
    expect(
      render(visibleSubmission({ ...record, status: "uploading" }, record)),
    ).toContain("Sent for review.");
  });
});
