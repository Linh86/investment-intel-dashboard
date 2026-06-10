import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { claims, deliveryLog, investorBriefs } from "../db/schema";
import { lintBriefContent } from "./lint";
import { briefContentSchema } from "./schema";

// Publishing re-validates everything from the stored row: schema, compliance
// lint, and a tamper check that every referenced claim is still approved.
// Nothing reaches the client page on trust.
export function publishBrief(input: {
  briefId: string;
  reviewer: string;
}): { briefId: string; publishedAt: string } {
  const db = getDb();
  const brief = db
    .select()
    .from(investorBriefs)
    .where(eq(investorBriefs.id, input.briefId))
    .get();
  if (!brief) {
    throw new Error(`Unknown brief: ${input.briefId}`);
  }
  if (brief.status !== "draft") {
    throw new Error(
      `Brief ${input.briefId} is already ${brief.status}; only drafts can be published.`,
    );
  }

  const content = briefContentSchema.parse(JSON.parse(brief.sectionsJson));
  const lint = lintBriefContent(content);
  if (!lint.ok) {
    throw new Error(
      `Brief ${input.briefId} failed compliance lint: ${lint.violations
        .map((violation) => `${violation.rule}: ${violation.detail}`)
        .join(" ")}`,
    );
  }

  for (const item of [...content.whatChanged, ...content.risksMonitored]) {
    const claim = db
      .select({ status: claims.status })
      .from(claims)
      .where(eq(claims.id, item.claimId))
      .get();
    if (!claim || claim.status !== "approved") {
      throw new Error(
        `Tamper check failed: claim ${item.claimId} is ${claim ? claim.status : "missing"}, not approved; refusing to publish.`,
      );
    }
  }

  const publishedAt = new Date().toISOString();
  db.update(investorBriefs)
    .set({
      status: "published",
      publishedAt,
      publishedBy: input.reviewer,
      reviewedBy: input.reviewer,
    })
    .where(eq(investorBriefs.id, brief.id))
    .run();
  db.insert(deliveryLog)
    .values({
      briefId: brief.id,
      segmentId: brief.segmentId,
      channel: "client-page",
      deliveredAt: publishedAt,
      deliveredBy: input.reviewer,
    })
    .run();

  return { briefId: brief.id, publishedAt };
}

export function rejectBrief(input: {
  briefId: string;
  reviewer: string;
  note?: string;
}): { briefId: string } {
  const db = getDb();
  const brief = db
    .select()
    .from(investorBriefs)
    .where(eq(investorBriefs.id, input.briefId))
    .get();
  if (!brief) {
    throw new Error(`Unknown brief: ${input.briefId}`);
  }
  if (brief.status !== "draft") {
    throw new Error(
      `Brief ${input.briefId} is already ${brief.status}; only drafts can be rejected.`,
    );
  }

  db.update(investorBriefs)
    .set({
      status: "rejected",
      reviewedBy: input.reviewer,
      reviewNote: input.note ?? null,
    })
    .where(eq(investorBriefs.id, brief.id))
    .run();

  return { briefId: brief.id };
}
