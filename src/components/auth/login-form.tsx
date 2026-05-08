"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
    const result = await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirect: false,
      callbackUrl
    });

    setIsSubmitting(false);

    if (!result?.ok) {
      setError("Invalid email or password.");
      return;
    }

    router.push(result.url ?? callbackUrl);
    router.refresh();
  }

  return (
    <form className="mt-5" onSubmit={handleSubmit}>
      <Field label="Email">
        <TextInput autoComplete="email" name="email" required type="email" />
      </Field>
      <Field className="mt-4" label="Password">
        <TextInput
          autoComplete="current-password"
          maxLength={128}
          name="password"
          required
          type="password"
        />
      </Field>
      {error ? (
        <p className="mt-4 rounded-rvmd border border-red-400/40 bg-red-950/30 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      ) : null}
      <Button className="mt-5 w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
