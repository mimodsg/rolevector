"use client";

import { useState, type FormEvent } from "react";
import { Alert, RoleTag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Select, TextInput } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow
} from "@/components/ui/table";
import { HelperText, SectionTitle } from "@/components/ui/typography";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "Authenticated" | "Admin";
  createdAt: string | Date;
  updatedAt: string | Date;
};

export function UsersManager({
  currentUserId,
  initialUsers
}: {
  currentUserId: string;
  initialUsers: AdminUser[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  async function parseResponse<TPayload extends object>(
    response: Response
  ): Promise<TPayload> {
    const text = await response.text();
    let payload: { error?: string } = {};

    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = {};
    }

    if (!response.ok) {
      const message = (payload.error ?? text) || `The user request failed (${response.status}).`;
      throw new Error(message);
    }

    return payload as TPayload;
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsCreating(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const payload = await parseResponse<{ user: AdminUser }>(
        await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.get("name"),
            email: formData.get("email"),
            password: formData.get("password"),
            role: formData.get("role")
          })
        })
      );

      setUsers((current) => [payload.user, ...current]);
      form.reset();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create user.");
    } finally {
      setIsCreating(false);
    }
  }

  async function updateRole(user: AdminUser, role: AdminUser["role"]) {
    setError("");

    try {
      const payload = await parseResponse<{ user: AdminUser }>(
        await fetch(`/api/admin/users/${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role })
        })
      );

      setUsers((current) =>
        current.map((item) => (item.id === user.id ? payload.user : item))
      );
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update user.");
    }
  }

  async function deleteUser(user: AdminUser) {
    setError("");

    try {
      await parseResponse<{ ok: boolean }>(
        await fetch(`/api/admin/users/${user.id}`, {
          method: "DELETE"
        })
      );

      setUsers((current) => current.filter((item) => item.id !== user.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete user.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <Panel>
        <SectionTitle className="text-xl md:text-2xl">Create user</SectionTitle>
        <HelperText className="mt-2">
          Admin-created accounts can sign in immediately with the temporary password.
        </HelperText>
        <form className="mt-5 grid gap-4" onSubmit={createUser}>
          <Field label="Name">
            <TextInput name="name" required />
          </Field>
          <Field label="Email">
            <TextInput autoComplete="off" name="email" required type="email" />
          </Field>
          <Field helper="Use at least 12 characters." label="Temporary password">
            <TextInput
              autoComplete="new-password"
              minLength={12}
              name="password"
              required
              type="password"
            />
          </Field>
          <Field label="Role">
            <Select defaultValue="Authenticated" name="role">
              <option value="Authenticated">Authenticated</option>
              <option value="Admin">Admin</option>
            </Select>
          </Field>
          {error ? (
            <Alert tone="error">
              {error}
            </Alert>
          ) : null}
          <Button disabled={isCreating} type="submit">
            {isCreating ? "Creating..." : "Create user"}
          </Button>
        </form>
      </Panel>
      <Panel className="overflow-hidden p-0">
        {users.length === 0 ? (
          <EmptyState
            className="m-5"
            description="Create the first authenticated or admin user to unlock app access for the team."
            title="No users yet"
          />
        ) : (
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeader>Name</DataTableHeader>
                <DataTableHeader>Email</DataTableHeader>
                <DataTableHeader>Role</DataTableHeader>
                <DataTableHeader>Change role</DataTableHeader>
                <DataTableHeader>Actions</DataTableHeader>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {users.map((user) => (
                <DataTableRow key={user.id}>
                  <DataTableCell>
                    <div className="font-bold text-rv-text">{user.name}</div>
                    {user.id === currentUserId ? (
                      <HelperText className="mt-1">Current session</HelperText>
                    ) : null}
                  </DataTableCell>
                  <DataTableCell className="text-rv-text-muted">{user.email}</DataTableCell>
                  <DataTableCell>
                    <RoleTag role={user.role} />
                  </DataTableCell>
                  <DataTableCell>
                    <Select
                      aria-label={`Role for ${user.email}`}
                      className="min-w-44"
                      disabled={user.id === currentUserId}
                      onChange={(event) =>
                        updateRole(user, event.currentTarget.value as AdminUser["role"])
                      }
                      value={user.role}
                    >
                      <option value="Authenticated">Authenticated</option>
                      <option value="Admin">Admin</option>
                    </Select>
                  </DataTableCell>
                  <DataTableCell>
                    <Button
                      disabled={user.id === currentUserId}
                      onClick={() => deleteUser(user)}
                      type="button"
                      variant="ghost"
                    >
                      Delete
                    </Button>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </Panel>
    </div>
  );
}
