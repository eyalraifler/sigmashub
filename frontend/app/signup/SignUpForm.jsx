"use client";

import { useState } from "react";
import { useActionState } from "react";

export default function SignupForm({ action }) {
  const [show, setShow] = useState(false);
  const [state, formAction, pending] = useActionState(action, null);

  // If signup succeeded - show onboarding UI instead of signup form
  if (state?.ok) {
    return (
      <div className="border p-4">
        <h2 className="text-2xl font-bold mb-2">Complete your profile</h2>
        <p className="mb-4 text-gray-600">
          Add a profile picture and bio.
        </p>

        <OnboardingInline />
      </div>
    );
  }

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


function OnboardingInline() {
  // temporary UI (replace with real upload + bio form)
  return (
    <form className="space-y-3">
      <div>
        <label className="mr-4">Profile picture</label>
        <input type="file" name="avatar" accept="image/*" />
      </div>

      <div>
        <label className="mr-4">Bio</label>
        <textarea name="bio" maxLength={160} className="border w-full p-2" rows={4} />
      </div>

      <button type="button" className="border border-green-600 font-bold px-3 py-1">
        Save profile
      </button>
    </form>
  );
}