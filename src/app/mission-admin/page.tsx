import type { Metadata } from "next";
import { MissionAdmin, MissionAdminLogin } from "@/components/mission-admin";
import {
  hasMissionAdminAccess,
  missionAdminConfigured,
} from "@/lib/mission-admin-auth";
import { listAdminMissions } from "@/lib/mission-library-store";

export const metadata: Metadata = {
  title: "Mission library · Chambana",
  description: "Private mission editing and approval for Chambana.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MissionAdminPage() {
  if (!(await hasMissionAdminAccess())) {
    return <MissionAdminLogin configured={missionAdminConfigured()} />;
  }

  const result = await listAdminMissions();
  return (
    <MissionAdmin
      missions={result.missions}
      error={result.error}
      deliveryEnabled={process.env.CHAMBANA_MISSION_LIBRARY_ENABLED === "true"}
      now={new Date().toISOString()}
    />
  );
}
