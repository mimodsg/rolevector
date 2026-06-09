import type { MasterCVRevision } from "@prisma/client";
import { masterCvSchema, type MasterCv } from "@/lib/schemas/master-cv";

export type MasterCvRevisionRecord = Pick<
  MasterCVRevision,
  "id" | "sourceMasterCvId" | "revisionNumber" | "createdAt"
> & {
  cvJson: MasterCv;
};

export function masterCvRevisionRecordToMasterCvRevision(
  record: MasterCVRevision
): MasterCvRevisionRecord {
  return {
    createdAt: record.createdAt,
    cvJson: masterCvSchema.parse(record.cvJson),
    id: record.id,
    revisionNumber: record.revisionNumber,
    sourceMasterCvId: record.sourceMasterCvId
  };
}
