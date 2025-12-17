"use client";

import { useState } from "react";

export default function LoginForm({ action }) {
  const [show, setShow] = useState(false);

  return (
    <form action={action}>
      <div>
        <label htmlFor="email" className="mr-4 ">Email</label>
        <input id="email" name="email" type="email" required className="border"/>
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
        <button type="button" onClick={() => setShow((v) => !v)}>
          {show ? "Hide" : "Show"}
        </button>
      </div>

      <button type="submit" className="border border-blue-500 font-bold">Login</button>
    </form>
  );
}
