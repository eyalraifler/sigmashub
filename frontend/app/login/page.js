import LoginForm from "./LoginForm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function LoginPage() {
  async function handleLogin(prevState, formData) {
    "use server";
    const email = formData.get("email");
    const password = formData.get("password");

    if (!email || !password) {
      return { ok: false, error: "Missing email or password" };
    }

    const res = await fetch("http://127.0.0.1:8000/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { ok: false, error: data.detail || "Invalid email or password" };
    }

    // If verification is required, return success with flag
    if (data.requires_verification) {
      return {
        ok: true,
        requires_verification: true,
        message: data.message,
      };
    }

    // This shouldn't happen with new flow, but keeping for compatibility
    const token = data.token;
    if (!token) return { error: "No token returned" };

    const cookieStore = await cookies();
    const username = data.user?.username;

    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    cookieStore.set("username", username || "", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    redirect("/app");
  }

  async function handleVerify(prevState, formData) {
    "use server";
    const email = formData.get("email");
    const code = formData.get("code");

    if (!email || !code) {
      return { ok: false, error: "Missing email or verification code" };
    }

    const res = await fetch("http://127.0.0.1:8000/api/login/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { ok: false, error: data.detail || "Invalid verification code" };
    }

    const token = data.token;
    const username = data.user?.username;

    if (!token) return { error: "No token returned" };

    const cookieStore = await cookies();

    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    cookieStore.set("username", username || "", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    redirect("/app");
  }

  async function handleResend(prevState, formData) {
    "use server";
    const email = formData.get("email");

    if (!email) {
      return { ok: false, error: "Missing email" };
    }

    const res = await fetch("http://127.0.0.1:8000/api/login/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { ok: false, error: data.detail || "Failed to resend code" };
    }

    return { ok: true, message: data.message };
  }

  return (
    <main>
      <LoginForm 
        loginAction={handleLogin} 
        verifyAction={handleVerify}
        resendAction={handleResend}
      />
    </main>
  );
}