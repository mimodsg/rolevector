import { AppShell } from "@/components/app-shell";
import { OptimizeForm } from "@/components/optimize/optimize-form";

export default function NewApplicationPage() {
  return (
    <AppShell title="New Application">
      <OptimizeForm />
    </AppShell>
  );
}
