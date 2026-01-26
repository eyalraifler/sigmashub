import SignupForm from "./SignUpForm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function SignupPage() {
  async function handleSignup(prevState, formData) {
    "use server";

    const email = formData.get("email");
    const username = formData.get("username");
    const password = formData.get("password");

    if (!email || !username || !password) {
      return { ok: false, error: "Missing fields" };
    }

    // Check if user credentials are available
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

    // Return success with credentials to pass to onboarding step
    return { 
      ok: true, 
      credentials: { email, username, password }
    };
  }

  async function handleOnboarding(prevState, formData) {
    "use server";

    const email = formData.get("email");
    const username = formData.get("username");
    const password = formData.get("password");
    const bio = formData.get("bio") || "";
    const avatarData = formData.get("avatar_data") || "";

    if (!email || !username || !password) {
      return { ok: false, error: "Missing credentials" };
    }

    // Complete signup with profile data
    const res = await fetch("http://127.0.0.1:8000/api/signup/complete_signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        email, 
        username, 
        password,
        avatar_path: avatarData,
        bio
      }),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { ok: false, error: data.detail || "Profile setup failed" };
    }

    const token = data.token;
    const returnedUsername = data.user?.username;

    if (!token) return { ok: false, error: "No token returned" };

    // Set cookies after successful completion
    const cookieStore = await cookies();

    cookieStore.set("auth_token", token, {
      httpOnly: true,
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

    redirect("/app");
  }

  return (
    <main>
      <h1 className="text-4xl mb-3">Sign up</h1>
      <SignupForm 
        signupAction={handleSignup}
        onboardingAction={handleOnboarding}
      />
    </main>
  );
}