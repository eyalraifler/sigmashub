"use client";

import { useState } from "react";
import { useActionState } from "react";

export default function LoginForm({ action }) {
  const [show, setShow] = useState(false);

  // state will be whatever your server action returns (e.g. { error: "..." })
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction}>
      <div>
        <label htmlFor="email" className="mr-4">Email</label>
        <input id="email" name="email" type="email" required className="border" />
      </div>

      <div>
        <label htmlFor="password" className="mr-4">Password</label>
        <input
          id="password"
          name="password"
          type={show ? "text" : "password"}
          required
          className="border mt-3 mb-3"
        />
        <button type="button" onClick={() => setShow(v => !v)}>
          {show ? "Hide" : "Show"}
        </button>
      </div>

      <button type="submit" disabled={pending} className="border border-blue-500 font-bold">
        {pending ? "Logging in..." : "Login"}
      </button>

      {state?.error && (
        <p className="mt-2 text-red-500">{state.error}</p>
      )}
    </form>
  );
}
