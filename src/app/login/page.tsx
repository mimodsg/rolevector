import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import { Eyebrow, PageTitle } from "@/components/ui/typography";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-rv-text">
      <Panel as="form" className="w-full max-w-md" elevated>
        <Eyebrow>RoleVector</Eyebrow>
        <PageTitle className="mt-3 text-3xl md:text-4xl">Sign in</PageTitle>
        <Field className="mt-5" label="Email">
          <TextInput type="email" />
        </Field>
        <Field className="mt-4" label="Password">
          <TextInput type="password" />
        </Field>
        <Button className="mt-5 w-full" type="button">
          Sign in
        </Button>
        <p className="mt-4 text-sm text-rv-text-muted">
          Need an account?{" "}
          <Link className="font-bold text-rv-highlight" href="/register">
            Register
          </Link>
        </p>
      </Panel>
    </main>
  );
}
