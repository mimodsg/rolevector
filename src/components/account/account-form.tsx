"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import { HelperText } from "@/components/ui/typography";

type AccountUser = {
  email: string;
  name: string;
};

async function parseResponse<TPayload extends object>(response: Response) {
  const text = await response.text();
  let payload: { error?: string } = {};

  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const message = (payload.error ?? text) || `Account update failed (${response.status}).`;
    throw new Error(message);
  }

  return payload as TPayload;
}

export function AccountForm({ user }: { user: AccountUser }) {
  const [email, setEmail] = useState(user.email);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(user.name);
  const [success, setSuccess] = useState("");

  async function updateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSaving(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const payload = await parseResponse<{ user: AccountUser }>(
        await fetch("/api/account", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            confirmPassword: formData.get("confirmPassword"),
            currentPassword: formData.get("currentPassword"),
            email,
            name,
            newPassword: formData.get("newPassword")
          })
        })
      );

      setEmail(payload.user.email);
      setName(payload.user.name);
      setSuccess("Account updated.");
      form.reset();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to update account."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Panel>
      <form className="grid gap-4" onSubmit={updateAccount}>
        <Field label="Name">
          <TextInput
            autoComplete="name"
            onChange={(event) => setName(event.currentTarget.value)}
            required
            value={name}
          />
        </Field>
        <Field helper="Changing this updates your sign-in email." label="Email">
          <TextInput
            autoComplete="email"
            onChange={(event) => setEmail(event.currentTarget.value)}
            required
            type="email"
            value={email}
          />
        </Field>
        <Field
          helper="Required to save account changes."
          label="Current password"
        >
          <TextInput
            autoComplete="current-password"
            name="currentPassword"
            required
            type="password"
          />
        </Field>
        <div className="grid items-start gap-4 md:grid-cols-2">
          <Field helper="Leave blank to keep your password." label="New password">
            <TextInput
              autoComplete="new-password"
              minLength={12}
              name="newPassword"
              type="password"
            />
          </Field>
          <Field label="Confirm new password">
            <TextInput
              autoComplete="new-password"
              minLength={12}
              name="confirmPassword"
              type="password"
            />
          </Field>
        </div>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {success ? <Alert tone="success">{success}</Alert> : null}
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={isSaving} type="submit">
            {isSaving ? "Saving..." : "Save credentials"}
          </Button>
          <HelperText>
            If you update your email, use the new email the next time you sign in.
          </HelperText>
        </div>
      </form>
    </Panel>
  );
}
