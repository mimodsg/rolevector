import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import { Eyebrow, PageTitle } from "@/components/ui/typography";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-rv-text">
      <Panel as="form" className="w-full max-w-md" elevated>
        <Eyebrow>RoleVector</Eyebrow>
        <PageTitle className="mt-3 text-3xl md:text-4xl">Create account</PageTitle>
        <Field className="mt-5" label="Name">
          <TextInput />
        </Field>
        <Field className="mt-4" label="Email">
          <TextInput type="email" />
        </Field>
        <Field className="mt-4" label="Password">
          <TextInput type="password" />
        </Field>
        <Button className="mt-5 w-full" type="button">
          Create account
        </Button>
        <p className="mt-4 text-sm text-rv-text-muted">
          Already registered?{" "}
          <Link className="font-bold text-rv-highlight" href="/login">
            Sign in
          </Link>
        </p>
      </Panel>
    </main>
  );
}
