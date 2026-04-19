"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function handleSignup(prevState, formData) {
  const email = formData.get("email");
  const username = formData.get("username");
  const password = formData.get("password");

  if (!email || !username || !password) {
    return { ok: false, error: "Missing fields" };
  }

  const res = await fetch("http://127.0.0.1:8000/api/signup/check_user_available", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, username, password }),
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return { ok: false, error: data.detail || "Signup failed" };
  }

  return { 
    ok: true, 
    credentials: { email, username, password }
  };
}

export async function handleOnboarding(prevState, formData) {
  const email = formData.get("email");
  const username = formData.get("username");
  const password = formData.get("password");
  const bio = formData.get("bio") || "";
  const avatarData = formData.get("avatar_data") || "";

  let res, data;
  try {
    res = await fetch("http://127.0.0.1:8000/api/signup/complete_signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password, avatar_path: avatarData, bio }),
      cache: "no-store",
    });
    data = await res.json().catch(() => ({}));
  } catch {
    return { ok: false, error: "Could not reach the server. Please try again." };
  }

  if (!res.ok) return { ok: false, error: data.detail || "Profile setup failed" };

  const token = data.token;
  const returnedUsername = data.user?.username;
  if (!token) return { ok: false, error: "No token returned" };

  const cookieStore = await cookies();
  cookieStore.set("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  cookieStore.set("access_token", token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  cookieStore.set("username", returnedUsername || "", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  cookieStore.set("user_id", String(data.user?.id || ""), {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect("/app");
}