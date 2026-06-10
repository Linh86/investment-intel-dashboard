"use server";

import { revalidatePath } from "next/cache";
import { publishBrief, rejectBrief } from "@/lib/briefing/publish";
import { getBrief } from "@/lib/data";

function revalidateBriefPaths(briefId: string, segmentId: string) {
  revalidatePath("/briefs");
  revalidatePath(`/briefs/${briefId}`);
  revalidatePath("/client");
  revalidatePath(`/client/${segmentId}`);
}

export async function publishAction(formData: FormData) {
  const briefId = String(formData.get("briefId") ?? "");
  const reviewer =
    String(formData.get("reviewer") ?? "").trim() || "Demo Analyst";
  const brief = getBrief(briefId);
  if (!brief) return;

  publishBrief({ briefId, reviewer });

  revalidateBriefPaths(briefId, brief.segmentId);
}

export async function rejectAction(formData: FormData) {
  const briefId = String(formData.get("briefId") ?? "");
  const reviewer =
    String(formData.get("reviewer") ?? "").trim() || "Demo Analyst";
  const note = String(formData.get("note") ?? "").trim();
  const brief = getBrief(briefId);
  if (!brief) return;

  rejectBrief({ briefId, reviewer, note: note || undefined });

  revalidateBriefPaths(briefId, brief.segmentId);
}
