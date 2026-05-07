import type { ApplicationStatusValue } from "@/lib/schemas/application";
import { statusPillStyles as styles } from "./styles";

type StatusPillProps = {
  status: ApplicationStatusValue;
};

export function StatusPill({ status }: StatusPillProps) {
  return (
    <span className={`${styles.base} ${styles.variants[status]}`}>
      {status}
    </span>
  );
}
