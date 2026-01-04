"use client";

import { useState } from "react";
import { useActionState } from "react";

export default function SignupForm({ action }) {
  const [show, setShow] = useState(false);
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction}>
      <div>
        <label htmlFor="email" className="mr-4">Email</label>
        <input id="email" name="email" type="email" required className="border" />
      </div>

      <div className="mt-3">
        <label htmlFor="username" className="mr-4">Username</label>
        <input id="username" name="username" type="text" required className="border" />
      </div>

      <div className="mt-3">
        <label htmlFor="password" className="mr-4">Password</label>
        <input
          id="password"
          name="password"
          type={show ? "text" : "password"}
          required
          className="border"
        />
        <button type="button" onClick={() => setShow(v => !v)} className="ml-2">
          {show ? "Hide" : "Show"}
        </button>
      </div>

      <button type="submit" disabled={pending} className="border border-blue-500 font-bold mt-3">
        {pending ? "Creating..." : "Create account"}
      </button>

      {state?.error && (
        <p className="mt-2 text-red-500">{state.error}</p>
      )}
    </form>
  );
}
