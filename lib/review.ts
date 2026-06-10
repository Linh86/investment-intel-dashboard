import { count, eq } from "drizzle-orm";
import { getDb } from "./db";
import { approvals, artifacts, claims, claimSignals } from "./db/schema";
import { memoContentSchema } from "./drafting/memo";

export type Decision = "approved" | "rejected";

export interface DecisionResult {
  artifactId: string;
  decision: Decision;
  claimsExtracted: number;
}

// The approval gate. Approving a memo also extracts its cited statements into
// approved claims — the only content investor-facing surfaces may render (M4).
// Rejection records the decision and nothing else ever leaves the system.
export function decideArtifact(input: {
  artifactId: string;
  decision: Decision;
  reviewer: string;
  note?: string;
}): DecisionResult {
  const db = getDb();
  const artifact = db
    .select()
    .from(artifacts)
    .where(eq(artifacts.id, input.artifactId))
    .get();
  if (!artifact) {
    throw new Error(`Unknown artifact: ${input.artifactId}`);
  }
  if (artifact.status !== "pending") {
    throw new Error(`Artifact ${input.artifactId} is already ${artifact.status}`);
  }

  const now = new Date().toISOString();
  db.update(artifacts)
    .set({ status: input.decision })
    .where(eq(artifacts.id, artifact.id))
    .run();
  db.insert(approvals)
    .values({
      artifactId: artifact.id,
      decision: input.decision,
      reviewer: input.reviewer,
      note: input.note ?? null,
      decidedAt: now,
    })
    .run();

  let claimsExtracted = 0;
  if (artifact.type === "memo" && input.decision === "approved") {
    const content = memoContentSchema.parse(JSON.parse(artifact.contentJson));
    let claimCount = db.select({ n: count() }).from(claims).get()?.n ?? 0;
    const statements = [
      ...content.keyChanges.map((s) => ({ ...s, kind: "key-change" as const })),
      ...content.risks.map((s) => ({ ...s, kind: "risk" as const })),
    ];
    for (const statement of statements) {
      const claimId = `clm-${String(claimCount + 1).padStart(4, "0")}`;
      db.insert(claims)
        .values({
          id: claimId,
          claimText: statement.text,
          kind: statement.kind,
          status: "approved",
          artifactRef: artifact.id,
          approvedBy: input.reviewer,
          approvedAt: now,
          createdAt: now,
        })
        .run();
      db.insert(claimSignals)
        .values(
          [...new Set(statement.signalIds)].map((signalId) => ({
            claimId,
            signalId,
          })),
        )
        .run();
      claimCount += 1;
      claimsExtracted += 1;
    }
  }

  return { artifactId: artifact.id, decision: input.decision, claimsExtracted };
}
