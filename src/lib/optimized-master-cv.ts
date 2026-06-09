import type { MasterCV, OptimizedMasterCV } from "@prisma/client";
import {
  optimizedMasterCvRecordToSummary,
  type OptimizedMasterCvRecord
} from "@/lib/services/optimized-master-cv";

export type OptimizedMasterCvRecordWithSource = OptimizedMasterCV & {
  masterCv: MasterCV;
};

export function optimizedMasterCvRecordToOptimizedMasterCv(
  record: OptimizedMasterCV
): OptimizedMasterCvRecord {
  return optimizedMasterCvRecordToSummary(record);
}
