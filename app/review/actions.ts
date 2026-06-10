"use server";

import { revalidatePath } from "next/cache";
import { decideArtifact } from "@/lib/review";

export async function reviewAction(formData: FormData) {
  const artifactId = String(formData.get("artifactId") ?? "");
  const decision = formData.get("decision");
  if (decision !== "approved" && decision !== "rejected") return;
  const reviewer =
    String(formData.get("reviewer") ?? "").trim() || "Demo Analyst";
  const note = String(formData.get("note") ?? "").trim();

  decideArtifact({
    artifactId,
    decision,
    reviewer,
    note: note || undefined,
  });

  revalidatePath("/review");
  revalidatePath("/outbox");
  revalidatePath("/");
  revalidatePath(`/memos/${artifactId}`);
}
