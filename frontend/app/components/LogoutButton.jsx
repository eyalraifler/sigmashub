"use client";

import { useTransition } from "react";
import { logout } from "../logout/actions";

export default function LogoutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => logout())}
      disabled={pending}
    >
      {pending ? "Logging out..." : "Logout"}
    </button>
  );
}
