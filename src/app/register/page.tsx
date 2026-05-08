import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Eyebrow, PageTitle } from "@/components/ui/typography";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-rv-text">
      <Panel className="w-full max-w-md" elevated>
        <Eyebrow>RoleVector</Eyebrow>
        <PageTitle className="mt-3 text-3xl md:text-4xl">Account access</PageTitle>
        <p className="mt-5 text-sm leading-6 text-rv-text-muted">
          Accounts are created by administrators. If you already have credentials,
          sign in to continue.
        </p>
        <ButtonLink className="mt-5 w-full" href="/login">
          Sign in
        </ButtonLink>
        <p className="mt-4 text-sm text-rv-text-muted">
          Looking for the product overview?{" "}
          <Link className="font-bold text-rv-highlight" href="/">
            Go home
          </Link>
        </p>
      </Panel>
    </main>
  );
}
