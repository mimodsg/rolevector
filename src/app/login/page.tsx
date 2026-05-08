import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { Panel } from "@/components/ui/panel";
import { Eyebrow, PageTitle } from "@/components/ui/typography";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-rv-text">
      <Panel className="w-full max-w-md" elevated>
        <Eyebrow>RoleVector</Eyebrow>
        <PageTitle className="mt-3 text-3xl md:text-4xl">Sign in</PageTitle>
        <p className="mt-4 text-sm text-rv-text-muted">
          Use the account your administrator created for you.
        </p>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </Panel>
    </main>
  );
}
