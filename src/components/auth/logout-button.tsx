"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <Button
      onClick={() => void signOut({ callbackUrl: "/login" })}
      type="button"
      variant="ghost"
    >
      Log out
    </Button>
  );
}
