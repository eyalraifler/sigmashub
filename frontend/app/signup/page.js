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

    const res = await fetch("http://127.0.0.1:8000/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password }),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { ok: false, error: data.detail || "Signup failed" };
    }

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

    cookieStore.set("username", returnedUsername || "", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return { ok:true};
    //redirect("/app");
  }

  return (
    <main>
      <h1 className="text-4xl mb-3">Sign up</h1>
      <SignupForm action={handleSignup} />
    </main>
  );
}
