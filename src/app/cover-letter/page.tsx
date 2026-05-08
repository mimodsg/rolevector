import { AppShell } from "@/components/app-shell";
import { CoverLetterEditor } from "@/components/cover-letter/cover-letter-editor";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/server/session";

export default async function CoverLetterPage() {
  const user = await requireCurrentUser();
  const template = await prisma.coverLetterTemplate.findUnique({
    where: { userId: user.id }
  });

  return (
    <AppShell title="Cover Letter">
      <CoverLetterEditor initialContent={template?.content ?? ""} />
    </AppShell>
  );
}
