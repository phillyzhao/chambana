import type { MemberMissionState } from "./member-missions";

export type MemberExperience = MemberMissionState & {
  id: string;
  profile: { name: string; handle: string; interests: string[] };
};
